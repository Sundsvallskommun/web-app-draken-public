import { apiServiceName } from '@/config/api-config';
import { ATTACHMENT_STALL_TIMEOUT_MS, SupportAttachmentController } from '@/controllers/supportmanagement/support-attachment.controller';

import { mockReq, mockRes } from './helpers/http';
import { mockMunicipalityId, mockSupportErrandId, mockSupportNamespace } from './helpers/mock-data';

const SERVICE = apiServiceName('supportmanagement');
const ATTACHMENT_ID = 'attachment-1';
const FILE_CONTENT = 'file content';

const makeController = () => {
  const controller = new SupportAttachmentController();
  const api = { get: vi.fn(async () => ({ data: new TextEncoder().encode(FILE_CONTENT).buffer, message: 'success' })) };
  (controller as unknown as { apiService: typeof api }).apiService = api;
  return { controller, api };
};

describe('SupportAttachmentController', () => {
  describe('fetching a single attachment', () => {
    it('limits how long a stalled download may wait and returns the file as base64', async () => {
      const { controller, api } = makeController();
      const res = mockRes<string>();

      await controller.fetchSingleSupportAttachment(mockReq(), mockSupportErrandId, ATTACHMENT_ID, mockMunicipalityId, res);

      expect(api.get).toHaveBeenCalledWith(
        {
          url: `${SERVICE}/${mockMunicipalityId}/${mockSupportNamespace}/errands/${mockSupportErrandId}/attachments/${ATTACHMENT_ID}`,
          responseType: 'arraybuffer',
          timeout: ATTACHMENT_STALL_TIMEOUT_MS,
        },
        expect.anything(),
      );
      expect(res.body).toBe(Buffer.from(FILE_CONTENT).toString('base64'));
    });

    it('fails the request when the download fails', async () => {
      const { controller, api } = makeController();
      api.get.mockRejectedValueOnce(new Error('stream has been aborted'));

      await expect(
        controller.fetchSingleSupportAttachment(mockReq(), mockSupportErrandId, ATTACHMENT_ID, mockMunicipalityId, mockRes<string>()),
      ).rejects.toThrow('stream has been aborted');
    });
  });
});
