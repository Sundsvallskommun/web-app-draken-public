import { SUPPORTMANAGEMENT_NAMESPACE } from '@/config';
import { apiServiceName } from '@/config/api-config';
import type { JsonSchema } from '@/data-contracts/jsonschema/data-contracts';
import { Errand, Measure, MeasureType, MetadataResponse, Role } from '@/data-contracts/supportmanagement/data-contracts';
import { CreateSupportMeasureDto, DecideSupportMeasureDto, FollowUpSupportMeasureDto, UpdateSupportMeasureDto } from '@/dtos/support-measure.dto';
import { HttpException } from '@/exceptions/HttpException';
import { User } from '@/interfaces/users.interface';

import ApiService from './api.service';
import { isRecord } from './schema-bound-json.service';
import { assertSupportErrandWritable, getErrandVersion } from './support-errand.service';
import { SupportJsonParameterService } from './support-json-parameter.service';
import {
  followUpExecutionIsSaved,
  isPlannedApprovedMeasure,
  measureFollowUpDefinition,
  type MeasureFollowUpDocument,
  measureFollowUpSchemaName,
  readMeasureFollowUp,
  type SupportMeasure,
} from './support-measure-follow-up';
import {
  assertMeasureRegistration,
  assertMeasureTypeForRole,
  MeasureRegistrationPolicy,
  measureRoleDecides,
  resolveSupportMeasureRegistration,
} from './support-measure-registration';

export interface SupportMeasuresSnapshot {
  measures: SupportMeasure[];
  errandVersion: number;
  metadata: { measureTypes: MeasureType[]; roles: Role[] };
  creationRoles: Role[];
  registration: MeasureRegistrationPolicy;
}

function requireMeasureVersion(ifMatch: string | undefined): number {
  if (ifMatch === undefined) throw new HttpException(428, 'If-Match is required when updating a measure');
  const match = /^"(0|[1-9]\d*)"$/.exec(ifMatch);
  const version = match ? Number(match[1]) : Number.NaN;
  if (!Number.isSafeInteger(version)) throw new HttpException(400, 'If-Match must contain one strong numeric measure ETag');
  return version;
}

/** Measure details use the protected measure resource; follow-up answers have their own schema-bound document. */
export class SupportMeasureService {
  constructor(
    private readonly apiService = new ApiService(),
    private readonly registrationConfiguration = process.env.SUPPORT_MEASURE_REGISTRATION,
    private documents?: SupportJsonParameterService,
  ) {}

  private followUpDocuments(): SupportJsonParameterService {
    // Controllers are also constructed in application profiles without Support Management.
    return (this.documents ??= new SupportJsonParameterService({ namespace: SUPPORTMANAGEMENT_NAMESPACE ?? '', apiService: this.apiService }));
  }

  private baseUrl(municipalityId: string): string {
    return `${apiServiceName('supportmanagement')}/${municipalityId}/${SUPPORTMANAGEMENT_NAMESPACE}`;
  }

  private errandUrl(municipalityId: string, errandId: string): string {
    return `${this.baseUrl(municipalityId)}/errands/${encodeURIComponent(errandId)}`;
  }

  private async readCurrentWritableMeasure(url: string, measureId: string, user: User): Promise<Measure> {
    const current = await this.apiService.get<Errand>({ url, propagateClientError: true }, user);
    assertSupportErrandWritable(current.data, 'measure changes');
    const existing = (
      await this.apiService.get<Measure>({ url: `${url}/measures/${encodeURIComponent(measureId)}`, propagateClientError: true }, user)
    ).data;
    if (existing.version === undefined || !Number.isSafeInteger(existing.version) || existing.version < 0) {
      throw new HttpException(502, 'Support Management response is missing a valid measure version');
    }
    return existing;
  }

  private async readWritableMeasure(url: string, measureId: string, ifMatch: string | undefined, user: User): Promise<Measure> {
    const version = requireMeasureVersion(ifMatch);
    const existing = await this.readCurrentWritableMeasure(url, measureId, user);
    if (existing.version !== version) throw new HttpException(412, 'If-Match does not match the current measure version');
    return existing;
  }

  private async readFollowUp(municipalityId: string, errandId: string, measureId: string, user: User): Promise<MeasureFollowUpDocument | undefined> {
    const stored = await this.followUpDocuments().readOptionalJsonParameter({
      municipalityId,
      errandId,
      user,
      definition: measureFollowUpDefinition(measureId),
    });
    return stored ? readMeasureFollowUp(stored.document.value, measureId) : undefined;
  }

