import Ajv2020 from 'ajv/dist/2020';

import { apiServiceName } from '@/config/api-config';
import type { JsonSchema } from '@/data-contracts/jsonschema/data-contracts';
import type { Errand } from '@/data-contracts/supportmanagement/data-contracts';
import { HttpException } from '@/exceptions/HttpException';
import type { User } from '@/interfaces/users.interface';

import ApiService, { type ApiResponse } from './api.service';
import { assertSupportErrandWritable, getErrandVersion } from './support-errand.service';

export interface InvestigationJsonObject {
  readonly [property: string]: InvestigationJsonValue;
}

export type InvestigationJsonValue = null | boolean | number | string | readonly InvestigationJsonValue[] | InvestigationJsonObject;

/**
 * The application profile injects this definition. The document service never
 * needs to know which application, role or concrete investigation it belongs to.
 */
export interface SupportInvestigationDocumentDefinition<TKey extends string = string, TSchemaName extends string = string> {
  readonly key: TKey;
  readonly schemaName: TSchemaName;
}

export interface SupportInvestigationDocument<TKey extends string = string> {
  readonly key: TKey;
  readonly schemaId: string;
  readonly value: InvestigationJsonObject;
  readonly version?: number;
}

declare const strongVersionETagBrand: unique symbol;

/** A canonical, strong, numeric version ETag, for example `"7"`. */
export type StrongVersionETag = string & { readonly [strongVersionETagBrand]: true };

export interface InvestigationDocumentRequest<TKey extends string = string, TSchemaName extends string = string> {
  readonly definition: SupportInvestigationDocumentDefinition<TKey, TSchemaName>;
  readonly municipalityId: string;
  readonly errandId: string;
  readonly user: User;
}

export interface ReadInvestigationDocumentResult<TKey extends string = string> {
  readonly document: SupportInvestigationDocument<TKey>;
  readonly etag: StrongVersionETag;
  readonly status: 200;
}

/** Raw client preconditions. Invalid combinations are rejected before a write. */
export interface InvestigationDocumentWritePreconditions {
  readonly ifMatch?: string;
  readonly ifNoneMatch?: string;
  readonly parentErrandVersion?: string;
}

export interface WriteInvestigationDocumentRequest<
  TKey extends string = string,
  TSchemaName extends string = string,
> extends InvestigationDocumentRequest<TKey, TSchemaName> {
  readonly data: {
    readonly schemaId: string;
    readonly value: InvestigationJsonObject;
  };
  readonly preconditions: InvestigationDocumentWritePreconditions;
}

export interface WriteInvestigationDocumentResult<TKey extends string = string> {
  readonly document: SupportInvestigationDocument<TKey>;
  readonly etag: StrongVersionETag;
  readonly status: 200 | 201;
  /** Fresh optimistic-locking version read from the parent errand after the document write. */
  readonly parentErrandVersion: number;
}

type InvestigationApiService = Pick<ApiService, 'get' | 'put'>;

export interface SupportInvestigationDocumentServiceDependencies {
  readonly namespace: string;
  readonly apiService?: InvestigationApiService;
  readonly supportManagementService?: string;
  readonly jsonSchemaService?: string;
}

interface ParsedStrongVersionETag {
  readonly etag: StrongVersionETag;
  readonly version: number;
}

type ValidatedWritePrecondition =
  | { readonly mode: 'create'; readonly headers: Readonly<{ 'If-Match': typeof CREATE_ONLY_UPSTREAM_ETAG }> }
  | { readonly mode: 'update'; readonly headers: Readonly<{ 'If-Match': StrongVersionETag }> };

interface ValidatedDocumentResponse<TKey extends string, TStatus extends 200 | 201> {
  readonly document: SupportInvestigationDocument<TKey>;
  readonly etag: StrongVersionETag;
  readonly status: TStatus;
}

const STRONG_VERSION_ETAG_PATTERN = /^"(0|[1-9]\d*)"$/u;
const VERSION_HEADER_PATTERN = /^(0|[1-9]\d*)$/u;

/**
 * Support Management 14.14 exposes no If-None-Match parameter. Its upsert does,
 * however, validate If-Match only when the key exists and all persisted
 * versions are non-negative. The impossible -1 tag therefore gives the BFF an
 * atomic create-only condition at the upstream transaction boundary: an absent
 * key is created, while a key that appeared after our preflight fails with 412.
 */
const CREATE_ONLY_UPSTREAM_ETAG = '"-1"' as const;

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

const isInvestigationJsonValue = (value: unknown, ancestors: ReadonlySet<object> = new Set()): value is InvestigationJsonValue => {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value !== 'object') return false;
  if (ancestors.has(value)) return false;

  const nextAncestors = new Set(ancestors).add(value);
  if (Array.isArray(value)) return value.every(item => isInvestigationJsonValue(item, nextAncestors));
  return Object.values(value).every(item => isInvestigationJsonValue(item, nextAncestors));
};

