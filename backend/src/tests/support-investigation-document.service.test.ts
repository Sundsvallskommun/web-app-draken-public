import { HttpException } from '@/exceptions/HttpException';
import type { User } from '@/interfaces/users.interface';
import ApiService, { type ApiRequestConfig, type ApiResponse } from '@/services/api.service';
import {
  type InvestigationDocumentWritePreconditions,
  type InvestigationJsonObject,
  SupportInvestigationDocumentService,
} from '@/services/support-investigation-document.service';

import { mockUser } from './helpers/http';

const SUPPORT_MANAGEMENT_SERVICE = 'supportmanagement-sprint/14.14';
const JSON_SCHEMA_SERVICE = 'jsonschema/1.0';
const MUNICIPALITY_ID = '2281';
const NAMESPACE = 'MY_NAMESPACE';
const ERRAND_ID = 'errand/with spaces';
const SCHEMA_ID = '2281_custom-schema_1.0';
const DEFINITION = { key: 'custom-document', schemaName: 'custom-schema' } as const;
const USER = mockUser({ username: 'writer' });
const DOCUMENT_URL = `${SUPPORT_MANAGEMENT_SERVICE}/${MUNICIPALITY_ID}/${NAMESPACE}/errands/errand%2Fwith%20spaces/json-parameters/custom-document`;
const ERRAND_URL = `${SUPPORT_MANAGEMENT_SERVICE}/${MUNICIPALITY_ID}/${NAMESPACE}/errands/errand%2Fwith%20spaces`;
const SCHEMA_URL = `${JSON_SCHEMA_SERVICE}/${MUNICIPALITY_ID}/schemas/${SCHEMA_ID}`;

type QueuedResponse = ApiResponse<unknown> | Error;

class FakeApiService extends ApiService {
  readonly getCalls: ApiRequestConfig<unknown>[] = [];
  readonly getUsers: User[] = [];
  readonly putCalls: ApiRequestConfig<unknown>[] = [];
  readonly putUsers: User[] = [];
  private readonly getQueue: QueuedResponse[];
  private readonly putQueue: QueuedResponse[];

  constructor(getQueue: readonly QueuedResponse[], putQueue: readonly QueuedResponse[] = []) {
    super();
    this.getQueue = [...getQueue];
    this.putQueue = [...putQueue];
  }

  override async get<T>(config: ApiRequestConfig, user: User): Promise<ApiResponse<T>> {
    this.getCalls.push(config as ApiRequestConfig<unknown>);
    this.getUsers.push(user);
    return this.next<T>(this.getQueue, 'GET');
  }

  override async put<T, D>(config: ApiRequestConfig<D>, user: User): Promise<ApiResponse<T>> {
    this.putCalls.push(config as ApiRequestConfig<unknown>);
    this.putUsers.push(user);
    return this.next<T>(this.putQueue, 'PUT');
  }

  private next<T>(queue: QueuedResponse[], method: string): ApiResponse<T> {
    const response = queue.shift();
    if (!response) throw new Error(`Unexpected ${method} call`);
    if (response instanceof Error) throw response;
    return response as ApiResponse<T>;
  }
}

const response = <T>(data: T, status: number, etag?: string): ApiResponse<T> => ({
  data,
  message: 'success',
  status,
  ...(etag !== undefined && { headers: { etag } }),
});

const document = (version: number, schemaId = SCHEMA_ID) => ({
  key: DEFINITION.key,
  schemaId,
  value: { assessment: `version-${version}` },
  version,
});

const schema = (name: string = DEFINITION.schemaName, id = SCHEMA_ID, value: object = { type: 'object' }) => ({
  id,
  name,
  version: '1.0',
  value,
});
const parentErrand = (version: number) => ({ id: ERRAND_ID, version });
const writableParentResponse = (version: number = 10) => response(parentErrand(version), 200, `"${version}"`);

const makeSubject = (getQueue: readonly QueuedResponse[], putQueue: readonly QueuedResponse[] = []) => {
  const api = new FakeApiService(getQueue, putQueue);
  const service = new SupportInvestigationDocumentService({
    apiService: api,
    namespace: NAMESPACE,
    supportManagementService: SUPPORT_MANAGEMENT_SERVICE,
    jsonSchemaService: JSON_SCHEMA_SERVICE,
  });
  return { api, service };
};

const request = {
  definition: DEFINITION,
  municipalityId: MUNICIPALITY_ID,
  errandId: ERRAND_ID,
  user: USER,
};

const writeRequest = (
  preconditions: InvestigationDocumentWritePreconditions,
  schemaId = SCHEMA_ID,
  value: InvestigationJsonObject = { assessment: 'saved' },
) => ({
  ...request,
  data: { schemaId, value },
  preconditions: { parentErrandVersion: '10', ...preconditions },
});

