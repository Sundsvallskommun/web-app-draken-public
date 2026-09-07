import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Attachment as CasedataAttachment, Errand as ErrandDTO, ErrandChannelEnum } from '@/data-contracts/case-data/data-contracts';
import { HttpException } from '@/exceptions/HttpException';
import { Role } from '@/interfaces/role';
import { User } from '@/interfaces/users.interface';
import { getDecisionAttachmentAsBase64 } from '@/services/casedata-attachment.service';
import { sendDecisionToDigitalMail, sendDecisionToKatla } from '@/services/message.service';

import {
  mockAdUsername,
  mockCasedataErrandId,
  mockCasedataErrandNumber,
  mockCitizenPartyId,
  mockConversationId,
  mockDecisionAttachmentId,
  mockDecisionId,
  mockFileContent,
  mockFileName,
  mockFirstName,
  mockLastName,
  mockMessageId,
  mockMimeType,
} from './helpers/mock-data';

// Shared by every ApiService instance the service constructs. vi.hoisted so the mock factory,
// which is hoisted above this file's imports, can close over them.
const { post, get, put } = vi.hoisted(() => ({ post: vi.fn(), get: vi.fn(), put: vi.fn() }));

vi.mock('@/services/api.service', () => ({
  default: class {
    post = post;
    get = get;
    put = put;
  },
  ApiResponse: class {},
}));

vi.mock('@/services/casedata-attachment.service', () => ({
  getDecisionAttachmentAsBase64: vi.fn(),
}));

const user = { username: mockAdUsername, firstName: mockFirstName, lastName: mockLastName } as User;

const pdf = { id: mockDecisionAttachmentId, name: mockFileName, mimeType: mockMimeType } as CasedataAttachment;

const errand = (overrides: Partial<ErrandDTO> = {}): ErrandDTO =>
  ({
    id: mockCasedataErrandId,
    errandNumber: mockCasedataErrandNumber,
    stakeholders: [{ roles: [Role.APPLICANT], personId: mockCitizenPartyId }],
    ...overrides,
  }) as ErrandDTO;

const letterSent = () => ({ data: { messages: [{ messageId: mockMessageId }] } });
const messageMetadata = () => ({ data: [{ timestamp: '2026-01-01T00:00:00.000Z', content: {} }] });

describe('message.service decision channels', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDecisionAttachmentAsBase64).mockResolvedValue(Buffer.from(mockFileContent).toString('base64'));
    get.mockResolvedValue(messageMetadata());
    post.mockResolvedValue(letterSent());
    put.mockResolvedValue({ data: {} });
  });

  describe('sendDecisionToDigitalMail', () => {
    it('reports the message id when the letter is sent and stored', async () => {
      const result = await sendDecisionToDigitalMail(errand(), user, pdf, mockDecisionId);

      expect(result).toEqual({
        channel: 'DIGITAL_MAIL',
        status: 'sent',
        data: { messageId: mockMessageId },
        message: 'Digital mail sent',
      });
    });

    it('still counts as sent when the letter was delivered but could not be stored on the errand', async () => {
      // First POST is the letter itself, the second is saveMessageOnErrand storing it.
      post.mockResolvedValueOnce(letterSent()).mockRejectedValueOnce(new HttpException(500, 'Internal Server Error'));

      const result = await sendDecisionToDigitalMail(errand(), user, pdf, mockDecisionId);

      expect(result.status).toBe('sent');
      expect(result.data.messageId).toBe(mockMessageId);
      expect(result.message).toBe('Digital mail sent but id could not be stored');
    });

    it('resolves with a reason instead of rejecting when Messaging fails', async () => {
      post.mockRejectedValue(new HttpException(500, 'Internal Server Error'));

      const result = await sendDecisionToDigitalMail(errand(), user, pdf, mockDecisionId);

      expect(result).toEqual({
        channel: 'DIGITAL_MAIL',
        status: 'failed',
        data: { reason: '500 Internal Server Error' },
        message: 'Digital mail failed',
      });
    });

    it('resolves with a reason instead of rejecting when Messaging returns no message id', async () => {
      post.mockResolvedValue({ data: { messages: [] } });

      const result = await sendDecisionToDigitalMail(errand(), user, pdf, mockDecisionId);

      expect(result.status).toBe('failed');
      expect(result.data.reason).toBe('Error: no id returned when sending message');
    });

    it('fails the channel without sending when the decision attachment has no id', async () => {
      const result = await sendDecisionToDigitalMail(errand(), user, { ...pdf, id: undefined }, mockDecisionId);

      expect(result.status).toBe('failed');
      expect(result.data.reason).toContain('missing id');
      expect(post).not.toHaveBeenCalled();
    });

    it('fails the channel when the attachment content cannot be fetched', async () => {
      vi.mocked(getDecisionAttachmentAsBase64).mockRejectedValue(new HttpException(404, 'Not found'));

      const result = await sendDecisionToDigitalMail(errand(), user, pdf, mockDecisionId);

      expect(result).toEqual({
        channel: 'DIGITAL_MAIL',
        status: 'failed',
        data: { reason: '404 Not found' },
        message: 'Digital mail failed',
      });
    });
  });

  describe('sendDecisionToKatla', () => {
    const baseURL = 'https://api.test.local';

    it('skips errands that did not arrive through Katla', async () => {
      const result = await sendDecisionToKatla(baseURL, errand({ channel: ErrandChannelEnum.EMAIL }), user, pdf, mockDecisionId);

      expect(result).toEqual({ channel: 'KATLA', status: 'skipped', data: {}, message: 'Non Katla errand' });
      expect(post).not.toHaveBeenCalled();
    });

    it('reports the conversation id when the message is sent', async () => {
      get.mockResolvedValueOnce({ data: [{ id: mockConversationId, relationIds: [], type: 'INTERNAL' }] });

      const result = await sendDecisionToKatla(baseURL, errand({ channel: ErrandChannelEnum.ESERVICE_KATLA }), user, pdf, mockDecisionId);

      expect(result).toEqual({
        channel: 'KATLA',
        status: 'sent',
        data: { messageId: mockConversationId },
        message: 'Message sent to Katla',
      });
    });

    it('resolves with a reason when the conversation lookup fails', async () => {
      get.mockRejectedValueOnce(new HttpException(503, 'Service Unavailable'));

      const result = await sendDecisionToKatla(baseURL, errand({ channel: ErrandChannelEnum.ESERVICE_KATLA }), user, pdf, mockDecisionId);

      expect(result).toEqual({
        channel: 'KATLA',
        status: 'failed',
        data: { reason: '503 Service Unavailable' },
        message: 'Message to Katla failed',
      });
    });
  });
});
