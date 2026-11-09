import { SupportMessageController } from '@/controllers/supportmanagement/support-message.controller';

import { mockReq, mockRes } from './helpers/http';
import { mockAttachmentId, mockBinaryFileContent, mockMessageId, mockMunicipalityId, mockSupportErrandId } from './helpers/mock-data';

const makeController = () => {
  const controller = new SupportMessageController();
  const api = { get: vi.fn(async () => ({ data: mockBinaryFileContent, message: 'success' })) };
  (controller as unknown as { apiService: typeof api }).apiService = api;
  return { controller, api };
};

describe('SupportMessageController', () => {
  describe('fetching a message attachment', () => {
    it('returns a binary attachment as base64 with every byte intact', async () => {
      const { controller, api } = makeController();

      const result = await controller.fetchMessageAttachments(
        mockReq(),
        mockMunicipalityId,
        mockSupportErrandId,
        mockMessageId,
        mockAttachmentId,
        mockRes(),
      );

      expect(api.get).toHaveBeenCalledWith(expect.objectContaining({ responseType: 'arraybuffer' }), expect.anything());
      expect(result).toEqual({ data: mockBinaryFileContent.toString('base64'), message: 'ok' });
    });
  });
});