const isInvestigationJsonObject = (value: unknown): value is InvestigationJsonObject => isRecord(value) && isInvestigationJsonValue(value);

// routing-controllers' HttpError constructor returns an HttpError instance, so
// subclasses such as HttpException do not retain a reliable instanceof identity.
const hasHttpStatus = (error: unknown, status: number): boolean => isRecord(error) && error.status === status;

const requireNonEmpty = (value: string, name: string): string => {
  const normalized = value.trim().replace(/^\/+|\/+$/gu, '');
  if (!normalized) throw new Error(`${name} must not be empty`);
  return normalized;
};

const readResponseHeader = (headers: unknown, name: string): unknown => {
  if (!isRecord(headers)) return undefined;

  const getter = (headers as { get?: (headerName: string) => unknown }).get;
  if (typeof getter === 'function') {
    const value = getter.call(headers, name);
    if (value !== undefined && value !== null) return value;
  }

  const matchingHeader = Object.entries(headers).find(([headerName]) => headerName.toLowerCase() === name.toLowerCase());
  return matchingHeader?.[1];
};

const parseStrongVersionETag = (value: unknown, invalidStatus: number, source: string): ParsedStrongVersionETag => {
  if (typeof value !== 'string') {
    throw new HttpException(invalidStatus, `${source} must contain one strong numeric ETag`);
  }

  const match = STRONG_VERSION_ETAG_PATTERN.exec(value);
  const version = match ? Number(match[1]) : Number.NaN;
  if (!match || !Number.isSafeInteger(version)) {
    throw new HttpException(invalidStatus, `${source} must contain one strong numeric ETag`);
  }

  return { etag: value as StrongVersionETag, version };
};

const requireResponseStatus = <TStatus extends number>(response: ApiResponse<unknown>, expected: TStatus, operation: string): TStatus => {
  if (response.status !== expected) {
    throw new HttpException(502, `Support Management returned unexpected status for ${operation}`);
  }
  return expected;
};

const requireDocumentResponse = <TKey extends string, TStatus extends 200 | 201>(
  definition: SupportInvestigationDocumentDefinition<TKey>,
  response: ApiResponse<unknown>,
  expectedStatus: TStatus,
  operation: string,
): ValidatedDocumentResponse<TKey, TStatus> => {
  requireResponseStatus(response, expectedStatus, operation);
  if (!isRecord(response.data)) {
    throw new HttpException(502, 'Support Management returned an invalid investigation document');
  }

  const { key, schemaId, value, version } = response.data;
  if (key !== definition.key || typeof schemaId !== 'string' || !schemaId.trim() || !isInvestigationJsonObject(value)) {
    throw new HttpException(502, 'Support Management returned an invalid investigation document');
  }
  if (version !== undefined && (typeof version !== 'number' || !Number.isSafeInteger(version) || version < 0)) {
    throw new HttpException(502, 'Support Management returned an invalid investigation document version');
  }

  const parsedETag = parseStrongVersionETag(readResponseHeader(response.headers, 'etag'), 502, 'Support Management response ETag');
  if (version !== undefined && version !== parsedETag.version) {
    throw new HttpException(502, 'Support Management returned inconsistent investigation document versions');
  }

  return {
    document: {
      key: definition.key,
      schemaId,
      value,
      ...(version !== undefined && { version }),
    },
    etag: parsedETag.etag,
    status: expectedStatus,
  };
};

const validateProvidedPreconditionSyntax = (preconditions: InvestigationDocumentWritePreconditions): void => {
  const { ifMatch, ifNoneMatch, parentErrandVersion } = preconditions;
  if (ifMatch !== undefined && ifNoneMatch !== undefined) {
    throw new HttpException(400, 'If-Match and If-None-Match must not be combined');
  }
  if (ifMatch !== undefined) {
    parseStrongVersionETag(ifMatch, 400, 'If-Match');
  }
  if (ifNoneMatch !== undefined && ifNoneMatch !== '*') {
    throw new HttpException(400, 'If-None-Match must be exactly *');
  }
  if (parentErrandVersion === undefined) {
    throw new HttpException(428, 'X-Errand-Version is required when writing an investigation document');
  }
  if (!VERSION_HEADER_PATTERN.test(parentErrandVersion) || !Number.isSafeInteger(Number(parentErrandVersion))) {
    throw new HttpException(400, 'X-Errand-Version must contain one canonical non-negative version');
  }
};

