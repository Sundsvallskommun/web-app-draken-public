import { apiServiceName } from '@/config/api-config';
import { trimSupportManagementPath } from '@/config/supportmanagement-path';
import type { JsonSchema } from '@/data-contracts/jsonschema/data-contracts';
import type { Errand } from '@/data-contracts/supportmanagement/data-contracts';
import { HttpException } from '@/exceptions/HttpException';
import type { User } from '@/interfaces/users.interface';

import ApiService, { type ApiResponse } from './api.service';
import {
  isJsonObject,
  isRecord,
  type JsonObject,
  requireResponseStatus,
  SchemaBoundJsonService,
  type SchemaBoundJsonServiceDependencies,
} from './schema-bound-json.service';
import { assertSupportErrandWritable, getErrandVersion } from './support-errand.service';

/**
 * The application profile injects this definition. The json-parameter service never
 * needs to know which application, role or concrete document it belongs to.
 */
export interface JsonParameterDefinition<TKey extends string = string, TSchemaName extends string = string> {
  readonly key: TKey;
  readonly schemaName: TSchemaName;
}

export interface SupportJsonParameter<TKey extends string = string> {
  readonly key: TKey;
  readonly schemaId: string;
  readonly value: JsonObject;
  readonly version?: number;
}

declare const strongVersionETagBrand: unique symbol;

/** A canonical, strong, numeric version ETag, for example `"7"`. */
export type StrongVersionETag = string & { readonly [strongVersionETagBrand]: true };

export interface JsonParameterRequest<TKey extends string = string, TSchemaName extends string = string> {
  readonly definition: JsonParameterDefinition<TKey, TSchemaName>;
  readonly municipalityId: string;
  readonly errandId: string;
  readonly user: User;
}

export interface VerifyReadableJsonParametersRequest {
  readonly definitions: readonly JsonParameterDefinition[];
  readonly municipalityId: string;
  readonly errandId: string;
  readonly user: User;
}

export interface VerifyReadableJsonParametersResult {
  readonly existingDocumentKeys: readonly string[];
}

export interface ReadJsonParameterResult<TKey extends string = string> {
  readonly document: SupportJsonParameter<TKey>;
  readonly etag: StrongVersionETag;
  readonly status: 200;
}

/** Raw client preconditions. Invalid combinations are rejected before a write. */
export interface JsonParameterWritePreconditions {
  readonly ifMatch?: string;
  readonly ifNoneMatch?: string;
  readonly parentErrandVersion?: string;
}

export interface WriteJsonParameterRequest<TKey extends string = string, TSchemaName extends string = string> extends JsonParameterRequest<
  TKey,
  TSchemaName
> {
  readonly data: {
    readonly schemaId: string;
    readonly value: JsonObject;
  };
  readonly preconditions: JsonParameterWritePreconditions;
}

export interface WriteJsonParameterResult<TKey extends string = string> {
  readonly document: SupportJsonParameter<TKey>;
  readonly etag: StrongVersionETag;
  readonly status: 200 | 201;
  /** Fresh optimistic-locking version read from the parent errand after the document write. */
  readonly parentErrandVersion: number;
}

type JsonParameterApiService = Pick<ApiService, 'get' | 'put'>;

export interface SupportJsonParameterServiceDependencies extends SchemaBoundJsonServiceDependencies {
  readonly namespace: string;
  readonly apiService?: JsonParameterApiService;
  readonly supportManagementService?: string;
  readonly schemaService?: SchemaBoundJsonService;
}

interface ParsedStrongVersionETag {
  readonly etag: StrongVersionETag;
  readonly version: number;
}

type ValidatedWritePrecondition =
  | { readonly mode: 'create'; readonly headers: Readonly<{ 'If-Match': typeof CREATE_ONLY_UPSTREAM_ETAG }> }
  | { readonly mode: 'update'; readonly headers: Readonly<{ 'If-Match': StrongVersionETag }> };

