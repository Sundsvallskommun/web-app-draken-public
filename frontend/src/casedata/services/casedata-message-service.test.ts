import type { CasedataMessageTabFormModel } from '@casedata/components/errand/tabs/messages/message-composer.component';
import type { IErrand } from '@casedata/interfaces/errand';
import { apiService } from '@common/services/api-service';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { mockEnv } from '../../../e2e/fixtures/mock-env';
import { sendMessage } from './casedata-message-service';

vi.mock('@common/services/api-service', () => ({ apiService: { get: vi.fn(), post: vi.fn() } }));

const errand = { id: 1, errandNumber: 'MEX-1' } as IErrand;
const municipalityId = '2281';
const firstRecipient = mockEnv.mockEmail;
const secondRecipient = mockEnv.mockRecipientEmail.trim();
const ccRecipient = mockEnv.mockCcEmail;

const formData = (overrides: Partial<CasedataMessageTabFormModel> = {}) =>
  ({
    contactMeans: 'email',
    emails: [{ value: firstRecipient }],
    ccEmails: [],
    messageBody: '<p>Hej</p>',
    messageBodyPlaintext: 'Hej',
    newAttachments: [],
    ...overrides,
  } as CasedataMessageTabFormModel);

const postedCalls = () => vi.mocked(apiService.post).mock.calls;
const postedBody = () => postedCalls()[0][1] as FormData;

beforeEach(() => {
  vi.mocked(apiService.post)
    .mockReset()
    .mockResolvedValue({ data: true } as never);
});

describe('sendMessage', () => {
  test('sends one request with all recipients and copies', async () => {
    await sendMessage(
      municipalityId,
      errand,
      formData({
        emails: [{ value: firstRecipient }, { value: secondRecipient }],
        ccEmails: [{ value: ccRecipient }],
      })
    );

    expect(postedCalls()).toHaveLength(1);
    expect(postedCalls()[0][0]).toBe(`casedata/${municipalityId}/email`);
    expect(postedBody().getAll('recipients[]')).toEqual([firstRecipient, secondRecipient]);
    expect(postedBody().getAll('ccRecipients[]')).toEqual([ccRecipient]);
  });

  test('sends a single recipient without copies', async () => {
    await sendMessage(municipalityId, errand, formData());

    expect(postedCalls()).toHaveLength(1);
    expect(postedBody().getAll('recipients[]')).toEqual([firstRecipient]);
    expect(postedBody().getAll('ccRecipients[]')).toEqual([]);
  });

  test('sends an address added twice only once', async () => {
    await sendMessage(
      municipalityId,
      errand,
      formData({
        emails: [{ value: firstRecipient }, { value: firstRecipient }],
        ccEmails: [{ value: ccRecipient }, { value: ccRecipient }],
      })
    );

    expect(postedBody().getAll('recipients[]')).toEqual([firstRecipient]);
    expect(postedBody().getAll('ccRecipients[]')).toEqual([ccRecipient]);
  });

  test('sends a webmessage without email addresses', async () => {
    await sendMessage(
      municipalityId,
      errand,
      formData({
        contactMeans: 'webmessage',
        emails: [{ value: firstRecipient }],
        ccEmails: [{ value: ccRecipient }],
      })
    );

    expect(postedCalls()).toHaveLength(1);
    expect(postedCalls()[0][0]).toBe(`casedata/${municipalityId}/webmessage`);
    expect(postedBody().getAll('recipients[]')).toEqual([]);
    expect(postedBody().getAll('ccRecipients[]')).toEqual([]);
  });
});
