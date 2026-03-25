import { test, expect } from '../fixtures/base.fixture';
import { mockAdmins } from '../case-data/fixtures/mockAdmins';
import { mockMe } from '../case-data/fixtures/mockMe';
import { goToMessageTab, sendEmailWithAttachment, sendSmsMessage } from '../utils/messages';
import { mockConversationMessages, mockConversations } from './fixtures/mockConversations';
import { mockMetaData } from './fixtures/mockMetadata';
import { mockRelations } from './fixtures/mockRelations';
import { mockSupportAdminsResponse } from './fixtures/mockSupportAdmins';
import {
  mockMissingRootMessage,
  mockSupportAttachments,
  mockSupportErrand,
  mockSupportErrandCommunication,
  mockSupportNotes,
} from './fixtures/mockSupportErrands';

test.describe('Message tab', () => {
  test.beforeEach(async ({ page, mockRoute }) => {
    await mockRoute('**/administrators', mockAdmins, { method: 'GET' });
    await mockRoute('**/users/admins', mockSupportAdminsResponse, { method: 'GET' });
    await mockRoute('**/me', mockMe, { method: 'GET' });
    await mockRoute('**/featureflags', [], { method: 'GET' });
    await mockRoute('**/supporterrands/2281/c9a96dcb-24b1-479b-84cb-2cc0260bb490', mockSupportErrand, { method: 'GET' });
    await mockRoute(`**/supporterrands/errandnumber/${mockSupportErrand.errandNumber}`, mockSupportErrand, { method: 'GET' });
    await mockRoute('**/supportmetadata/2281', mockMetaData, { method: 'GET' });
    await mockRoute('**/supportnotes/2281/*', mockSupportNotes, { method: 'GET' });
    await mockRoute('**/supportattachments/2281/errands/*/attachments', mockSupportAttachments, { method: 'GET' });
    await mockRoute('**/supportmessage/2281/errands/*/communication', mockSupportErrandCommunication, { method: 'GET' });
    await mockRoute(
      `**/supportmessage/2281/c9a96dcb-24b1-479b-84cb-2cc0260bb490`,
      mockSupportErrandCommunication,
      { method: 'POST' }
    );
    await mockRoute('**/sourcerelations/**/**', mockRelations, { method: 'GET' });
    await mockRoute('**/targetrelations/**/**', mockRelations, { method: 'GET' });
    await mockRoute('**/namespace/errands/**/communication/conversations', mockConversations, { method: 'GET' });
    await mockRoute('**/errands/**/communication/conversations/*/messages', mockConversationMessages, { method: 'GET' });
  });

  test('views messages in inbox', async ({ page, mockRoute }) => {
    await mockRoute(
      `**/supportmessage/2281/errands/${mockSupportErrand.id}/communication/*/viewed/true`,
      mockSupportErrandCommunication,
      { method: 'PUT' }
    );

    await goToMessageTab(page, mockSupportErrand.errandNumber);

    await expect(page.locator('[data-cy="message-container"] .sk-avatar')).toHaveCount(
      mockSupportErrandCommunication.length + 2 * mockConversationMessages.data.length
    );

    for (const communication of mockSupportErrandCommunication) {
      await expect(page.locator(`[data-cy="message-${communication.communicationID}"]`)).toBeVisible();
      await page.locator(`[data-cy="message-${communication.communicationID}"] button.sk-btn-ghost svg`).click();

      await page.waitForResponse(
        (resp) => resp.url().includes('viewed/true') && resp.request().method() === 'PUT'
      );

      if (communication.communicationAttachments.length !== 0) {
        for (const a of communication.communicationAttachments) {
          await expect(
            page.locator(`div.message-${communication.communicationID} ul button[role="listitem"]`).filter({ hasText: a.fileName })
          ).toBeVisible();
        }
      }
    }
  });

  test('displays dummy message when root is missing', async ({ page, mockRoute, dismissCookieConsent }) => {
    await mockRoute('**/supportmessage/2281/errands/*/communication', mockMissingRootMessage, { method: 'GET' });
    await mockRoute(
      `**/supportmessage/2281/errands/${mockSupportErrand.id}/communication/*/viewed/true`,
      mockMissingRootMessage,
      { method: 'PUT' }
    );

    await page.goto(`arende/${mockSupportErrand.errandNumber}`);
    await page.waitForResponse((resp) => resp.url().includes('supportmessage') && resp.url().includes('communication') && resp.status() === 200);
    await dismissCookieConsent();
    await page.getByRole('button', { name: 'Meddelanden' }).click();

    await expect(page.locator('[data-cy="message-container"] .sk-avatar')).toHaveCount(
      mockMissingRootMessage.length + 1 + 2 * mockConversationMessages.data.length
    );

    await expect(page.locator('p').filter({ hasText: 'Meddelande har vidarebefordrats' })).toBeVisible();

    for (const communication of mockMissingRootMessage) {
      await page.locator(`[data-cy="message-${communication.communicationID}"]`).click();
      const closeWrapper = page.locator('[data-cy="close-message-wrapper"]').first();
      await closeWrapper.locator('[data-cy="close-message-wrapper-icon"]').click({ force: true });
    }
  });

  test('sends sms', async ({ page }) => {
    await goToMessageTab(page, mockSupportErrand.errandNumber);
    await sendSmsMessage(page);
  });

  test('sends email with attachment', async ({ page }) => {
    await goToMessageTab(page, mockSupportErrand.errandNumber);
    await sendEmailWithAttachment(page);
  });
});
