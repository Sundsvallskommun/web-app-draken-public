import { CaseDataConversationController } from '@/controllers/casedata/casedata-conversation.controller';

import { mockReq } from './helpers/http';
import {
  mockAttachmentId,
  mockBinaryFileContent,
  mockCasedataErrandId,
  mockConversationId,
  mockMessageId,
  mockMunicipalityId,
} from './helpers/mock-data';

const makeController = () => {
  const controller = new CaseDataConversationController();
  const api = { get: vi.fn(async () => ({ data: mockBinaryFileContent, message: 'success' })) };
  (controller as unknown as { apiService: typeof api }).apiService = api;
  return { controller, api };
};

describe('CaseDataConversationController', () => {
  describe('fetching a conversation attachment', () => {
    it('returns a binary attachment as base64 with every byte intact', async () => {
      const { controller, api } = makeController();

      const result = await controller.getAttachment(
        mockReq(),
        String(mockCasedataErrandId),
        mockMunicipalityId,
        mockConversationId,
        mockMessageId,
        mockAttachmentId,
      );

      expect(api.get).toHaveBeenCalledWith(expect.objectContaining({ responseType: 'arraybuffer' }), expect.anything());
      expect(result).toEqual({ data: mockBinaryFileContent.toString('base64'), message: 'Success' });
    });
  });
});
