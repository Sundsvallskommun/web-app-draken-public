import { Response } from 'express';

import {
  INVESTIGATION_JSON_PARAMETER_KEYS,
  SupportErrandJsonParameter,
  SupportErrandJsonParameterController,
  UpdateSupportErrandJsonParameterDto,
} from '@/controllers/supportmanagement/support-errand-json-parameter.controller';

import { mockReq, mockRes, MockResponse } from './helpers/http';
import { mockMunicipalityId, mockSupportErrandId } from './helpers/mock-data';

interface ApiStub {
  get: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
}

/** `apiService` is a plain instance property (`private` is erased at runtime), so it can be replaced. */
const makeController = () => {
  const controller = new SupportErrandJsonParameterController();
  const api: ApiStub = {
    get: vi.fn(async () => ({ data: {}, message: 'success' })),
    put: vi.fn(async () => ({ data: {}, message: 'success' })),
  };
  (controller as unknown as { apiService: ApiStub }).apiService = api;
  return { controller, api };
};

/** The handlers are typed against express' Response; the double only implements what they call. */
const resDouble = () => mockRes() as unknown as MockResponse & Response;

const UNSUPPORTED_KEY_ERROR = { status: 400, message: 'Unsupported investigation JSON parameter key' };

beforeEach(() => {
  vi.clearAllMocks();
});

describe('SupportErrandJsonParameterController', () => {
  it('reads one parameter and forwards the upstream ETag', async () => {
    const parameter: SupportErrandJsonParameter = {
      key: 'utredning-enhetschef',
      schemaId: '2281_utredning-enhetschef_1.0',
      value: { summary: 'Test' },
      version: 3,
    };
    const { controller, api } = makeController();
    api.get.mockResolvedValue({ data: parameter, message: 'success', headers: { etag: '"3"' } });
    const req = mockReq();
    const res = resDouble();

    await controller.getJsonParameter(req, mockMunicipalityId, mockSupportErrandId, parameter.key, res);

    expect(api.get).toHaveBeenCalledTimes(1);
    const [config, forwardedUser] = api.get.mock.calls[0];
    expect(config.url).toMatch(new RegExp(`/${mockMunicipalityId}/[^/]+/errands/${mockSupportErrandId}/json-parameters/${parameter.key}$`));
    expect(config.includeResponseHeaders).toBe(true);
    expect(config.propagateClientError).toBe(true);
    expect(forwardedUser).toBe(req.user);
    expect(res.statusCode).toBe(200);
    expect(res.headers.ETag).toBe('"3"');
    expect(res.body).toEqual(parameter);
  });

  it('updates only the path key, forwards If-Match and returns the new version as an ETag fallback', async () => {
    const update: UpdateSupportErrandJsonParameterDto = {
      schemaId: '2281_utredning-hsl_1.0',
      value: { assessment: 'Test' },
    };
    const updated: SupportErrandJsonParameter = { key: 'utredning-hsl', ...update, version: 8 };
    const { controller, api } = makeController();
    api.put.mockResolvedValue({ data: updated, message: 'success' });
    const req = mockReq();
    const res = resDouble();

    await controller.updateJsonParameter(req, mockMunicipalityId, mockSupportErrandId, updated.key, '"7"', update, res);

    expect(api.put).toHaveBeenCalledTimes(1);
    const [config, forwardedUser] = api.put.mock.calls[0];
    expect(config.data).toEqual({ key: updated.key, schemaId: update.schemaId, value: update.value });
    expect(config.headers).toEqual({ 'If-Match': '"7"' });
    expect(config.includeResponseHeaders).toBe(true);
    expect(config.propagateClientError).toBe(true);
    expect(forwardedUser).toBe(req.user);
    expect(res.statusCode).toBe(200);
    // No upstream ETag, so the version from the body is used instead.
    expect(res.headers.ETag).toBe('"8"');
    expect(res.body).toEqual(updated);
  });

  it('rejects keys outside the three investigation documents before calling Support Management', async () => {
    const { controller, api } = makeController();
    const res = resDouble();

    await expect(
      controller.getJsonParameter(mockReq(), mockMunicipalityId, mockSupportErrandId, 'avvikelse-plats-handelse', res),
    ).rejects.toMatchObject(UNSUPPORTED_KEY_ERROR);

    await expect(
      controller.updateJsonParameter(
        mockReq(),
        mockMunicipalityId,
        mockSupportErrandId,
        'avvikelse-plats-handelse',
        undefined,
        { schemaId: '2281_avvikelse-plats-handelse_1.0', value: {} },
        res,
      ),
    ).rejects.toMatchObject(UNSUPPORTED_KEY_ERROR);

    expect(INVESTIGATION_JSON_PARAMETER_KEYS).toEqual(['utredning-enhetschef', 'utredning-sol-lss', 'utredning-hsl']);
    expect(api.get).not.toHaveBeenCalled();
    expect(api.put).not.toHaveBeenCalled();
  });
});
