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
import { mockStakeholderStatus } from './fixtures/mockStakeholderStatus';

test.describe('Message tab', () => {
  test.beforeEach(async ({ page, mockRoute }) => {
    await page.context().addCookies([
      { name: 'connect.sid', value: 'test-session', domain: 'localhost', path: '/' },
    ]);
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
    await page.goto('arende/KC-00000001');
    await page.waitForResponse((resp) => resp.url().includes('supporterrands') && resp.status() === 200);
    await page.locator('.sk-cookie-consent-btn-wrapper').getByText('Godkänn alla').click();
    await page.getByRole('tab', { name: /Meddelanden/ }).click();
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
    await page.locator('[data-cy="new-message-button"]').click();

    await expect(page.locator('[data-cy="message-channel-radio-button-group"]')).toBeVisible();
    await expect(page.locator('[data-cy="useEmail-radiobutton-true"]')).toBeVisible();
    await page.locator('[data-cy="useSms-radiobutton-true"]').check({ force: true });

    await page.locator('[data-cy="decision-richtext-wrapper"]').first().click();
    await page.keyboard.type('Mock message');

    await page.locator('[data-cy="newPhoneNumber"]').first().clear();
    await page.locator('[data-cy="newPhoneNumber"]').first().type('+46701740635', { delay: 100 });
    await page.locator('[data-cy="newPhoneNumber-button"]').first().click({ force: true });

    const [request] = await Promise.all([
      page.waitForRequest((req) => req.url().includes('supportmessage') && req.method() === 'POST'),
      page.locator('[data-cy="send-message-button"]').first().click(),
    ]);

    const postData = request.postData() ?? '';
    expect(postData).toContain('sms');
    expect(postData).toContain('Mock message');
    expect(postData).toContain('+46701740635');
  });

  test('sends email with attachment', async ({ page }) => {
    await page.locator('[data-cy="new-message-button"]').click();

    await page.locator('[data-cy="decision-richtext-wrapper"]').first().click();
    await page.keyboard.type('Mock message');

    await expect(page.locator('[data-cy="message-channel-radio-button-group"]')).toBeVisible();
    await page.locator('[data-cy="useEmail-radiobutton-true"]').check({ force: true });
    await expect(page.locator('[data-cy="useSms-radiobutton-true"]')).toBeVisible();
    await page.locator('[data-cy="new-email-input"]').first().clear();
    await page.locator('[data-cy="new-email-input"]').first().type('test@example.com', { delay: 100 });
    await page.locator('[data-cy="add-new-email-button"]').first().click({ force: true });

    await page.locator('[data-cy="add-attachment-button"]').filter({ hasText: 'Bifoga fil' }).click();
    await page.getByRole('button', { name: 'Bläddra' }).click();
    await page.locator('input[type=file]').setInputFiles('e2e/kontaktcenter/files/empty-attachment.txt');
    await expect(page.locator('.sk-form-error-message')).toContainText(
      'Bilagan du försöker lägga till är tom. Försök igen.'
    );
    await page.getByRole('button', { name: 'Bläddra' }).click();
    await page.locator('input[type=file]').setInputFiles('e2e/kontaktcenter/files/attachment.txt');
    await page.locator('[data-cy="upload-button"]').filter({ hasText: 'Ladda upp' }).click();

    const [request] = await Promise.all([
      page.waitForRequest((req) => req.url().includes('supportmessage') && req.method() === 'POST'),
      page.locator('[data-cy="send-message-button"]').first().click(),
    ]);

    const postData = request.postData() ?? '';
    expect(postData).toContain('email');
    expect(postData).toContain('Mock message');
    expect(postData).toContain('attachment.txt');
  });
});