describe('SupportInvestigationDocumentService', () => {
  it('reads a document only after binding the injected schemaName to schema metadata', async () => {
    const { api, service } = makeSubject([response(document(7), 200, '"7"'), response(schema(), 200)]);

    await expect(service.readDocument(request)).resolves.toEqual({
      document: document(7),
      etag: '"7"',
      status: 200,
    });

    expect(api.getCalls).toHaveLength(2);
    expect(api.getCalls[0]).toMatchObject({
      url: DOCUMENT_URL,
      followLocation: false,
      includeResponseHeaders: true,
      propagateClientError: true,
    });
    expect(api.getCalls[1]).toMatchObject({
      url: SCHEMA_URL,
      followLocation: false,
      includeResponseHeaders: true,
      propagateClientError: true,
    });
    expect(api.getUsers).toEqual([USER, USER]);
  });

  it('updates with the exact preflight ETag and returns the upstream status, ETag and fresh parent version', async () => {
    const { api, service } = makeSubject(
      [
        writableParentResponse(11),
        response(document(7), 200, '"7"'),
        response(schema(), 200),
        writableParentResponse(11),
        writableParentResponse(12),
      ],
      [response(document(8), 200, '"8"')],
    );

    await expect(service.writeDocument(writeRequest({ ifMatch: '"7"', parentErrandVersion: '11' }))).resolves.toEqual({
      document: document(8),
      etag: '"8"',
      status: 200,
      parentErrandVersion: 12,
    });

    expect(api.getCalls.map(call => call.url)).toEqual([ERRAND_URL, DOCUMENT_URL, SCHEMA_URL, ERRAND_URL, ERRAND_URL]);
    expect(api.putCalls).toHaveLength(1);
    expect(api.putCalls[0]).toMatchObject({
      url: DOCUMENT_URL,
      data: { key: DEFINITION.key, schemaId: SCHEMA_ID, value: { assessment: 'saved' } },
      headers: { 'If-Match': '"7"' },
      followLocation: false,
      includeResponseHeaders: true,
      propagateClientError: true,
    });
    expect(api.putUsers).toEqual([USER]);
  });

  it('translates the client create-only condition to an impossible upstream If-Match and keeps 201 and ETag', async () => {
    const { api, service } = makeSubject(
      [writableParentResponse(3), new HttpException(404, 'Not found'), response(schema(), 200), writableParentResponse(3), writableParentResponse(4)],
      [response(document(0), 201, '"0"')],
    );

    await expect(service.writeDocument(writeRequest({ ifNoneMatch: '*', parentErrandVersion: '3' }))).resolves.toEqual({
      document: document(0),
      etag: '"0"',
      status: 201,
      parentErrandVersion: 4,
    });

    expect(api.putCalls).toHaveLength(1);
    expect(api.putCalls[0]).toMatchObject({
      url: DOCUMENT_URL,
      headers: { 'If-Match': '"-1"' },
      followLocation: false,
      includeResponseHeaders: true,
      propagateClientError: true,
    });
  });

  it.each([
    { name: 'a missing parent version', preconditions: { ifMatch: '"7"', parentErrandVersion: undefined }, status: 428, getCalls: 0 },
    { name: 'a malformed parent version', preconditions: { ifMatch: '"7"', parentErrandVersion: '01' }, status: 400, getCalls: 0 },
    { name: 'a stale parent version', preconditions: { ifMatch: '"7"', parentErrandVersion: '9' }, status: 412, getCalls: 1 },
    { name: 'a missing precondition', preconditions: {}, status: 428, getCalls: 2 },
    { name: 'a wildcard If-Match', preconditions: { ifMatch: '*' }, status: 400, getCalls: 0 },
    { name: 'a weak If-Match', preconditions: { ifMatch: 'W/"7"' }, status: 400, getCalls: 0 },
    { name: 'a non-canonical If-Match', preconditions: { ifMatch: '"07"' }, status: 400, getCalls: 0 },
    { name: 'an ETag list', preconditions: { ifMatch: '"7", "8"' }, status: 400, getCalls: 0 },
    { name: 'both conditional headers', preconditions: { ifMatch: '"7"', ifNoneMatch: '*' }, status: 400, getCalls: 0 },
    { name: 'a stale If-Match', preconditions: { ifMatch: '"6"' }, status: 412, getCalls: 2 },
    { name: 'If-None-Match for an existing resource', preconditions: { ifNoneMatch: '*' }, status: 412, getCalls: 2 },
  ])('rejects update with $name before PUT', async ({ preconditions, status, getCalls }) => {
    const { api, service } = makeSubject([writableParentResponse(), response(document(7), 200, '"7"')]);

    await expect(service.writeDocument(writeRequest(preconditions))).rejects.toMatchObject({ status });

    expect(api.getCalls).toHaveLength(getCalls);
    expect(api.putCalls).toHaveLength(0);
  });

  it.each([
    { name: 'a missing precondition', preconditions: {}, status: 428, getCalls: 2 },
    { name: 'If-Match for an absent resource', preconditions: { ifMatch: '"0"' }, status: 412, getCalls: 2 },
    { name: 'a quoted If-None-Match', preconditions: { ifNoneMatch: '"*"' }, status: 400, getCalls: 0 },
    { name: 'a weak If-None-Match', preconditions: { ifNoneMatch: 'W/"0"' }, status: 400, getCalls: 0 },
  ])('rejects create with $name before PUT', async ({ preconditions, status, getCalls }) => {
    const { api, service } = makeSubject([writableParentResponse(), new HttpException(404, 'Not found')]);

    await expect(service.writeDocument(writeRequest(preconditions))).rejects.toMatchObject({ status });

    expect(api.getCalls).toHaveLength(getCalls);
    expect(api.putCalls).toHaveLength(0);
  });

  it('freezes schemaId after creation before reading schema metadata or writing', async () => {
    const changedSchemaId = '2281_custom-schema_2.0';
    const { api, service } = makeSubject([writableParentResponse(), response(document(7), 200, '"7"')]);

    await expect(service.writeDocument(writeRequest({ ifMatch: '"7"' }, changedSchemaId))).rejects.toMatchObject({
      status: 409,
      message: 'An investigation document schemaId cannot be changed after creation',
    });

    expect(api.getCalls).toHaveLength(2);
    expect(api.putCalls).toHaveLength(0);
  });

  it.each(['SOLVED', 'SUSPENDED', 'ASSIGNED', 'REOPENED'])('rejects writes when the parent errand status is %s', async status => {
    const { api, service } = makeSubject([response({ ...parentErrand(10), status }, 200, '"10"')]);

    await expect(service.writeDocument(writeRequest({ ifMatch: '"7"' }))).rejects.toMatchObject({
      status: 409,
      message: 'Support errand status does not allow investigation document changes',
    });

    expect(api.getCalls.map(call => call.url)).toEqual([ERRAND_URL]);
    expect(api.putCalls).toHaveLength(0);
  });

  it('rejects a create when schema metadata does not match the injected schemaName', async () => {
    const { api, service } = makeSubject([writableParentResponse(), new HttpException(404, 'Not found'), response(schema('another-schema'), 200)]);

    await expect(service.writeDocument(writeRequest({ ifNoneMatch: '*' }))).rejects.toMatchObject({
      status: 400,
      message: 'Investigation document schemaId does not match its configured schemaName',
    });

    expect(api.getCalls.map(call => call.url)).toEqual([ERRAND_URL, DOCUMENT_URL, SCHEMA_URL]);
    expect(api.putCalls).toHaveLength(0);
  });

  it('rejects a document that omits fields required by its bound JSON Schema', async () => {
    const requiredSchema = schema(DEFINITION.schemaName, SCHEMA_ID, {
      type: 'object',
      required: ['decision'],
      properties: { decision: { type: 'string' } },
    });
    const { api, service } = makeSubject([writableParentResponse(), new HttpException(404, 'Not found'), response(requiredSchema, 200)]);

    await expect(service.writeDocument(writeRequest({ ifNoneMatch: '*' }))).rejects.toMatchObject({
      status: 400,
      message: expect.stringContaining("must have required property 'decision'"),
    });

    expect(api.putCalls).toHaveLength(0);
  });

  it('enforces standard date formats at the backend trust boundary', async () => {
    const dateSchema = schema(DEFINITION.schemaName, SCHEMA_ID, {
      type: 'object',
      required: ['decisionDate'],
      properties: { decisionDate: { type: 'string', format: 'date' } },
    });
    const { api, service } = makeSubject([writableParentResponse(), new HttpException(404, 'Not found'), response(dateSchema, 200)]);

    await expect(service.writeDocument(writeRequest({ ifNoneMatch: '*' }, SCHEMA_ID, { decisionDate: 'not-a-date' }))).rejects.toMatchObject({
      status: 400,
      message: expect.stringContaining('must match format "date"'),
    });

    expect(api.putCalls).toHaveLength(0);
  });

  it('treats an uncompilable bound schema as an upstream contract failure', async () => {
    const invalidSchema = schema(DEFINITION.schemaName, SCHEMA_ID, {
      type: 'object',
      properties: { decision: { type: 'unsupported-type' } },
    });
    const { api, service } = makeSubject([writableParentResponse(), new HttpException(404, 'Not found'), response(invalidSchema, 200)]);

    await expect(service.writeDocument(writeRequest({ ifNoneMatch: '*' }))).rejects.toMatchObject({
      status: 502,
      message: 'JSON Schema returned an investigation schema that could not be compiled',
    });

    expect(api.putCalls).toHaveLength(0);
  });

  it('treats a persisted key-to-schema mismatch as an upstream contract failure', async () => {
    const { api, service } = makeSubject([response(document(7), 200, '"7"'), response(schema('another-schema'), 200)]);

    await expect(service.readDocument(request)).rejects.toMatchObject({
      status: 502,
      message: 'Investigation document schemaId does not match its configured schemaName',
    });

    expect(api.putCalls).toHaveLength(0);
  });

  it('rejects schema metadata returned for another schemaId', async () => {
    const { service } = makeSubject([response(document(7), 200, '"7"'), response(schema(DEFINITION.schemaName, 'different-id'), 200)]);

    await expect(service.readDocument(request)).rejects.toMatchObject({
      status: 502,
      message: 'JSON Schema returned metadata for a different schemaId',
    });
  });

  it('propagates an upstream conditional write failure without attempting the parent readback', async () => {
    const upstreamFailure = new HttpException(412, 'Concurrent update');
    const { api, service } = makeSubject(
      [writableParentResponse(), response(document(7), 200, '"7"'), response(schema(), 200), writableParentResponse()],
      [upstreamFailure],
    );

    await expect(service.writeDocument(writeRequest({ ifMatch: '"7"' }))).rejects.toBe(upstreamFailure);

    expect(api.getCalls.map(call => call.url)).toEqual([ERRAND_URL, DOCUMENT_URL, SCHEMA_URL, ERRAND_URL]);
  });

  it('rechecks parent status and version immediately before the child write', async () => {
    const { api, service } = makeSubject([
      writableParentResponse(10),
      response(document(7), 200, '"7"'),
      response(schema(), 200),
      writableParentResponse(11),
    ]);

    await expect(service.writeDocument(writeRequest({ ifMatch: '"7"' }))).rejects.toMatchObject({
      status: 412,
      message: 'X-Errand-Version does not match the current parent errand version',
    });
    expect(api.getCalls.map(call => call.url)).toEqual([ERRAND_URL, DOCUMENT_URL, SCHEMA_URL, ERRAND_URL]);
    expect(api.putCalls).toHaveLength(0);
  });

  it('rejects when the parent becomes locked during document preflight', async () => {
    const { api, service } = makeSubject([
      writableParentResponse(10),
      response(document(7), 200, '"7"'),
      response(schema(), 200),
      response({ ...parentErrand(10), status: 'SOLVED' }, 200, '"10"'),
    ]);

    await expect(service.writeDocument(writeRequest({ ifMatch: '"7"' }))).rejects.toMatchObject({
      status: 409,
      message: 'Support errand status does not allow investigation document changes',
    });
    expect(api.getCalls.map(call => call.url)).toEqual([ERRAND_URL, DOCUMENT_URL, SCHEMA_URL, ERRAND_URL]);
    expect(api.putCalls).toHaveLength(0);
  });

  it('fails a create race when the key appears between preflight and the upstream transaction', async () => {
    const concurrentCreate = new HttpException(412, 'If-Match version does not match current resource version');
    const { api, service } = makeSubject(
      [writableParentResponse(), new HttpException(404, 'Not found'), response(schema(), 200), writableParentResponse()],
      [concurrentCreate],
    );

    await expect(service.writeDocument(writeRequest({ ifNoneMatch: '*' }))).rejects.toBe(concurrentCreate);

    expect(api.putCalls[0]?.headers).toEqual({ 'If-Match': '"-1"' });
    expect(api.getCalls.map(call => call.url)).toEqual([ERRAND_URL, DOCUMENT_URL, SCHEMA_URL, ERRAND_URL]);
  });

  it.each(['W/"7"', '*', '"7", "8"', '7'])('rejects malformed upstream document ETag %s', async etag => {
    const { api, service } = makeSubject([response(document(7), 200, etag)]);

    await expect(service.readDocument(request)).rejects.toMatchObject({ status: 502 });

    expect(api.getCalls).toHaveLength(1);
  });

  it('rejects an upstream body version that disagrees with its strong ETag', async () => {
    const { api, service } = makeSubject([response(document(7), 200, '"8"')]);

    await expect(service.readDocument(request)).rejects.toMatchObject({
      status: 502,
      message: 'Support Management returned inconsistent investigation document versions',
    });

    expect(api.getCalls).toHaveLength(1);
  });
});