  async read(municipalityId: string, errandId: string, user: User): Promise<SupportMeasuresSnapshot> {
    const url = this.errandUrl(municipalityId, errandId);
    // Parent version is only used to synchronize the surrounding errand form after our own edit.
    // Each measure carries the version used for its own writes.
    const errand = await this.apiService.get<Errand>({ url, includeResponseHeaders: true, propagateClientError: true }, user);
    const result = await this.apiService.get<Measure[]>({ url: `${url}/measures`, propagateClientError: true }, user);
    const metadata = (
      await this.apiService.get<MetadataResponse>({ url: `${this.baseUrl(municipalityId)}/metadata`, propagateClientError: true }, user)
    ).data;
    const registration = resolveSupportMeasureRegistration(metadata, user.groups ?? [], this.registrationConfiguration);
    return {
      measures: await Promise.all(
        result.data.map(async (measure): Promise<SupportMeasure> => {
          if (!measure.id) return measure;
          const followUp = await this.readFollowUp(municipalityId, errandId, measure.id, user);
          return followUp
            ? {
                ...measure,
                followUp: {
                  status: followUpExecutionIsSaved(measure, followUp) ? 'completed' : measure.executed ? 'conflict' : 'pending',
                  desiredEffectAchieved: followUp.desiredEffectAchieved,
                  followUpDescription: followUp.followUpDescription,
                },
              }
            : measure;
        }),
      ),
      errandVersion: getErrandVersion(errand.data, errand.headers?.etag),
      metadata: { measureTypes: metadata.measureTypes ?? [], roles: metadata.roles ?? [] },
      ...registration,
    };
  }

  async create(municipalityId: string, errandId: string, data: CreateSupportMeasureDto, user: User): Promise<void> {
    const url = this.errandUrl(municipalityId, errandId);
    const current = await this.apiService.get<Errand>({ url, propagateClientError: true }, user);
    assertSupportErrandWritable(current.data, 'measure changes');

    const metadata = (
      await this.apiService.get<MetadataResponse>({ url: `${this.baseUrl(municipalityId)}/metadata`, propagateClientError: true }, user)
    ).data;
    const resolved = resolveSupportMeasureRegistration(metadata, user.groups ?? [], this.registrationConfiguration);
    assertMeasureRegistration(resolved, data.addedByRole, data.measureTypeId);
    assertMeasureDates(data);
    // Executed measures are facts, not proposals, so only a deciding role may report them.
    if (data.executed !== undefined && !measureRoleDecides(resolved.registration, data.addedByRole)) {
      throw new HttpException(400, 'Förslag kan bara registreras som planerade åtgärder. Genomförda åtgärder registreras av den beslutande rollen.');
    }
    if (!user.username?.trim()) throw new HttpException(401, 'En inloggad användare krävs för att registrera åtgärden.');

    // Attribution and the decision come from the session and Draken's role policy, never from the browser:
    // a deciding role's own measure is accepted at once, any other role registers a proposal.
    const decision: Pick<Measure, 'accept'> = measureRoleDecides(resolved.registration, data.addedByRole) ? { accept: 'TRUE' } : {};
    await this.apiService.post<void, CreateSupportMeasureDto & Pick<Measure, 'addedByUser' | 'accept'>>(
      {
        url: `${url}/measures`,
        data: { ...data, ...decision, addedByUser: user.username },
        followLocation: false,
        propagateClientError: true,
      },
      user,
    );
  }

  async update(
    municipalityId: string,
    errandId: string,
    measureId: string,
    ifMatch: string | undefined,
    data: UpdateSupportMeasureDto,
    user: User,
  ): Promise<void> {
    const url = this.errandUrl(municipalityId, errandId);
    const measureUrl = `${url}/measures/${encodeURIComponent(measureId)}`;
    const existing = await this.readWritableMeasure(url, measureId, ifMatch, user);
    assertOwnMeasure(existing, user);

    if (existing.accept && (['measureTypeId', 'description', 'goal'] as const).some(key => data[key] !== undefined && data[key] !== existing[key])) {
      throw new HttpException(409, 'Typ, beskrivning och mål är låsta efter beslut. Skapa ett nytt förslag om innehållet behöver ändras.');
    }

    const changesType = data.measureTypeId !== undefined && data.measureTypeId !== existing.measureTypeId;
    const reportsExecuted = data.executed !== undefined && !existing.executed;
    if (changesType && data.measureTypeId !== undefined) {
      const metadata = (
        await this.apiService.get<MetadataResponse>({ url: `${this.baseUrl(municipalityId)}/metadata`, propagateClientError: true }, user)
      ).data;
      // Membership may have changed since creation; type choices follow the saved registration role.
      const { registration } = resolveSupportMeasureRegistration(metadata, user.groups ?? [], this.registrationConfiguration);
      assertMeasureTypeForRole(registration, existing.addedByRole, data.measureTypeId);
    }
    if (reportsExecuted && existing.accept !== 'TRUE' && existing.accept !== 'REWORK') {
      throw new HttpException(400, 'Ett förslag kan inte markeras som genomfört förrän det har godkänts helt eller delvis.');
    }
    if (data.executed !== undefined && data.executed !== existing.executed) {
      const followUp = await this.readFollowUp(municipalityId, errandId, measureId, user);
      if (followUp && Date.parse(data.executed) !== Date.parse(followUp.executed)) {
        throw new HttpException(409, 'Genomförandet hör till en sparad uppföljning och kan inte ändras här.');
      }
    }
    assertMeasureDates(data, existing);

    // Recheck status after dependent reads. Unrelated errand edits do not invalidate this measure's ETag.
    const latest = await this.apiService.get<Errand>({ url, propagateClientError: true }, user);
    assertSupportErrandWritable(latest.data, 'measure changes');

    // Forward the caller's original version so upstream also catches changes after the checks above.
    await this.apiService.patch<Measure, UpdateSupportMeasureDto>(
      { url: measureUrl, data, headers: { 'If-Match': ifMatch }, followLocation: false, propagateClientError: true },
      user,
    );
  }

