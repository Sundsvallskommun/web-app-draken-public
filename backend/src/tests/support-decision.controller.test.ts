import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import {
  CreateSupportDecisionDto,
  SupportDecisionController,
  UpdateSupportDecisionDto,
} from '@/controllers/supportmanagement/support-decision.controller';

import { mockReq, mockRes } from './helpers/http';
import {
  mockCity,
  mockMunicipalityId,
  mockRestaurantNumber,
  mockStreet,
  mockSupportErrandId,
  mockSupportNamespace,
  mockZipCode,
} from './helpers/mock-data';

const MUNICIPALITY_ID = mockMunicipalityId;
const NAMESPACE = mockSupportNamespace;
const DECISION_ID = 'decision-1';

interface ApiStub {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  patch: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
}

// What the decision says about the premises, for the process to act on.
const PREMISES_PARAMETERS = [
  { key: 'restaurantNumber', values: [mockRestaurantNumber] },
  { key: 'street', values: [mockStreet] },
  { key: 'postalCode', values: [mockZipCode] },
  { key: 'city', values: [mockCity] },
];

const decisionsUrl = `${MUNICIPALITY_ID}/${NAMESPACE}/errands/${mockSupportErrandId}/decisions`;

const makeController = () => {
  const controller = new SupportDecisionController();
  const api: ApiStub = {
    get: vi.fn(async (config: { url?: string }) =>
      config.url === decisionsUrl
        ? { data: [{ id: DECISION_ID, created: '2026-09-18T10:00:00+02:00', status: 'DRAFT' }], message: 'success' }
        : { data: { id: DECISION_ID, status: 'DRAFT', version: 3 }, message: 'success' },
    ),
    post: vi.fn(async () => ({ data: {}, message: 'success' })),
    patch: vi.fn(async () => ({ data: {}, message: 'success' })),
    delete: vi.fn(async () => ({ data: undefined, message: 'success' })),
  };
  (controller as unknown as { apiService: ApiStub }).apiService = api;
  return { controller, api };
};

describe('CreateSupportDecisionDto', () => {
  it('requires an outcome and accepts the fields the decision carries', async () => {
    const valid = plainToInstance(CreateSupportDecisionDto, {
      outcome: 'APPROVAL',
      decidedByRole: 'Handläggare',
      justification: 'Motivering',
      terms: ['Villkor'],
    });
    const invalid = plainToInstance(CreateSupportDecisionDto, { outcome: '', status: 'COMPLETED', decidedBy: 'someone' });

    await expect(validate(valid, { whitelist: true, forbidNonWhitelisted: true })).resolves.toEqual([]);
    const serializedErrors = JSON.stringify(await validate(invalid, { whitelist: true, forbidNonWhitelisted: true }));
    expect(serializedErrors).toMatch(/outcome/);
    // The status, method and decider are the controller's to set, never the client's.
    expect(serializedErrors).toMatch(/status/);
    expect(serializedErrors).toMatch(/decidedBy/);
  });

  it('accepts parameters as keys with lists of values, and nothing else in them', async () => {
    const options = { whitelist: true, forbidNonWhitelisted: true };
    const withParameters = (parameters: unknown) => plainToInstance(CreateSupportDecisionDto, { outcome: 'APPROVAL', parameters });

    await expect(validate(withParameters(PREMISES_PARAMETERS), options)).resolves.toEqual([]);
    await expect(validate(withParameters([]), options)).resolves.toEqual([]);

    const errorsOf = async (parameters: unknown) => JSON.stringify(await validate(withParameters(parameters), options));
    expect(await errorsOf([{ key: '', values: [mockStreet] }])).toMatch(/key/);
    expect(await errorsOf([{ key: 'street', values: mockStreet }])).toMatch(/values/);
    expect(await errorsOf([{ key: 'street', values: [mockStreet], version: 1 }])).toMatch(/version/);
  });
});