interface ValidatedDocumentResponse<TKey extends string, TStatus extends 200 | 201> {
  readonly document: SupportJsonParameter<TKey>;
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

// routing-controllers' HttpError constructor returns an HttpError instance, so
// subclasses such as HttpException do not retain a reliable instanceof identity.
const hasHttpStatus = (error: unknown, status: number): boolean => isRecord(error) && error.status === status;

const requireNonEmpty = (value: string, name: string): string => {
  const normalized = trimSupportManagementPath(value);
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

const requireDocumentResponse = <TKey extends string, TStatus extends 200 | 201>(
  definition: JsonParameterDefinition<TKey>,
  response: ApiResponse<unknown>,
  expectedStatus: TStatus,
  operation: string,
): ValidatedDocumentResponse<TKey, TStatus> => {
  requireResponseStatus(response, expectedStatus, operation);
  if (!isRecord(response.data)) {
    throw new HttpException(502, 'Support Management returned an invalid JSON parameter');
  }

  const { key, schemaId, value, version } = response.data;
  if (key !== definition.key || typeof schemaId !== 'string' || !schemaId.trim() || !isJsonObject(value)) {
    throw new HttpException(502, 'Support Management returned an invalid JSON parameter');
  }
  if (version !== undefined && (typeof version !== 'number' || !Number.isSafeInteger(version) || version < 0)) {
    throw new HttpException(502, 'Support Management returned an invalid JSON parameter version');
  }

  const parsedETag = parseStrongVersionETag(readResponseHeader(response.headers, 'etag'), 502, 'Support Management response ETag');
  if (version !== undefined && version !== parsedETag.version) {
    throw new HttpException(502, 'Support Management returned inconsistent JSON parameter versions');
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

const validateProvidedPreconditionSyntax = (preconditions: JsonParameterWritePreconditions): void => {
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
    throw new HttpException(428, 'X-Errand-Version is required when writing a JSON parameter');
  }
  if (!VERSION_HEADER_PATTERN.test(parentErrandVersion) || !Number.isSafeInteger(Number(parentErrandVersion))) {
    throw new HttpException(400, 'X-Errand-Version must contain one canonical non-negative version');
  }
};

const resolveWritePrecondition = (
  existing: ReadJsonParameterResult<string> | undefined,
  preconditions: JsonParameterWritePreconditions,
): ValidatedWritePrecondition => {
  const { ifMatch, ifNoneMatch } = preconditions;

  if (existing) {
    if (ifNoneMatch !== undefined) {
      throw new HttpException(412, 'JSON parameter already exists');
    }
    if (ifMatch === undefined) {
      throw new HttpException(428, 'If-Match is required when updating a JSON parameter');
    }

    const requested = parseStrongVersionETag(ifMatch, 400, 'If-Match');
    if (requested.etag !== existing.etag) {
      throw new HttpException(412, 'If-Match does not match the current JSON parameter version');
    }
    return { mode: 'update', headers: { 'If-Match': requested.etag } };
  }

  if (ifMatch !== undefined) {
    throw new HttpException(412, 'JSON parameter does not exist');
  }
  if (ifNoneMatch === undefined) {
    throw new HttpException(428, 'If-None-Match: * is required when creating a JSON parameter');
  }

  return { mode: 'create', headers: { 'If-Match': CREATE_ONLY_UPSTREAM_ETAG } };
};

export class SupportJsonParameterService {
  private readonly apiService: JsonParameterApiService;
  private readonly schemaService: SchemaBoundJsonService;
  private readonly namespace: string;
  private readonly supportManagementService: string;

  constructor(dependencies: SupportJsonParameterServiceDependencies) {
    this.apiService = dependencies.apiService ?? new ApiService();
    this.schemaService =
      dependencies.schemaService ??
      new SchemaBoundJsonService({
        apiService: dependencies.apiService,
        jsonSchemaService: dependencies.jsonSchemaService,
      });
    this.namespace = requireNonEmpty(dependencies.namespace, 'Support Management namespace');
    this.supportManagementService = requireNonEmpty(
      dependencies.supportManagementService ?? apiServiceName('supportmanagement'),
      'Support Management service',
    );
  }

  async readJsonParameter<TKey extends string, TSchemaName extends string>(
    request: JsonParameterRequest<TKey, TSchemaName>,
  ): Promise<ReadJsonParameterResult<TKey>> {
    const result = await this.readRawDocument(request);
    await this.requireSchemaBinding(request, result.document.schemaId, 502);
    return result;
  }

  async verifyReadableDocuments(request: VerifyReadableJsonParametersRequest): Promise<VerifyReadableJsonParametersResult> {
    const keys = await Promise.all(
      request.definitions.map(async definition => {
        try {
          await this.readRawDocument({ ...request, definition });
          return definition.key;
        } catch (error) {
          if (hasHttpStatus(error, 404)) return undefined;
          throw error;
        }
      }),
    );

    return { existingDocumentKeys: keys.filter((key): key is string => key !== undefined) };
  }

  async writeJsonParameter<TKey extends string, TSchemaName extends string>(
    request: WriteJsonParameterRequest<TKey, TSchemaName>,
  ): Promise<WriteJsonParameterResult<TKey>> {
    validateProvidedPreconditionSyntax(request.preconditions);
    const expectedParentErrandVersion = Number(request.preconditions.parentErrandVersion);
    await this.assertExpectedWritableParent(request, expectedParentErrandVersion, 'parent errand preflight');
    const existing = await this.preflightDocument(request);
    const precondition = resolveWritePrecondition(existing, request.preconditions);

    if (existing && existing.document.schemaId !== request.data.schemaId) {
      throw new HttpException(409, 'A JSON parameter schemaId cannot be changed after creation');
    }
    const schema = await this.requireSchemaBinding(request, request.data.schemaId, existing ? 502 : 400);
    this.schemaService.assertValueMatchesSchema(schema, request.data.value);
    // Schema/document preflight can involve several upstream reads. Recheck the
    // parent immediately before the child write to keep the unavoidable
    // non-atomic parent-status race as narrow as the upstream contract allows.
    await this.assertExpectedWritableParent(request, expectedParentErrandVersion, 'parent errand write guard');

    const expectedStatus = precondition.mode === 'create' ? 201 : 200;
    const writeResponse = await this.apiService.put<SupportJsonParameter<TKey>, SupportJsonParameter<TKey>>(
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
    const written = requireDocumentResponse(request.definition, writeResponse, expectedStatus, 'JSON parameter write');
    if (written.document.schemaId !== request.data.schemaId) {
      throw new HttpException(502, 'Support Management returned a different JSON parameter schemaId');
    }

    const parentErrandVersion = await this.readFreshParentErrandVersion(request);
    return { ...written, parentErrandVersion };
  }

  private async assertExpectedWritableParent<TKey extends string, TSchemaName extends string>(
    request: JsonParameterRequest<TKey, TSchemaName>,
    expectedVersion: number,
    operation: string,
  ): Promise<void> {
    const parent = await this.readParentErrand(request, operation);
    const currentVersion = getErrandVersion(parent.data, readResponseHeader(parent.headers, 'etag'));
    if (currentVersion !== expectedVersion) {
      throw new HttpException(412, 'X-Errand-Version does not match the current parent errand version');
    }
    assertSupportErrandWritable(parent.data, 'JSON parameter changes');
  }

  private async preflightDocument<TKey extends string, TSchemaName extends string>(
    request: JsonParameterRequest<TKey, TSchemaName>,
  ): Promise<ReadJsonParameterResult<TKey> | undefined> {
    try {
      return await this.readRawDocument(request);
    } catch (error) {
      if (hasHttpStatus(error, 404)) return undefined;
      throw error;
    }
  }

  private async readRawDocument<TKey extends string, TSchemaName extends string>(
    request: JsonParameterRequest<TKey, TSchemaName>,
  ): Promise<ReadJsonParameterResult<TKey>> {
    const response = await this.apiService.get<SupportJsonParameter<TKey>>(
      {
        url: this.documentUrl(request, request.definition.key),
        followLocation: false,
        includeResponseHeaders: true,
        propagateClientError: true,
      },
      request.user,
    );
    return requireDocumentResponse(request.definition, response, 200, 'JSON parameter read');
  }

  private requireSchemaBinding<TKey extends string, TSchemaName extends string>(
    request: JsonParameterRequest<TKey, TSchemaName>,
    schemaId: string,
    mismatchStatus: number,
  ): Promise<JsonSchema> {
    return this.schemaService.requireSchema({
      municipalityId: request.municipalityId,
      schemaId,
      expectedSchemaName: request.definition.schemaName,
      mismatchStatus,
      user: request.user,
    });
  }

  private async readFreshParentErrandVersion<TKey extends string, TSchemaName extends string>(
    request: JsonParameterRequest<TKey, TSchemaName>,
  ): Promise<number> {
    const response = await this.readParentErrand(request, 'parent errand readback');
    return getErrandVersion(response.data, readResponseHeader(response.headers, 'etag'));
  }

  private async readParentErrand<TKey extends string, TSchemaName extends string>(
    request: JsonParameterRequest<TKey, TSchemaName>,
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

  private documentUrl<TKey extends string, TSchemaName extends string>(request: JsonParameterRequest<TKey, TSchemaName>, key: TKey): string {
    return `${this.errandUrl(request)}/json-parameters/${encodeURIComponent(key)}`;
  }

  private errandUrl<TKey extends string, TSchemaName extends string>(request: JsonParameterRequest<TKey, TSchemaName>): string {
    return `${this.supportManagementService}/${encodeURIComponent(request.municipalityId)}/${encodeURIComponent(this.namespace)}/errands/${encodeURIComponent(request.errandId)}`;
  }
}