  async decide(
    municipalityId: string,
    errandId: string,
    measureId: string,
    ifMatch: string | undefined,
    data: DecideSupportMeasureDto,
    user: User,
  ): Promise<void> {
    const url = this.errandUrl(municipalityId, errandId);
    const existing = await this.readWritableMeasure(url, measureId, ifMatch, user);
    const metadata = (
      await this.apiService.get<MetadataResponse>({ url: `${this.baseUrl(municipalityId)}/metadata`, propagateClientError: true }, user)
    ).data;
    const resolved = resolveSupportMeasureRegistration(metadata, user.groups ?? [], this.registrationConfiguration);
    if (resolved.registration.status !== 'ready') throw new HttpException(503, 'Beslutsbehörigheten för åtgärder är inte tillgänglig.');
    if (!resolved.creationRoles.some(role => measureRoleDecides(resolved.registration, role.name))) {
      throw new HttpException(403, 'Du saknar behörighet att fatta beslut om åtgärdsförslag.');
    }
    if (!user.username?.trim()) throw new HttpException(401, 'En inloggad användare krävs för att fatta beslut.');
    if (existing.accept || existing.executed) throw new HttpException(409, 'Åtgärden är redan beslutad eller genomförd. Ladda om åtgärderna.');
    const motivation = data.acceptMotivation?.trim();
    if (data.accept !== 'TRUE' && !motivation) throw new HttpException(400, 'En kommentar krävs vid avslag eller delvis godkännande.');

    const latest = await this.apiService.get<Errand>({ url, propagateClientError: true }, user);
    assertSupportErrandWritable(latest.data, 'measure decisions');
    // Only decision fields: the proposal and its creator/role are never replaced by the decision maker.
    // This is independent of the deciding role's own selectable measure types.
    await this.apiService.patch<Measure, DecideSupportMeasureDto>(
      {
        url: `${url}/measures/${encodeURIComponent(measureId)}`,
        data: { accept: data.accept, acceptMotivation: motivation ?? '' },
        headers: { 'If-Match': ifMatch },
        followLocation: false,
        propagateClientError: true,
      },
      user,
    );
  }