const resolveWritePrecondition = (
  existing: ReadInvestigationDocumentResult<string> | undefined,
  preconditions: InvestigationDocumentWritePreconditions,
): ValidatedWritePrecondition => {
  const { ifMatch, ifNoneMatch } = preconditions;

  if (existing) {
    if (ifNoneMatch !== undefined) {
      throw new HttpException(412, 'Investigation document already exists');
    }
    if (ifMatch === undefined) {
      throw new HttpException(428, 'If-Match is required when updating an investigation document');
    }

    const requested = parseStrongVersionETag(ifMatch, 400, 'If-Match');
    if (requested.etag !== existing.etag) {
      throw new HttpException(412, 'If-Match does not match the current investigation document version');
    }
    return { mode: 'update', headers: { 'If-Match': requested.etag } };
  }

  if (ifMatch !== undefined) {
    throw new HttpException(412, 'Investigation document does not exist');
  }
  if (ifNoneMatch === undefined) {
    throw new HttpException(428, 'If-None-Match: * is required when creating an investigation document');
  }

  return { mode: 'create', headers: { 'If-Match': CREATE_ONLY_UPSTREAM_ETAG } };
};

export class SupportInvestigationDocumentService {
  private readonly apiService: InvestigationApiService;
  private readonly namespace: string;
  private readonly supportManagementService: string;
  private readonly jsonSchemaService: string;

  constructor(dependencies: SupportInvestigationDocumentServiceDependencies) {
    this.apiService = dependencies.apiService ?? new ApiService();
    this.namespace = requireNonEmpty(dependencies.namespace, 'Support Management namespace');
    this.supportManagementService = requireNonEmpty(
      dependencies.supportManagementService ?? apiServiceName('supportmanagement'),
      'Support Management service',
    );
    this.jsonSchemaService = requireNonEmpty(dependencies.jsonSchemaService ?? apiServiceName('jsonschema'), 'JSON Schema service');
  }

  async readDocument<TKey extends string, TSchemaName extends string>(
    request: InvestigationDocumentRequest<TKey, TSchemaName>,
  ): Promise<ReadInvestigationDocumentResult<TKey>> {
    const result = await this.readRawDocument(request);
    await this.requireSchemaBinding(request, result.document.schemaId, 502);
    return result;
  }

  async writeDocument<TKey extends string, TSchemaName extends string>(
    request: WriteInvestigationDocumentRequest<TKey, TSchemaName>,
  ): Promise<WriteInvestigationDocumentResult<TKey>> {
    validateProvidedPreconditionSyntax(request.preconditions);
    const expectedParentErrandVersion = Number(request.preconditions.parentErrandVersion);
    await this.assertExpectedWritableParent(request, expectedParentErrandVersion, 'parent errand preflight');
    const existing = await this.preflightDocument(request);
    const precondition = resolveWritePrecondition(existing, request.preconditions);

    if (existing && existing.document.schemaId !== request.data.schemaId) {
      throw new HttpException(409, 'An investigation document schemaId cannot be changed after creation');
    }
    const schema = await this.requireSchemaBinding(request, request.data.schemaId, existing ? 502 : 400);
    this.assertDocumentMatchesSchema(schema, request.data.value);
    // Schema/document preflight can involve several upstream reads. Recheck the
    // parent immediately before the child write to keep the unavoidable
    // non-atomic parent-status race as narrow as the upstream contract allows.
    await this.assertExpectedWritableParent(request, expectedParentErrandVersion, 'parent errand write guard');

    const expectedStatus = precondition.mode === 'create' ? 201 : 200;
    const writeResponse = await this.apiService.put<SupportInvestigationDocument<TKey>, SupportInvestigationDocument<TKey>>(
      {
        url: this.documentUrl(request, request.definition.key),
        data: {
          key: request.definition.key,
          schemaId: request.data.schemaId,
          value: request.data.value,
        },
        headers: precondition.headers,
        followLocation: false,
        includeResponseHeaders: true,
        propagateClientError: true,
      },
      request.user,
    );
    const written = requireDocumentResponse(request.definition, writeResponse, expectedStatus, 'investigation document write');
    if (written.document.schemaId !== request.data.schemaId) {
      throw new HttpException(502, 'Support Management returned a different investigation document schemaId');
    }

    const parentErrandVersion = await this.readFreshParentErrandVersion(request);
    return { ...written, parentErrandVersion };
  }

  private async assertExpectedWritableParent<TKey extends string, TSchemaName extends string>(
    request: InvestigationDocumentRequest<TKey, TSchemaName>,
    expectedVersion: number,
    operation: string,
  ): Promise<void> {
    const parent = await this.readParentErrand(request, operation);
    const currentVersion = getErrandVersion(parent.data, readResponseHeader(parent.headers, 'etag'));
    if (currentVersion !== expectedVersion) {
      throw new HttpException(412, 'X-Errand-Version does not match the current parent errand version');
    }
    assertSupportErrandWritable(parent.data, 'investigation document changes');
  }

