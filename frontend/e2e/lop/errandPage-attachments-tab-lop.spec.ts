import { test, expect } from '../fixtures/base.fixture';
import { mockAdmins } from '../case-data/fixtures/mockAdmins';
import { mockMe } from '../case-data/fixtures/mockMe';
import { mockAdressResponse, mockPersonIdResponse } from './fixtures/mockAdressResponse';
import { mockConversationMessages, mockConversations } from './fixtures/mockConversations';
import { mockMetaData } from './fixtures/mockMetadata';
import { mockRelations } from './fixtures/mockRelations';
import { mockSupportAdminsResponse } from './fixtures/mockSupportAdmins';
import {
  mockEmptySupportErrand,
  mockSupportAttachments,
  mockSupportErrand,
  mockSupportMessages,
  mockSupportNotes,
} from './fixtures/mockSupportErrands';

test.describe('Errand page support attachments tab', () => {
  test.beforeEach(async ({ page, mockRoute, dismissCookieConsent }) => {
    await mockRoute('**/administrators', mockAdmins, { method: 'GET' });
    await mockRoute('**/users/admins', mockSupportAdminsResponse, { method: 'GET' });
    await mockRoute('**/me', mockMe, { method: 'GET' });
    await mockRoute('**/featureflags', [], { method: 'GET' });
    await mockRoute('**/supporterrands/2281/c9a96dcb-24b1-479b-84cb-2cc0260bb490', mockSupportErrand, { method: 'GET' });
    await mockRoute(`**/supporterrands/errandnumber/${mockSupportErrand.errandNumber}`, mockSupportErrand, { method: 'GET' });
    await mockRoute('**/supportattachments/2281/errands/*/attachments', mockSupportAttachments, { method: 'GET' });
    await mockRoute('**/supportmessage/2281/errands/*/communication', mockSupportMessages, { method: 'GET' });
    await mockRoute('**/supportnotes/2281/*', mockSupportNotes, { method: 'GET' });
    await mockRoute('**/supportmetadata/2281', mockMetaData, { method: 'GET' });
    await mockRoute('**/personid', mockPersonIdResponse, { method: 'POST' });
    await mockRoute('**/address', mockAdressResponse, { method: 'POST' });
    await mockRoute(`**/supporterrands/2281/${mockEmptySupportErrand.id}`, mockEmptySupportErrand, { method: 'PATCH' });
    await mockRoute('**/sourcerelations/**/**', mockRelations, { method: 'GET' });
    await mockRoute('**/targetrelations/**/**', mockRelations, { method: 'GET' });
    await mockRoute('**/namespace/errands/**/communication/conversations', mockConversations, { method: 'GET' });
    await mockRoute('**/errands/**/communication/conversations/*/messages', mockConversationMessages, { method: 'GET' });

    await page.goto(`arende/${mockSupportErrand.errandNumber}`);
    await page.waitForResponse((resp) => resp.url().includes('supporterrands/errandnumber') && resp.status() === 200);
    await dismissCookieConsent();
    await page.locator('.sk-tabs-list button').nth(3).click({ force: true });
    await expect(page.locator('.sk-tabs-list button').nth(3)).toHaveText(`Bilagor (${mockSupportAttachments.length})`);
  });

  test('shows the correct attachment information', async ({ page }) => {
    await expect(page.locator('[data-cy="supportattachments-list"] .attachment-item')).toHaveCount(
      mockSupportAttachments.length
    );
  });

  test('Can handle attachment alternatives', async ({ page, mockRoute }) => {
    for (const attachment of mockSupportAttachments) {
      await mockRoute(
        `**/supportattachments/2281/errands/${mockSupportErrand.id}/attachments/${attachment.id}`,
        attachment,
        { method: 'GET' }
      );
      await mockRoute(
        `**/supportattachments/2281/errands/${mockSupportErrand.id}/attachments/${attachment.id}`,
        attachment,
        { method: 'DELETE' }
      );
      await expect(page.locator(`[data-cy="attachment-${attachment.id}"]`)).toBeVisible();

      await page.locator(`[data-cy="attachment-${attachment.id}"] button[aria-label="Alternativ"]`).click();
      await page.locator(`[data-cy="open-attachment-${attachment.id}"]`).filter({ hasText: 'Öppna' }).click();
      await page.waitForResponse(
        (resp) => resp.url().includes(`attachments/${attachment.id}`) && resp.request().method() === 'GET'
      );
      if (attachment.mimeType !== 'application/pdf') {
        await expect(page.locator('img')).toBeVisible();
        await page.locator('.sk-modal-dialog-close').click();
      }

      await page.locator(`[data-cy="attachment-${attachment.id}"] button[aria-label="Alternativ"]`).click();
      await page.locator(`[data-cy="delete-attachment-${attachment.id}"]`).filter({ hasText: 'Ta bort' }).click();
      await expect(page.locator('.sk-modal-dialog button.sk-btn-secondary').filter({ hasText: 'Nej' })).toBeVisible();
      await page.locator('.sk-modal-dialog button.sk-btn-primary').filter({ hasText: 'Ja' }).click();
    }
  });

  test('Can upload attachment/attachments', async ({ page, mockRoute }) => {
    await mockRoute(
      `**/supportattachments/2281/errands/${mockSupportErrand.id}/attachments`,
      'attachment.txt',
      { method: 'POST' }
    );
    await page.locator('[data-cy="add-attachment-button"]').filter({ hasText: 'Ladda upp bilaga' }).click();
    await expect(page.locator('[data-cy="dragdrop-upload"]')).toBeVisible();
    await page.locator('[data-cy="dragdrop-upload"]').click();
    // if empty file
    await page.locator('input[type=file]').setInputFiles('e2e/lop/files/empty-attachment.txt');
    await expect(page.locator('.sk-form-error-message')).toContainText(
      'Bilagan du försöker lägga till är tom. Försök igen.'
    );

    // if wrong format file
    await page.locator('input[type=file]').setInputFiles('e2e/lop/files/testwrongformat.jfif');
    await expect(page.locator('.sk-form-error-message')).toContainText('Filtypen stöds inte.');

    // right format and not empty
    await page.locator('input[type=file]').setInputFiles('e2e/lop/files/attachment.txt');
    await page.locator('.sk-modal-footer button.sk-btn-primary').filter({ hasText: 'Ladda upp' }).click();
    await page.waitForResponse(
      (resp) => resp.url().includes('supportattachments') && resp.request().method() === 'POST'
    );
  });
});
