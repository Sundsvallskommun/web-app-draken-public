import { SUPPORTMANAGEMENT_NAMESPACE } from '@/config';
import { apiServiceName } from '@/config/api-config';
import { SupportInvestigationDocumentAccess, SupportInvestigationErrandAccessDto } from '@/dtos/support-investigation-profile.dto';
import { HttpException } from '@/exceptions/HttpException';
import { User } from '@/interfaces/users.interface';

import ApiService from './api.service';

type AccessLevel = 'LR' | 'R' | 'RW';

interface JsonParameterAccess {
  readonly errandLevel: AccessLevel;
  readonly resourceLevel: AccessLevel | undefined;
  readonly field: { readonly allKeys: boolean; readonly keys: ReadonlyMap<string, AccessLevel> } | undefined;
}

const invalidAccess = (): never => {
  throw new HttpException(502, 'Support Management returned invalid errand access');
};

const record = (value: unknown): Record<string, unknown> => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return invalidAccess();
  return value as Record<string, unknown>;
};

const level = (value: unknown): AccessLevel => {
  if (value !== 'LR' && value !== 'R' && value !== 'RW') return invalidAccess();
  return value;
};

/** Reject ambiguous duplicate grants; the upstream resolver, never this adapter, merges roles. */
const indexedRecords = (value: unknown, identity: string): ReadonlyMap<string, Record<string, unknown>> => {
  if (!Array.isArray(value)) return invalidAccess();
  const entries = new Map<string, Record<string, unknown>>();
  for (const candidate of value) {
    const entry = record(candidate);
    const key = entry[identity];
    if (typeof key !== 'string' || !key.trim() || entries.has(key)) return invalidAccess();
    entries.set(key, entry);
  }
  return entries;
};

/**
 * The sprint /access contract names fields by payload property and resources by path.
 * Only jsonParameters is interpreted here: ordinary fields and other keyed collections have
 * their own write flows. Unrelated future fields/resources do not widen document access.
 */
const parseJsonParameterAccess = (value: unknown): JsonParameterAccess => {
  const response = record(value);
  const errandLevel = level(response.level);
  const fields = indexedRecords(response.fields, 'field');
  const resources = indexedRecords(response.resources, 'resource');
  const resource = resources.get('errand/json-parameter');
  const field = fields.get('jsonParameters');
  const resourceLevel = resource ? level(resource.level) : undefined;
  if (!field) return { errandLevel, resourceLevel, field: undefined };
  if (typeof field.allKeys !== 'boolean') return invalidAccess();
  const keys = new Map<string, AccessLevel>();
  for (const [key, grant] of indexedRecords(field.keys, 'key')) keys.set(key, level(grant.level));
  if (field.allKeys && keys.size > 0) return invalidAccess();
  return { errandLevel, resourceLevel, field: { allKeys: field.allKeys, keys } };
};

const documentAccess = (access: JsonParameterAccess, key: string): SupportInvestigationDocumentAccess => {
  if (!access.field || !access.resourceLevel) return 'hidden';
  // The errand level is the default for keys that carry no grant of their own, never a ceiling over
  // the ones that do: an explicit key refines it, the way a writable directory sits under a
  // read-only parent. A role may own one utredning without being allowed to handle the errand.
  const keyLevel = access.field.allKeys ? access.errandLevel : access.field.keys.get(key);
  if (!keyLevel) return 'hidden';
  // The key describes PATCH of the errand field; the dedicated document PUT must also be reachable.
  return access.resourceLevel === 'RW' && keyLevel === 'RW' ? 'edit' : 'read';
};

interface AccessServiceDependencies {
  readonly apiService?: Pick<ApiService, 'get'>;
  readonly namespace?: string;
  readonly service?: string;
}

/**
 * Projects Support Management's effective access to the investigation UI's three states.
 * No AD group interpretation or cache lives here. Every protected operation gets a fresh answer,
 * and the actual document endpoint remains authoritative if a grant changes after this read.
 */
export class SupportInvestigationAccessService {
  private readonly apiService: Pick<ApiService, 'get'>;
  private readonly namespace: string;
  private readonly service: string;

  constructor(dependencies: AccessServiceDependencies = {}) {
    this.apiService = dependencies.apiService ?? new ApiService();
    this.namespace = dependencies.namespace ?? SUPPORTMANAGEMENT_NAMESPACE ?? '';
    this.service = dependencies.service ?? apiServiceName('supportmanagement');
  }

  async getDocumentAccess(
    user: User,
    municipalityId: string,
    errandId: string,
    documentKeys: readonly string[],
  ): Promise<SupportInvestigationErrandAccessDto> {
    if (!this.namespace.trim() || !municipalityId.trim() || !errandId.trim()) {
      throw new HttpException(503, 'Investigation access context is unavailable');
    }
    let data: unknown;
    try {
      const response = await this.apiService.get<unknown>(
        {
          url: `${this.service}/${encodeURIComponent(municipalityId)}/${encodeURIComponent(this.namespace)}/errands/${encodeURIComponent(errandId)}/access`,
          timeout: 10_000,
          followLocation: false,
          includeResponseHeaders: true,
          propagateClientError: true,
          mapUnauthorizedToForbidden: true,
        },
        user,
      );
      if (response.status !== 200) return invalidAccess();
      data = response.data;
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'status' in error &&
        typeof error.status === 'number' &&
        [403, 404, 502].includes(error.status)
      )
        throw error;
      throw new HttpException(503, 'Investigation access is temporarily unavailable');
    }
    const access = parseJsonParameterAccess(data);
    return {
      municipalityId,
      errandId,
      documents: documentKeys.map(key => ({ key, access: documentAccess(access, key) })),
    };
  }

  async assertCanReadDocument(user: User, municipalityId: string, errandId: string, key: string): Promise<void> {
    const result = await this.getDocumentAccess(user, municipalityId, errandId, [key]);
    if (result.documents[0].access === 'hidden') throw new HttpException(403, 'Missing permissions for this investigation document');
  }

  async assertCanWriteDocument(user: User, municipalityId: string, errandId: string, key: string): Promise<void> {
    const result = await this.getDocumentAccess(user, municipalityId, errandId, [key]);
    if (result.documents[0].access !== 'edit') throw new HttpException(403, 'Missing write permissions for this investigation document');
  }
}
