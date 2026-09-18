import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { CreateSupportDecisionDto, SupportDecisionController } from '@/controllers/supportmanagement/support-decision.controller';

import { mockReq, mockRes } from './helpers/http';
import { mockMunicipalityId, mockSupportErrandId, mockSupportNamespace } from './helpers/mock-data';

const MUNICIPALITY_ID = mockMunicipalityId;
const NAMESPACE = mockSupportNamespace;
const DECISION_ID = 'decision-1';

interface ApiStub {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  patch: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
}

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
});

describe('createDecision', () => {
  it('rejects a municipality id other than the configured one and writes nothing', async () => {
    const { controller, api } = makeController();
    const res = mockRes();

    await controller.createDecision(mockReq(), mockSupportErrandId, '9999', { outcome: 'APPROVAL' }, res);

    expect(res.statusCode).toBe(400);
    expect(api.post).not.toHaveBeenCalled();
  });

  it('writes the decision as a draft, then its terms, and concludes it last', async () => {
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

    expect(api.patch).toHaveBeenCalledWith(
      expect.objectContaining({
        url: `${decisionsUrl}/${DECISION_ID}`,
        data: { status: 'COMPLETED' },
        headers: { 'If-Match': '"3"' },
      }),
      req.user,
    );
    expect(api.delete).not.toHaveBeenCalled();
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

  it('removes the draft when concluding it fails', async () => {
    const { controller, api } = makeController();
    api.patch.mockRejectedValue(new Error('conflict'));

    await expect(controller.createDecision(mockReq(), mockSupportErrandId, MUNICIPALITY_ID, { outcome: 'APPROVAL' }, mockRes())).rejects.toThrow(
      'conflict',
    );

    expect(api.delete).toHaveBeenCalledWith(expect.objectContaining({ url: `${decisionsUrl}/${DECISION_ID}` }), expect.anything());
  });

  it('keeps the original failure when the draft cannot be removed either', async () => {
    const { controller, api } = makeController();
    api.patch.mockRejectedValue(new Error('conflict'));
    api.delete.mockRejectedValue(new Error('delete failed'));

    await expect(controller.createDecision(mockReq(), mockSupportErrandId, MUNICIPALITY_ID, { outcome: 'APPROVAL' }, mockRes())).rejects.toThrow(
      'conflict',
    );
  });
});