  async followUp(
    municipalityId: string,
    errandId: string,
    measureId: string,
    ifMatch: string | undefined,
    data: FollowUpSupportMeasureDto,
    user: User,
  ): Promise<void> {
    const expectedVersion = requireMeasureVersion(ifMatch);
    const url = this.errandUrl(municipalityId, errandId);
    const existing = await this.readCurrentWritableMeasure(url, measureId, user);
    assertOwnMeasure(existing, user);
    if (!isPlannedApprovedMeasure(existing)) throw new HttpException(409, 'Endast planerade och godkända åtgärder kan följas upp.');
    const description = data.followUpDescription?.trim();
    if (typeof data.desiredEffectAchieved !== 'boolean' || !description || description.length > 4000) {
      throw new HttpException(400, 'Ange om åtgärden lett till önskad effekt och beskriv vad som har hänt (högst 4000 tecken).');
    }
    let document = await this.readFollowUp(municipalityId, errandId, measureId, user);
    const assertSameAnswers = (stored: MeasureFollowUpDocument) => {
      if (
        stored.desiredEffectAchieved !== data.desiredEffectAchieved ||
        stored.followUpDescription !== description ||
        stored.recordedBy.toLowerCase() !== user.username.toLowerCase()
      ) {
        throw new HttpException(409, 'Uppföljningssvar är redan sparade. Ladda om åtgärden för att läsa dem och vid behov slutföra genomförandet.');
      }
    };
    if (document) {
      assertSameAnswers(document);
      // A lost response after execution must not turn a successful save into an unrecoverable stale-version error.
      if (followUpExecutionIsSaved(existing, document)) return;
    }
    if (existing.version !== expectedVersion) throw new HttpException(412, 'If-Match does not match the current measure version');
    if (!document) {
      const schema = await this.apiService
        .get<JsonSchema>(
          {
            url: `${apiServiceName('jsonschema')}/${encodeURIComponent(municipalityId)}/schemas/${measureFollowUpSchemaName}/versions/latest`,
            propagateClientError: true,
          },
          user,
        )
        .catch((cause: unknown) => {
          if (isRecord(cause) && cause.status === 404)
            throw new HttpException(503, 'Schemat för åtgärdsuppföljning är inte publicerat. Kontakta administratören.');
          throw cause;
        });
      if (!schema.data.id || schema.data.name !== measureFollowUpSchemaName)
        throw new HttpException(502, 'Uppföljningsschemat kunde inte bekräftas.');
      const now = new Date().toISOString();
      const answers: MeasureFollowUpDocument = {
        measureId,
        measureVersion: expectedVersion,
        executed: existing.executed ?? now,
        desiredEffectAchieved: data.desiredEffectAchieved,
        followUpDescription: description,
        recordedBy: user.username,
        recordedAt: now,
      };
      try {
        const written = await this.followUpDocuments().writeJsonParameter({
          municipalityId,
          errandId,
          user,
          definition: measureFollowUpDefinition(measureId),
          data: { schemaId: schema.data.id, value: answers },
          preconditions: { ifNoneMatch: '*' },
        });
        document = readMeasureFollowUp(written.document.value, measureId);
      } catch (cause) {
        // Includes an accepted PUT whose response or parent readback was lost, and competing create-only writes.
        // Re-read once; never overwrite the reserved answers or execute without confirmed durable answers.
        document = await this.readFollowUp(municipalityId, errandId, measureId, user);
        if (!document) throw cause;
      }
      assertSameAnswers(document);
    }
    const current = await this.readCurrentWritableMeasure(url, measureId, user);
    assertOwnMeasure(current, user);
    if (!isPlannedApprovedMeasure(current)) throw new HttpException(409, 'Åtgärden kan inte längre följas upp. Svaren finns kvar.');
    if (followUpExecutionIsSaved(current, document)) return;
    if (current.executed) throw new HttpException(409, 'Genomförandedatumet avviker från uppföljningen. Svaren finns kvar.');
    if (current.version !== expectedVersion)
      throw new HttpException(412, 'Åtgärden har ändrats. Svaren finns kvar. Ladda om och slutför uppföljningen.');
    try {
      const saved = await this.apiService.patch<Measure, Pick<Measure, 'executed'>>(
        {
          url: `${url}/measures/${encodeURIComponent(measureId)}`,
          data: { executed: document.executed },
          headers: { 'If-Match': ifMatch },
          followLocation: false,
          propagateClientError: true,
        },
        user,
      );
      if (!followUpExecutionIsSaved(saved.data, document)) throw new HttpException(502, 'Genomförandet kunde inte bekräftas.');
    } catch (cause) {
      // The document is deliberately kept: the next read shows pending, and an explicit retry can finish it.
      if (isRecord(cause) && [409, 412].includes(Number(cause.status))) throw cause;
      throw new HttpException(503, 'Uppföljningssvaren är sparade, men genomförandet kunde inte bekräftas. Ladda om åtgärden och slutför sparandet.');
    }
  }
}

function assertMeasureDates(data: UpdateSupportMeasureDto, existing?: Measure): void {
  // An executed measure is a report of something that happened, so the date cannot lie ahead.
  if (data.executed && Date.parse(data.executed) > Date.now()) {
    throw new HttpException(400, 'Genomfört datum kan inte ligga i framtiden.');
  }
  const start = data.plannedStart ?? existing?.plannedStart;
  const complete = data.plannedComplete ?? existing?.plannedComplete;
  if (start && complete && Date.parse(complete) < Date.parse(start)) {
    throw new HttpException(400, 'Åtgärdens slutdatum får inte vara före startdatumet.');
  }
}

/** Only the person who registered a measure may change it; the session identity is the only source of "own". */
function assertOwnMeasure(existing: Pick<Measure, 'addedByUser'>, user: User): void {
  const owner = existing.addedByUser?.trim().toLowerCase();
  const editor = user.username?.trim().toLowerCase();
  if (!owner || !editor || owner !== editor) {
    throw new HttpException(403, 'Du kan bara redigera åtgärder som du själv har registrerat.');
  }
}
