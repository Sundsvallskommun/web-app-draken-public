import { SUPPORTMANAGEMENT_NAMESPACE } from '@/config';
import { apiServiceName } from '@/config/api-config';
import { HandlerGroupRole, resolveHandlerGroupRoles } from '@/config/handler-group-roles';
import type { JsonSchema } from '@/data-contracts/jsonschema/data-contracts';
import { Errand, Measure, MeasureType, MetadataResponse, PageErrand, Role } from '@/data-contracts/supportmanagement/data-contracts';
import { CreateSupportMeasureDto, DecideSupportMeasureDto, FollowUpSupportMeasureDto, UpdateSupportMeasureDto } from '@/dtos/support-measure.dto';
import { HttpException } from '@/exceptions/HttpException';
import { User } from '@/interfaces/users.interface';

import ApiService from './api.service';
import { isRecord } from './schema-bound-json.service';
import { assertSupportErrandWritable, getErrandVersion } from './support-errand.service';
import { MEASURE_ACCESS_RESOURCE, SupportInvestigationAccessService } from './support-investigation-access.service';
import { SupportJsonParameterService } from './support-json-parameter.service';
import {
  findMeasureFollowUp,
  followUpExecutionIsSaved,
  isPlannedApprovedMeasure,
  measureFollowUpDefinition,
  type MeasureFollowUpEntry,
  measureFollowUpSchemaName,
  readMeasureFollowUps,
  type SupportMeasure,
} from './support-measure-follow-up';
import {
  assertMeasureRegistration,
  assertMeasureTypeForRole,
  MeasureRegistrationPolicy,
  measureRoleDecides,
  resolveSupportMeasureRegistration,
} from './support-measure-registration';
import { collectOpenPlannedMeasures, OPEN_PLANNED_MEASURES_FILTER, type PlannedSupportMeasure } from './support-planned-measures';

export interface SupportMeasuresSnapshot {
  measures: SupportMeasure[];
  errandVersion: number;
  metadata: { measureTypes: MeasureType[]; roles: Role[] };
  creationRoles: Role[];
  registration: MeasureRegistrationPolicy;
  /** Whether Support Management lets the user write the errand's measures. The list stays readable without it. */
  canWrite: boolean;
}

export interface PlannedSupportMeasuresSnapshot {
  measures: PlannedSupportMeasure[];
  metadata: { measureTypes: MeasureType[]; roles: Role[] };
  /** More errands matched than the read covers, so the list is incomplete. */
  truncated: boolean;
}

/** The errand's follow-up document as read: every measure's follow-up, and the ETag an append is conditioned on. */
interface StoredMeasureFollowUps {
  readonly entries: MeasureFollowUpEntry[];
  readonly etag: string;
  readonly schemaId: string;
}

