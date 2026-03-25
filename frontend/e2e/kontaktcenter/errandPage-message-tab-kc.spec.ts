import { test, expect } from '../fixtures/base.fixture';
import { mockAdmins } from '../case-data/fixtures/mockAdmins';
import { mockMe } from '../case-data/fixtures/mockMe';
import { mockMetaData } from './fixtures/mockMetadata';
import { mockSupportAdminsResponse } from './fixtures/mockSupportAdmins';
import {
  mockSupportAttachments,
  mockSupportErrand,
  mockSupportErrandCommunication,
  mockSupportNotes,
} from './fixtures/mockSupportErrands';
//TODO:Update mockdata
import { mockConversationMessages, mockConversations } from '../lop/fixtures/mockConversations';
import { mockRelations } from '../lop/fixtures/mockRelations';
import { goToMessageTab, sendEmailWithAttachment, sendSmsMessage } from '../utils/messages';
import { mockStakeholderStatus } from './fixtures/mockStakeholderStatus';

test.describe('Message tab', () => {
  test.beforeEach(async ({ page, mockRoute }) => {
    await mockRoute('**/administrators', mockAdmins, { method: 'GET' });
    await mockRoute('**/users/admins', mockSupportAdminsResponse, { method: 'GET' });
    await mockRoute('**/me', mockMe, { method: 'GET' });
    await mockRoute('**/featureflags', [], { method: 'GET' });
    await mockRoute('**/supporterrands/2281/c9a96dcb-24b1-479b-84cb-2cc0260bb490', mockSupportErrand, {
      method: 'GET',
    });
    await mockRoute(`**/supporterrands/errandnumber/${mockSupportErrand.errandNumber}`, mockSupportErrand, {
      method: 'GET',
    });
    await mockRoute('**/supportmetadata/2281', mockMetaData, { method: 'GET' });
    await mockRoute('**/supportnotes/2281/*', mockSupportNotes, { method: 'GET' });
    await mockRoute('**/supportattachments/2281/errands/*/attachments', mockSupportAttachments, { method: 'GET' });
    await mockRoute('**/supportmessage/2281/errands/*/communication', mockSupportErrandCommunication, {
      method: 'GET',
    });
    await mockRoute(
      '**/supportmessage/2281/c9a96dcb-24b1-479b-84cb-2cc0260bb490',
      mockSupportErrandCommunication,
      { method: 'POST' }
    );
    await mockRoute('**/sourcerelations/**/**', mockRelations, { method: 'GET' });
    await mockRoute('**/targetrelations/**/**', mockRelations, { method: 'GET' });
    await mockRoute('**/party/*/statuses', mockStakeholderStatus, { method: 'GET' });
    await mockRoute('**/namespace/errands/**/communication/conversations', mockConversations, { method: 'GET' });
    await mockRoute('**/errands/**/communication/conversations/*/messages', mockConversationMessages, {
      method: 'GET',
    });
    await goToMessageTab(page);
  });

  test('views messages in inbox', async ({ page, mockRoute }) => {
    await mockRoute(
      '**/supportmessage/2281/errands/c9a96dcb-24b1-479b-84cb-2cc0260bb490/communication/*/viewed/true',
      mockSupportErrandCommunication,
      { method: 'PUT' }
    );

    await expect(page.locator('[data-cy="message-container"] .sk-avatar')).toHaveCount(
      mockSupportErrandCommunication.length + 2 * mockConversationMessages.data.length
    );

    for (const communication of mockSupportErrandCommunication) {
      await expect(page.locator(`[data-cy="message-${communication.communicationID}"]`)).toBeVisible();
      await page.locator(`[data-cy="message-${communication.communicationID}"] button.sk-btn-ghost svg`).click();

      await page.waitForResponse((resp) =>
        resp.url().includes('supportmessage/2281/errands/c9a96dcb-24b1-479b-84cb-2cc0260bb490/communication') &&
        resp.url().includes('viewed/true')
      );

      if (communication.communicationAttachments.length !== 0) {
        for (const a of communication.communicationAttachments) {
          const attachmentItem = page.locator(
            `div.message-${communication.communicationID} ul button[role="listitem"]`
          );
          await expect(attachmentItem).toBeVisible();
          await expect(attachmentItem).toContainText(a.fileName);
        }
      }
    }
  });

  test('sends sms', async ({ page }) => {
    await sendSmsMessage(page);
  });

  test('sends email with attachment', async ({ page }) => {
    await sendEmailWithAttachment(page);
  });
});
