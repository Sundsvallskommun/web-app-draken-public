import assert from 'node:assert/strict';
import { beforeEach, describe, it, mock } from 'node:test';

import { Response } from 'express';

import { RequestWithUser } from '@/interfaces/auth.interface';
import { User } from '@/interfaces/users.interface';
import ApiService from '@/services/api.service';

import {
  INVESTIGATION_JSON_PARAMETER_KEYS,
  SupportErrandJsonParameter,
  SupportErrandJsonParameterController,
  UpdateSupportErrandJsonParameterDto,
} from './support-errand-json-parameter.controller';

const user: User = {
  id: 1,
  personId: 'person-id',
  name: 'Test User',
  firstName: 'Test',
  lastName: 'User',
  email: 'test.user@example.com',
  password: '',
  username: 'testuser',
  groups: [],
  permissions: {
    canEditCasedata: false,
    canEditSupportManagement: true,
    canViewAttestations: false,
    canEditAttestations: false,
  },
};

interface ResponseState {
  status?: number;
  body?: unknown;
  headers: Record<string, string | number | readonly string[]>;
}

const createRequest = (): RequestWithUser => ({ user }) as unknown as RequestWithUser;

const isUnsupportedKeyError = (error: unknown): boolean =>
  error instanceof Error && 'status' in error && error.status === 400 && error.message === 'Unsupported investigation JSON parameter key';

const createResponse = (): { response: Response; state: ResponseState } => {
  const state: ResponseState = { headers: {} };
  const response = {
    status(status: number) {
      state.status = status;
      return response;
    },
    send(body: unknown) {
      state.body = body;
      return response;
    },
    setHeader(name: string, value: string | number | readonly string[]) {
      state.headers[name] = value;
      return response;
    },
  } as unknown as Response;

  return { response, state };
};

describe('SupportErrandJsonParameterController', () => {
  beforeEach(() => mock.restoreAll());

  it('reads one parameter and forwards the upstream ETag', async () => {
    const parameter: SupportErrandJsonParameter = {
      key: 'utredning-enhetschef',
      schemaId: '2281_utredning-enhetschef_1.0',
      value: { summary: 'Test' },
      version: 3,
    };
    const apiService = new ApiService();
    const getMock = mock.method(apiService, 'get', async <T>() => ({
      data: parameter as T,
      message: 'success',
      headers: { etag: '"3"' },
    }));
    const controller = new SupportErrandJsonParameterController(apiService);
    const { response, state } = createResponse();

    await controller.getJsonParameter(createRequest(), '2281', 'errand-id', parameter.key, response);

    assert.equal(getMock.mock.callCount(), 1);
    const [config, forwardedUser] = getMock.mock.calls[0].arguments;
    assert.ok(config);
    assert.match(config.url ?? '', /\/2281\/[^/]+\/errands\/errand-id\/json-parameters\/utredning-enhetschef$/);
    assert.equal(config.includeResponseHeaders, true);
    assert.equal(config.propagateClientError, true);
    assert.equal(forwardedUser, user);
    assert.equal(state.status, 200);
    assert.equal(state.headers.ETag, '"3"');
    assert.deepEqual(state.body, parameter);
  });

  it('updates only the path key, forwards If-Match and returns the new version as an ETag fallback', async () => {
    const update: UpdateSupportErrandJsonParameterDto = {
      schemaId: '2281_utredning-hsl_1.0',
      value: { assessment: 'Test' },
    };
    const updated: SupportErrandJsonParameter = {
      key: 'utredning-hsl',
      ...update,
      version: 8,
    };
    const apiService = new ApiService();
    const putMock = mock.method(apiService, 'put', async <T>() => ({ data: updated as T, message: 'success' }));
    const controller = new SupportErrandJsonParameterController(apiService);
    const { response, state } = createResponse();

    await controller.updateJsonParameter(createRequest(), '2281', 'errand-id', updated.key, '"7"', update, response);

    assert.equal(putMock.mock.callCount(), 1);
    const [config, forwardedUser] = putMock.mock.calls[0].arguments;
    assert.ok(config);
    assert.deepEqual(config.data, { key: updated.key, schemaId: update.schemaId, value: update.value });
    assert.deepEqual(config.headers, { 'If-Match': '"7"' });
    assert.equal(config.includeResponseHeaders, true);
    assert.equal(config.propagateClientError, true);
    assert.equal(forwardedUser, user);
    assert.equal(state.status, 200);
    assert.equal(state.headers.ETag, '"8"');
    assert.deepEqual(state.body, updated);
  });

  it('rejects keys outside the three investigation documents before calling Support Management', async () => {
    const apiService = new ApiService();
    const getMock = mock.method(apiService, 'get');
    const putMock = mock.method(apiService, 'put');
    const controller = new SupportErrandJsonParameterController(apiService);
    const { response } = createResponse();

    await assert.rejects(
      controller.getJsonParameter(createRequest(), '2281', 'errand-id', 'avvikelse-plats-handelse', response),
      isUnsupportedKeyError,
    );
    await assert.rejects(
      controller.updateJsonParameter(
        createRequest(),
        '2281',
        'errand-id',
        'avvikelse-plats-handelse',
        undefined,
        { schemaId: '2281_avvikelse-plats-handelse_1.0', value: {} },
        response,
      ),
      isUnsupportedKeyError,
    );

    assert.deepEqual(INVESTIGATION_JSON_PARAMETER_KEYS, ['utredning-enhetschef', 'utredning-sol-lss', 'utredning-hsl']);
    assert.equal(getMock.mock.callCount(), 0);
    assert.equal(putMock.mock.callCount(), 0);
  });
});