// The errand list is paged per errand, not per measure. An overview of one person's planned work is small,
// so the pages are walked up to a cap that still keeps a runaway namespace from turning into a thousand reads.
const PLANNED_MEASURES_PAGE_SIZE = 100;
const PLANNED_MEASURES_MAX_PAGES = 10;

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
    private readonly handlerRoles: readonly HandlerGroupRole[] | undefined = resolveHandlerGroupRoles(),
    private documents?: SupportJsonParameterService,
    // Members of the superadmin group hold every measure registration role.
    private readonly superadminGroup: string | undefined = process.env.SUPERADMIN_GROUP,
    private access?: SupportInvestigationAccessService,
  ) {}

  private errandAccess(): SupportInvestigationAccessService {
    return (this.access ??= new SupportInvestigationAccessService({ apiService: this.apiService }));
  }

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
    const current = await this.apiService.get<Errand>({ url, propagateClientError: true, mapUnauthorizedToForbidden: true }, user);
    assertSupportErrandWritable(current.data, 'measure changes');
    const existing = (
      await this.apiService.get<Measure>(
        { url: `${url}/measures/${encodeURIComponent(measureId)}`, propagateClientError: true, mapUnauthorizedToForbidden: true },
        user,
      )
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

  /** The errand's follow-ups and the ETag an append is conditioned on, or undefined before the first follow-up. */
  private async readFollowUps(municipalityId: string, errandId: string, user: User): Promise<StoredMeasureFollowUps | undefined> {
    const stored = await this.followUpDocuments().readOptionalJsonParameter({
      municipalityId,
      errandId,
      user,
      definition: measureFollowUpDefinition,
    });
    return stored ? { entries: readMeasureFollowUps(stored.document.value), etag: stored.etag, schemaId: stored.document.schemaId } : undefined;
  }

  /** The latest published follow-up schema, which the errand's document is bound to when it is first created. */
  private async latestFollowUpSchemaId(municipalityId: string, user: User): Promise<string> {
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
    if (!schema.data.id || schema.data.name !== measureFollowUpSchemaName) throw new HttpException(502, 'Uppföljningsschemat kunde inte bekräftas.');
    return schema.data.id;
  }

  /**
   * Adds one measure's answers to the errand's follow-up document and returns the follow-up now saved for that
   * measure. The follow-ups already saved are carried over untouched, so answers are never rewritten.
   *
   * Every measure's follow-up shares the document, so another follow-up can land between reading it and
   * appending: that write moves the ETag and this append is refused, which is retried once on a fresh read.
   * Every failure is followed by a re-read, so an accepted write whose response was lost - or a competing save
   * of this same measure - is found saved rather than written again.
   */
  private async appendFollowUp(
    municipalityId: string,
    errandId: string,
    user: User,
    answers: MeasureFollowUpEntry,
    stored: StoredMeasureFollowUps | undefined,
  ): Promise<MeasureFollowUpEntry> {
    let current = stored;
    for (let attempt = 1; ; attempt++) {
      try {
        const schemaId = current?.schemaId ?? (await this.latestFollowUpSchemaId(municipalityId, user));
        const written = await this.followUpDocuments().writeJsonParameter({
          municipalityId,
          errandId,
          user,
          definition: measureFollowUpDefinition,
          data: { schemaId, value: { followUps: [...(current?.entries ?? []), answers] } },
          preconditions: current ? { ifMatch: current.etag } : { ifNoneMatch: '*' },
        });
        const saved = findMeasureFollowUp(readMeasureFollowUps(written.document.value), answers.measureId);
        if (saved) return saved;
        throw new HttpException(502, 'Uppföljningen kunde inte bekräftas.');
      } catch (cause) {
        current = await this.readFollowUps(municipalityId, errandId, user);
        const saved = findMeasureFollowUp(current?.entries, answers.measureId);
        if (saved) return saved;
        if (attempt >= 2 || !(isRecord(cause) && Number(cause.status) === 412)) throw cause;
      }
    }
  }

  async read(municipalityId: string, errandId: string, user: User): Promise<SupportMeasuresSnapshot> {
    const url = this.errandUrl(municipalityId, errandId);
    // Parent version is only used to synchronize the surrounding errand form after our own edit.
    // Each measure carries the version used for its own writes.
    const errand = await this.apiService.get<Errand>(
      { url, includeResponseHeaders: true, propagateClientError: true, mapUnauthorizedToForbidden: true },
      user,
    );
    const result = await this.apiService.get<Measure[]>(
      { url: `${url}/measures`, propagateClientError: true, mapUnauthorizedToForbidden: true },
      user,
    );
    const metadata = (
      await this.apiService.get<MetadataResponse>(
        { url: `${this.baseUrl(municipalityId)}/metadata`, propagateClientError: true, mapUnauthorizedToForbidden: true },
        user,
      )
    ).data;
    const registration = resolveSupportMeasureRegistration(metadata, user.groups ?? [], this.handlerRoles, this.superadminGroup);
    const followUps = await this.readFollowUps(municipalityId, errandId, user);
    // Whether measures can be added, edited and followed up is Support Management's call; the role catalogue only
    // says which role and types a writer registers with. A failed lookup offers no writes but keeps the list readable.
    const canWrite = await this.errandAccess()
      .getResourceLevel(user, municipalityId, errandId, MEASURE_ACCESS_RESOURCE)
      .then(
        level => level === 'RW',
        () => false,
      );
    return {
      measures: result.data.map((measure): SupportMeasure => {
        if (!measure.id) return measure;
        const followUp = findMeasureFollowUp(followUps?.entries, measure.id);
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
      errandVersion: getErrandVersion(errand.data, errand.headers?.etag),
      metadata: { measureTypes: metadata.measureTypes ?? [], roles: metadata.roles ?? [] },
      ...registration,
      canWrite,
    };
  }

  /**
   * Open planned measures on every errand the user reaches, for an overview outside the errand. Upstream applies
   * its access control to the list, so the result is exactly the errands the overview already shows this user.
   * Follow-up answers are not joined in: they are one read per errand, and an unexecuted measure is planned
   * whether or not its answers were saved.
   */
  async readPlanned(municipalityId: string, user: User): Promise<PlannedSupportMeasuresSnapshot> {
    const errands: Errand[] = [];
    let truncated = false;
    // Sorted by creation so paging stays stable while others write; a page walk over `touched` would skip
    // errands that were edited between two reads.
    for (let page = 0; ; page++) {
      if (page >= PLANNED_MEASURES_MAX_PAGES) {
        truncated = true;
        break;
      }
      const query = new URLSearchParams({
        filter: OPEN_PLANNED_MEASURES_FILTER,
        page: String(page),
        size: String(PLANNED_MEASURES_PAGE_SIZE),
        sort: 'created,asc',
      });
      const result = await this.apiService.get<PageErrand>(
        { url: `${this.baseUrl(municipalityId)}/errands?${query.toString()}`, propagateClientError: true, mapUnauthorizedToForbidden: true },
        user,
      );
      const content = result.data.content ?? [];
      errands.push(...content);
      if (content.length === 0 || result.data.last !== false) break;
    }
    const metadata = (
      await this.apiService.get<MetadataResponse>(
        { url: `${this.baseUrl(municipalityId)}/metadata`, propagateClientError: true, mapUnauthorizedToForbidden: true },
        user,
      )
    ).data;
    return {
      measures: collectOpenPlannedMeasures(errands),
      metadata: { measureTypes: metadata.measureTypes ?? [], roles: metadata.roles ?? [] },
      truncated,
    };
  }

  async create(municipalityId: string, errandId: string, data: CreateSupportMeasureDto, user: User): Promise<void> {
    const url = this.errandUrl(municipalityId, errandId);
    const current = await this.apiService.get<Errand>({ url, propagateClientError: true, mapUnauthorizedToForbidden: true }, user);
    assertSupportErrandWritable(current.data, 'measure changes');

    const metadata = (
      await this.apiService.get<MetadataResponse>(
        { url: `${this.baseUrl(municipalityId)}/metadata`, propagateClientError: true, mapUnauthorizedToForbidden: true },
        user,
      )
    ).data;
    const resolved = resolveSupportMeasureRegistration(metadata, user.groups ?? [], this.handlerRoles, this.superadminGroup);
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
        mapUnauthorizedToForbidden: true,
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
        await this.apiService.get<MetadataResponse>(
          { url: `${this.baseUrl(municipalityId)}/metadata`, propagateClientError: true, mapUnauthorizedToForbidden: true },
          user,
        )
      ).data;
      // Membership may have changed since creation; type choices follow the saved registration role.
      const { registration } = resolveSupportMeasureRegistration(metadata, user.groups ?? [], this.handlerRoles, this.superadminGroup);
      assertMeasureTypeForRole(registration, existing.addedByRole, data.measureTypeId);
    }
    if (reportsExecuted && existing.accept !== 'TRUE' && existing.accept !== 'REWORK') {
      throw new HttpException(400, 'Ett förslag kan inte markeras som genomfört förrän det har godkänts helt eller delvis.');
    }
    if (data.executed !== undefined && data.executed !== existing.executed) {
      const followUp = findMeasureFollowUp((await this.readFollowUps(municipalityId, errandId, user))?.entries, measureId);
      if (followUp && Date.parse(data.executed) !== Date.parse(followUp.executed)) {
        throw new HttpException(409, 'Genomförandet hör till en sparad uppföljning och kan inte ändras här.');
      }
    }
    assertMeasureDates(data, existing);

    // Recheck status after dependent reads. Unrelated errand edits do not invalidate this measure's ETag.
    const latest = await this.apiService.get<Errand>({ url, propagateClientError: true, mapUnauthorizedToForbidden: true }, user);
    assertSupportErrandWritable(latest.data, 'measure changes');

    // Forward the caller's original version so upstream also catches changes after the checks above.
    await this.apiService.patch<Measure, UpdateSupportMeasureDto>(
      {
        url: measureUrl,
        data,
        headers: { 'If-Match': ifMatch },
        followLocation: false,
        propagateClientError: true,
        mapUnauthorizedToForbidden: true,
      },
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
      await this.apiService.get<MetadataResponse>(
        { url: `${this.baseUrl(municipalityId)}/metadata`, propagateClientError: true, mapUnauthorizedToForbidden: true },
        user,
      )
    ).data;
    const resolved = resolveSupportMeasureRegistration(metadata, user.groups ?? [], this.handlerRoles, this.superadminGroup);
    if (resolved.registration.status !== 'ready') throw new HttpException(503, 'Beslutsbehörigheten för åtgärder är inte tillgänglig.');
    if (!resolved.creationRoles.some(role => measureRoleDecides(resolved.registration, role.name))) {
      throw new HttpException(403, 'Du saknar behörighet att fatta beslut om åtgärdsförslag.');
    }
    if (!user.username?.trim()) throw new HttpException(401, 'En inloggad användare krävs för att fatta beslut.');
    if (existing.accept || existing.executed) throw new HttpException(409, 'Åtgärden är redan beslutad eller genomförd. Ladda om åtgärderna.');
    const motivation = data.acceptMotivation?.trim();
    if (data.accept !== 'TRUE' && !motivation) throw new HttpException(400, 'En kommentar krävs vid avslag eller delvis godkännande.');

    const latest = await this.apiService.get<Errand>({ url, propagateClientError: true, mapUnauthorizedToForbidden: true }, user);
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
        mapUnauthorizedToForbidden: true,
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
    const stored = await this.readFollowUps(municipalityId, errandId, user);
    let entry = findMeasureFollowUp(stored?.entries, measureId);
    const assertSameAnswers = (saved: MeasureFollowUpEntry) => {
      if (
        saved.desiredEffectAchieved !== data.desiredEffectAchieved ||
        saved.followUpDescription !== description ||
        saved.recordedBy.toLowerCase() !== user.username.toLowerCase()
      ) {
        throw new HttpException(409, 'Uppföljningssvar är redan sparade. Ladda om åtgärden för att läsa dem och vid behov slutföra genomförandet.');
      }
    };
    if (entry) {
      assertSameAnswers(entry);
      // A lost response after execution must not turn a successful save into an unrecoverable stale-version error.
      if (followUpExecutionIsSaved(existing, entry)) return;
    }
    if (existing.version !== expectedVersion) throw new HttpException(412, 'If-Match does not match the current measure version');
    if (!entry) {
      const now = new Date().toISOString();
      entry = await this.appendFollowUp(
        municipalityId,
        errandId,
        user,
        {
          measureId,
          measureVersion: expectedVersion,
          executed: existing.executed ?? now,
          desiredEffectAchieved: data.desiredEffectAchieved,
          followUpDescription: description,
          recordedBy: user.username,
          recordedAt: now,
        },
        stored,
      );
      assertSameAnswers(entry);
    }
    const current = await this.readCurrentWritableMeasure(url, measureId, user);
    assertOwnMeasure(current, user);
    if (!isPlannedApprovedMeasure(current)) throw new HttpException(409, 'Åtgärden kan inte längre följas upp. Svaren finns kvar.');
    if (followUpExecutionIsSaved(current, entry)) return;
    if (current.executed) throw new HttpException(409, 'Genomförandedatumet avviker från uppföljningen. Svaren finns kvar.');
    if (current.version !== expectedVersion)
      throw new HttpException(412, 'Åtgärden har ändrats. Svaren finns kvar. Ladda om och slutför uppföljningen.');
    try {
      const saved = await this.apiService.patch<Measure, Pick<Measure, 'executed'>>(
        {
          url: `${url}/measures/${encodeURIComponent(measureId)}`,
          data: { executed: entry.executed },
          headers: { 'If-Match': ifMatch },
          followLocation: false,
          propagateClientError: true,
          mapUnauthorizedToForbidden: true,
        },
        user,
      );
      if (!followUpExecutionIsSaved(saved.data, entry)) throw new HttpException(502, 'Genomförandet kunde inte bekräftas.');
    } catch (cause) {
      // The document is deliberately kept: the next read shows pending, and an explicit retry can finish it.
      if (isRecord(cause) && [403, 409, 412].includes(Number(cause.status))) throw cause;
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
