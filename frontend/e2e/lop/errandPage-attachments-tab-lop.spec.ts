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
    // The errand page now nests sub-tabs (e.g. "Ägande") inside the base-info
    // panel, so `.sk-tabs-list button` is no longer positionally stable. Target
    // the top-level "Bilagor" tab by its accessible role/name instead.
    const bilagorTab = page.getByRole('tab', { name: `Bilagor (${mockSupportAttachments.length})` });
    await bilagorTab.click({ force: true });
    await expect(bilagorTab).toHaveText(`Bilagor (${mockSupportAttachments.length})`);
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

      // A success toast from the previous iteration can overlap the options
      // button; dismiss any open toasts before interacting.
      const toastClose = page.locator('#react-toast .sk-snackbar-action');
      while (await toastClose.count()) {
        await toastClose.first().click({ force: true });
        await expect(toastClose.first()).toBeHidden().catch(() => {});
      }

      await page.locator(`[data-cy="attachment-${attachment.id}"] button[aria-label="Alternativ"]`).click();
      await Promise.all([
        page.waitForResponse(
          (resp) => resp.url().includes(`attachments/${attachment.id}`) && resp.request().method() === 'GET'
        ),
        page.locator(`[data-cy="open-attachment-${attachment.id}"]`).filter({ hasText: 'Öppna' }).click(),
      ]);
      if (attachment.mimeType !== 'application/pdf') {
        const previewDialog = page.locator('article.sk-modal-dialog').filter({ has: page.locator('img') });
        await expect(previewDialog.locator('img').first()).toBeVisible();
        await previewDialog.locator('.sk-modal-dialog-close').click();
        // Wait for the preview modal and its overlay to finish their close
        // transition so they no longer intercept pointer events on the options button.
        await expect(previewDialog).toHaveCount(0);
        await expect(page.locator('.sk-modal-overlay')).toHaveCount(0);
      }

      await page.locator(`[data-cy="attachment-${attachment.id}"] button[aria-label="Alternativ"]`).click();
      await page.locator(`[data-cy="delete-attachment-${attachment.id}"]`).filter({ hasText: 'Ta bort' }).click();
      // The delete confirmation is a useConfirm dialog (role=dialog) named "Ta bort?".
      const confirmDialog = page.getByRole('dialog', { name: /Ta bort\?/ }).last();
      await expect(confirmDialog.getByRole('button', { name: 'Nej' })).toBeVisible();
      await Promise.all([
        page.waitForResponse(
          (resp) => resp.url().includes(`attachments/${attachment.id}`) && resp.request().method() === 'DELETE'
        ),
        confirmDialog.getByRole('button', { name: 'Ja' }).click(),
      ]);
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
