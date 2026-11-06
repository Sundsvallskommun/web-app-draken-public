import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MessageController } from '@/controllers/message.controller';
import { MessageDto } from '@/dtos/message.dto';
import { RequestWithUser } from '@/interfaces/auth.interface';
import { Role } from '@/interfaces/role';
import { User } from '@/interfaces/users.interface';

import {
  mockAdUsername,
  mockCasedataErrandId,
  mockCasedataErrandNumber,
  mockCcEmail,
  mockEmail,
  mockFirstName,
  mockLastName,
  mockMessageId,
  mockMunicipalityId,
  mockOwnerEmail,
  mockRecipientEmail,
} from './helpers/mock-data';

// Shared by every ApiService instance the controller and the service construct. vi.hoisted so the mock
// factory, which is hoisted above this file's imports, can close over them.
const { post, get, put } = vi.hoisted(() => ({ post: vi.fn(), get: vi.fn(), put: vi.fn() }));

vi.mock('@/services/api.service', () => ({
  default: class {
    post = post;
    get = get;
    put = put;
  },
  ApiResponse: class {},
}));

const req = { user: { username: mockAdUsername, firstName: mockFirstName, lastName: mockLastName } as User } as RequestWithUser;

const errand = {
  id: mockCasedataErrandId,
  errandNumber: mockCasedataErrandNumber,
  stakeholders: [{ roles: [Role.APPLICANT], contactInformation: [{ contactType: 'EMAIL', value: mockOwnerEmail }] }],
};

const messageDto = (overrides: Partial<MessageDto> = {}) =>
  ({
    text: '<p>Hej</p>',
    attachUtredning: 'false',
    errandId: `${mockCasedataErrandId}`,
    municipalityId: mockMunicipalityId,
    messageClassification: 'Informationsmeddelande',
    reply_to: '',
    references: '',
    ...overrides,
  }) as MessageDto;

const sendEmail = (dto: MessageDto) => new MessageController().email(req, mockMunicipalityId, [], dto);

const postedTo = (urlEnding: string) => post.mock.calls.filter(([request]) => request.url.endsWith(urlEnding)).map(([request]) => request.data);

describe('MessageController email', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    get.mockImplementation(async ({ url }: { url: string }) =>
      url.endsWith('/metadata') ? { data: [{ timestamp: '2026-01-01T00:00:00.000Z', content: {} }] } : { data: errand },
    );
    post.mockResolvedValue({ data: { messageId: mockMessageId } });
    put.mockResolvedValue({ data: {} });
  });

  it('sends one email to all recipients with copies and saves one message', async () => {
    await sendEmail(messageDto({ recipients: [mockEmail, mockRecipientEmail], ccRecipients: [mockCcEmail] }));

    const emails = postedTo('/email');
    expect(emails).toHaveLength(1);
    expect(emails[0]).toMatchObject({ recipients: [mockEmail, mockRecipientEmail], cc: [mockCcEmail] });
    expect(emails[0].emailAddress).toBeUndefined();

    const savedMessages = postedTo('/messages');
    expect(savedMessages).toHaveLength(1);
    expect(savedMessages[0]).toMatchObject({ recipients: [mockEmail, mockRecipientEmail], ccRecipients: [mockCcEmail] });
  });

  it('sends to a single recipient without copies', async () => {
    await sendEmail(messageDto({ recipients: [mockEmail] }));

    expect(postedTo('/email')[0].recipients).toEqual([mockEmail]);
    expect(postedTo('/email')[0].cc).toBeUndefined();
    expect(postedTo('/messages')[0]).toMatchObject({ recipients: [mockEmail], ccRecipients: [] });
  });

  it('falls back to the errand owner when no recipient is given', async () => {
    await sendEmail(messageDto());

    expect(postedTo('/email')[0].recipients).toEqual([mockOwnerEmail]);
    expect(postedTo('/messages')[0].recipients).toEqual([mockOwnerEmail]);
  });

  it('rejects recipients that are not a list without sending anything', async () => {
    await expect(sendEmail(messageDto({ recipients: mockEmail as unknown as string[] }))).rejects.toMatchObject({ status: 400 });

    expect(post).not.toHaveBeenCalled();
  });
});