  private async preflightDocument<TKey extends string, TSchemaName extends string>(
    request: InvestigationDocumentRequest<TKey, TSchemaName>,
  ): Promise<ReadInvestigationDocumentResult<TKey> | undefined> {
    try {
      return await this.readRawDocument(request);
    } catch (error) {
      if (hasHttpStatus(error, 404)) return undefined;
      throw error;
    }
  }

  private async readRawDocument<TKey extends string, TSchemaName extends string>(
    request: InvestigationDocumentRequest<TKey, TSchemaName>,
  ): Promise<ReadInvestigationDocumentResult<TKey>> {
    const response = await this.apiService.get<SupportInvestigationDocument<TKey>>(
      {
        url: this.documentUrl(request, request.definition.key),
        followLocation: false,
        includeResponseHeaders: true,
        propagateClientError: true,
      },
      request.user,
    );
    return requireDocumentResponse(request.definition, response, 200, 'investigation document read');
  }

  private async requireSchemaBinding<TKey extends string, TSchemaName extends string>(
    request: InvestigationDocumentRequest<TKey, TSchemaName>,
    schemaId: string,
    mismatchStatus: number,
  ): Promise<JsonSchema> {
    const response = await this.apiService.get<JsonSchema>(
      {
        url: `${this.jsonSchemaService}/${encodeURIComponent(request.municipalityId)}/schemas/${encodeURIComponent(schemaId)}`,
        followLocation: false,
        includeResponseHeaders: true,
        propagateClientError: true,
      },
      request.user,
    );
    requireResponseStatus(response, 200, 'investigation schema read');
    if (!isRecord(response.data) || typeof response.data.name !== 'string') {
      throw new HttpException(502, 'JSON Schema returned invalid investigation schema metadata');
    }
    if (response.data.id !== undefined && response.data.id !== schemaId) {
      throw new HttpException(502, 'JSON Schema returned metadata for a different schemaId');
    }
    if (response.data.name !== request.definition.schemaName) {
      throw new HttpException(mismatchStatus, 'Investigation document schemaId does not match its configured schemaName');
    }
    return response.data;
  }

  /**
   * Validates the instance against the schema the binding check already fetched. The client-side
   * form validates the same schema, but the BFF is the trust boundary for these documents: without
   * this, a direct call persists a legally significant investigation with required fields absent.
   */
  private assertDocumentMatchesSchema(schema: JsonSchema, value: InvestigationJsonObject): void {
    if (!isRecord(schema.value)) {
      throw new HttpException(502, 'JSON Schema returned an investigation schema without a schema document');
    }

    let validate: ReturnType<Ajv2020['compile']>;
    try {
      validate = new Ajv2020({ allErrors: true, strict: false }).compile(schema.value);
    } catch {
      throw new HttpException(502, 'JSON Schema returned an investigation schema that could not be compiled');
    }

    if (!validate(value)) {
      const details = (validate.errors ?? []).map(error => `${error.instancePath || '/'} ${error.message ?? 'is invalid'}`).join('; ');
      throw new HttpException(400, `Investigation document does not match its JSON Schema: ${details}`);
    }
  }

  private async readFreshParentErrandVersion<TKey extends string, TSchemaName extends string>(
    request: InvestigationDocumentRequest<TKey, TSchemaName>,
  ): Promise<number> {
    const response = await this.readParentErrand(request, 'parent errand readback');
    return getErrandVersion(response.data, readResponseHeader(response.headers, 'etag'));
  }

  private async readParentErrand<TKey extends string, TSchemaName extends string>(
    request: InvestigationDocumentRequest<TKey, TSchemaName>,
    operation: string,
  ): Promise<ApiResponse<Errand>> {
    const response = await this.apiService.get<Errand>(
      {
        url: this.errandUrl(request),
        followLocation: false,
        includeResponseHeaders: true,
        propagateClientError: true,
      },
      request.user,
    );
    requireResponseStatus(response, 200, operation);
    if (!isRecord(response.data)) throw new HttpException(502, 'Support Management returned an invalid parent errand');
    return response;
  }

  private documentUrl<TKey extends string, TSchemaName extends string>(request: InvestigationDocumentRequest<TKey, TSchemaName>, key: TKey): string {
    return `${this.errandUrl(request)}/json-parameters/${encodeURIComponent(key)}`;
  }

  private errandUrl<TKey extends string, TSchemaName extends string>(request: InvestigationDocumentRequest<TKey, TSchemaName>): string {
    return `${this.supportManagementService}/${encodeURIComponent(request.municipalityId)}/${encodeURIComponent(this.namespace)}/errands/${encodeURIComponent(request.errandId)}`;
  }
}
