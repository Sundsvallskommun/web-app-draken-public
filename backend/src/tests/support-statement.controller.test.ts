import { SupportStatementController } from '@/controllers/supportmanagement/support-statement.controller';

import { mockReq, mockRes } from './helpers/http';
import { mockMunicipalityId } from './helpers/mock-data';

const errandId = '88833b47-c68b-4798-93ba-b491961c2cd5';
const statementId = '8ed7729b-9fa7-49f1-80ea-4fd54997844f';
const attachmentId = 'f1a0b2c3-4d5e-6f70-8192-a3b4c5d6e7f8';

const file = () => ({ buffer: Buffer.from('%PDF-1.7'), originalname: 'remiss.pdf' }) as Express.Multer.File;

const makeController = (location: string | null = `/attachments/${attachmentId}`) => {
  const controller = new SupportStatementController();
  const api = {
    get: vi.fn(async (config: { url?: string }) =>
      config.url?.includes('attachmentpurposes')
        ? { data: [{ id: 'purpose-1', name: 'REFERRAL_POLICE_RESPONSE' }] }
        : { data: { id: statementId, attachments: [] } },
    ),
    post: vi.fn(async (_config: { url?: string }) => ({ data: undefined, location: location ?? undefined })),
    patch: vi.fn(async (_config: { url?: string; data?: unknown }) => ({ data: {} })),
  };
  Object.assign(controller as object, { apiService: api });
  return { controller, api };
};

const upload = (controller: SupportStatementController, purpose = 'REFERRAL_POLICE_RESPONSE') =>
  controller.uploadStatementAttachment(mockReq(), [file()], errandId, mockMunicipalityId, statementId, { purpose }, mockRes());

describe('uploading an attachment to a statement', () => {
  it('stamps the purpose on the attachment the service says it created', async () => {
    const { controller, api } = makeController();

    await upload(controller);

    expect(api.patch).toHaveBeenCalledTimes(1);
    expect(api.patch.mock.calls[0][0]).toMatchObject({
      url: expect.stringContaining(`errands/${errandId}/attachments/${attachmentId}`),
      data: { purpose: { id: 'purpose-1' } },
    });
  });

  it('does not guess the attachment by reading the statement before and after', async () => {
    const { controller, api } = makeController();

    await upload(controller);

    const statementReads = api.get.mock.calls.filter(([config]) => config.url?.endsWith(`/statements/${statementId}`));
    expect(statementReads).toHaveLength(1);
  });

  it('refuses to guess when the service names no attachment', async () => {
    const { controller, api } = makeController(null);

    await expect(upload(controller)).rejects.toMatchObject({ status: 502 });
    expect(api.patch).not.toHaveBeenCalled();
  });

  it('refuses a purpose the namespace does not know, so no file is left behind', async () => {
    const { controller, api } = makeController();

    await expect(upload(controller, 'REFERRAL_RESCUE_SERVICE_RESPONSE')).rejects.toMatchObject({ status: 502 });
    expect(api.post).not.toHaveBeenCalled();
  });

  it('refuses a purpose that is not a referral purpose, so no file is sent', async () => {
    const { controller, api } = makeController();

    await expect(upload(controller, 'FLOOR_PLAN')).rejects.toMatchObject({ status: 400 });
    expect(api.post).not.toHaveBeenCalled();
  });

  it('refuses a municipality other than its own', async () => {
    const { controller, api } = makeController();
    const res = mockRes();

    await controller.uploadStatementAttachment(mockReq(), [file()], errandId, '1984', statementId, { purpose: 'REFERRAL_POLICE_RESPONSE' }, res);

    expect(res.statusCode).toBe(400);
    expect(api.post).not.toHaveBeenCalled();
  });
});