describe('createDecision', () => {
  it('rejects a municipality id other than the configured one and writes nothing', async () => {
    const { controller, api } = makeController();
    const res = mockRes();

    await controller.createDecision(mockReq(), mockSupportErrandId, '9999', { outcome: 'APPROVAL' }, res);

    expect(res.statusCode).toBe(400);
    expect(api.post).not.toHaveBeenCalled();
  });

  it('writes the decision as a draft and its terms, and leaves it a draft', async () => {
    const { controller, api } = makeController();
    const req = mockReq();

    await controller.createDecision(
      req,
      mockSupportErrandId,
      MUNICIPALITY_ID,
      { outcome: 'APPROVAL', terms: ['Första villkoret', 'Andra villkoret'] },
      mockRes(),
    );

    const [createConfig] = api.post.mock.calls[0];
    expect(createConfig.url).toBe(decisionsUrl);
    expect(createConfig.data).toMatchObject({ outcome: 'APPROVAL', status: 'DRAFT', method: 'MANUAL' });
    expect(createConfig.data.decidedAt).toEqual(expect.any(String));

    expect(api.post).toHaveBeenCalledTimes(3);
    expect(api.post.mock.calls[1][0]).toMatchObject({
      url: `${decisionsUrl}/${DECISION_ID}/terms`,
      data: { sortOrder: 1, text: 'Första villkoret' },
    });
    expect(api.post.mock.calls[2][0]).toMatchObject({ data: { sortOrder: 2, text: 'Andra villkoret' } });

    expect(api.patch).not.toHaveBeenCalled();
    expect(api.delete).not.toHaveBeenCalled();
  });

  it('writes the parameters with the draft, so they are in place when the decision is concluded', async () => {
    const { controller, api } = makeController();

    await controller.createDecision(
      mockReq(),
      mockSupportErrandId,
      MUNICIPALITY_ID,
      { outcome: 'APPROVAL', parameters: PREMISES_PARAMETERS },
      mockRes(),
    );

    const [createConfig] = api.post.mock.calls[0];
    expect(createConfig.data).toMatchObject({ status: 'DRAFT', parameters: PREMISES_PARAMETERS });
  });

  it('removes the draft when a term cannot be written, and reports the failure', async () => {
    const { controller, api } = makeController();
    api.post.mockImplementation(async (config: { url?: string }) => {
      if (config.url?.endsWith('/terms')) throw new Error('term rejected');
      return { data: {}, message: 'success' };
    });

    await expect(
      controller.createDecision(mockReq(), mockSupportErrandId, MUNICIPALITY_ID, { outcome: 'APPROVAL', terms: ['Villkor'] }, mockRes()),
    ).rejects.toThrow('term rejected');

    expect(api.delete).toHaveBeenCalledWith(expect.objectContaining({ url: `${decisionsUrl}/${DECISION_ID}` }), expect.anything());
    expect(api.patch).not.toHaveBeenCalled();
  });

  it('keeps the original failure when the draft cannot be removed either', async () => {
    const { controller, api } = makeController();
    api.post.mockImplementation(async (config: { url?: string }) => {
      if (config.url?.endsWith('/terms')) throw new Error('term rejected');
      return { data: {}, message: 'success' };
    });
    api.delete.mockRejectedValue(new Error('delete failed'));

    await expect(
      controller.createDecision(mockReq(), mockSupportErrandId, MUNICIPALITY_ID, { outcome: 'APPROVAL', terms: ['Villkor'] }, mockRes()),
    ).rejects.toThrow('term rejected');
  });
});

describe('UpdateSupportDecisionDto', () => {
  it('takes the fields of a draft, all of them optional', async () => {
    const valid = plainToInstance(UpdateSupportDecisionDto, { outcome: 'REJECTION', terms: ['Villkor'] });
    const empty = plainToInstance(UpdateSupportDecisionDto, {});
    const invalid = plainToInstance(UpdateSupportDecisionDto, { outcome: '', status: 'COMPLETED' });

    await expect(validate(valid, { whitelist: true, forbidNonWhitelisted: true })).resolves.toEqual([]);
    await expect(validate(empty, { whitelist: true, forbidNonWhitelisted: true })).resolves.toEqual([]);
    const serializedErrors = JSON.stringify(await validate(invalid, { whitelist: true, forbidNonWhitelisted: true }));
    expect(serializedErrors).toMatch(/outcome/);
    expect(serializedErrors).toMatch(/status/);
  });
});

describe('updateDecision', () => {
  it('rejects a municipality id other than the configured one and writes nothing', async () => {
    const { controller, api } = makeController();
    const res = mockRes();

    await controller.updateDecision(mockReq(), mockSupportErrandId, '9999', DECISION_ID, { outcome: 'APPROVAL' }, res);

    expect(res.statusCode).toBe(400);
    expect(api.patch).not.toHaveBeenCalled();
  });

  it('writes the fields against the version it read, and replaces the terms as a whole', async () => {
    const { controller, api } = makeController();
    const req = mockReq();
    api.get.mockImplementation(async (config: { url?: string }) =>
      config.url === decisionsUrl
        ? { data: [{ id: DECISION_ID, status: 'DRAFT' }], message: 'success' }
        : { data: { id: DECISION_ID, status: 'DRAFT', version: 3, terms: [{ id: 'term-1' }] }, message: 'success' },
    );

    await controller.updateDecision(
      req,
      mockSupportErrandId,
      MUNICIPALITY_ID,
      DECISION_ID,
      { outcome: 'REJECTION', terms: ['Nytt villkor'] },
      mockRes(),
    );

    expect(api.patch).toHaveBeenCalledWith(
      expect.objectContaining({
        url: `${decisionsUrl}/${DECISION_ID}`,
        headers: { 'If-Match': '"3"' },
        data: expect.objectContaining({ outcome: 'REJECTION', decidedBy: req.user.username }),
      }),
      req.user,
    );
    expect(api.delete).toHaveBeenCalledWith(expect.objectContaining({ url: `${decisionsUrl}/${DECISION_ID}/terms/term-1` }), req.user);
    expect(api.post).toHaveBeenCalledWith(
      expect.objectContaining({ url: `${decisionsUrl}/${DECISION_ID}/terms`, data: { sortOrder: 1, text: 'Nytt villkor' } }),
      req.user,
    );
  });

  it('writes the parameters sent with an update, and sends none when there are none to change', async () => {
    const { controller, api } = makeController();

    await controller.updateDecision(mockReq(), mockSupportErrandId, MUNICIPALITY_ID, DECISION_ID, { parameters: PREMISES_PARAMETERS }, mockRes());
    await controller.updateDecision(mockReq(), mockSupportErrandId, MUNICIPALITY_ID, DECISION_ID, { justification: 'Ny motivering' }, mockRes());

    expect(api.patch.mock.calls[0][0].data).toMatchObject({ parameters: PREMISES_PARAMETERS });
    // Support Management leaves the stored parameters as they are when the list is omitted.
    expect(api.patch.mock.calls[1][0].data).not.toHaveProperty('parameters');
  });

  it('leaves the terms alone when none are sent', async () => {
    const { controller, api } = makeController();

    await controller.updateDecision(mockReq(), mockSupportErrandId, MUNICIPALITY_ID, DECISION_ID, { justification: 'Ny motivering' }, mockRes());

    expect(api.delete).not.toHaveBeenCalled();
    expect(api.post).not.toHaveBeenCalled();
  });
});

describe('completeDecision', () => {
  it('rejects a municipality id other than the configured one and writes nothing', async () => {
    const { controller, api } = makeController();
    const res = mockRes();

    await controller.completeDecision(mockReq(), mockSupportErrandId, '9999', DECISION_ID, res);

    expect(res.statusCode).toBe(400);
    expect(api.patch).not.toHaveBeenCalled();
  });

  it('concludes the draft against the version it read', async () => {
    const { controller, api } = makeController();
    const req = mockReq();

    await controller.completeDecision(req, mockSupportErrandId, MUNICIPALITY_ID, DECISION_ID, mockRes());

    expect(api.patch).toHaveBeenCalledWith(
      expect.objectContaining({
        url: `${decisionsUrl}/${DECISION_ID}`,
        data: { status: 'COMPLETED' },
        headers: { 'If-Match': '"3"' },
      }),
      req.user,
    );
  });

  it('leaves a decision that is already concluded alone', async () => {
    const { controller, api } = makeController();
    api.get.mockImplementation(async () => ({ data: { id: DECISION_ID, status: 'COMPLETED', version: 4 }, message: 'success' }));

    await controller.completeDecision(mockReq(), mockSupportErrandId, MUNICIPALITY_ID, DECISION_ID, mockRes());

    expect(api.patch).not.toHaveBeenCalled();
  });
});
