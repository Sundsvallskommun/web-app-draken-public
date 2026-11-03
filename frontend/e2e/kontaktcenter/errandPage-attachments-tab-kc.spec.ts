import { test, expect } from '../fixtures/base.fixture';
import { mockSupportAttachments, mockSupportErrand } from './fixtures/mockSupportErrands';
import { mockKcErrandPage, mockKcSession } from './blocks/kc-routes';
import { CONFIRM_DIALOG, MODAL_DIALOG } from '../utils/modal';
import { dismissToasts, waitForDialogOpened, waitForModalOverlaysGone } from '../blocks/ui';

test.describe('Errand page support attachments tab', () => {
  test.beforeEach(async ({ page, dismissCookieConsent }) => {
    await mockKcSession(page);
    await mockKcErrandPage(page, mockSupportErrand);

    await Promise.all([
      page.waitForResponse((resp) => resp.url().includes('supporterrands/errandnumber') && resp.status() === 200),
      page.goto(`arende/${mockSupportErrand.errandNumber}`),
    ]);
    await dismissCookieConsent();
    const attachmentsTab = page.locator('.sk-tabs-list button').nth(2);
    await expect(attachmentsTab).toHaveText(`Bilagor (${mockSupportAttachments.length})`);
    await attachmentsTab.click({ force: true });
  });

  test('shows the correct attachment information', async ({ page }) => {
    await expect(page.locator('[data-cy="supportattachments-list"] .attachment-item')).toHaveCount(
      mockSupportAttachments.length
    );
  });

  test('Can handle attachment alternatives', async ({ page, mockRoute }) => {
    const imageMimeTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/bmp',
      'image/svg+xml',
      'image/webp',
      'image/tiff',
    ];
    for (const attachment of mockSupportAttachments) {
      const attachmentUrl = `**/supportattachments/2281/errands/${mockSupportErrand.id}/attachments/${attachment.id}`;
      await mockRoute(attachmentUrl, attachment, { method: 'GET' });
      await mockRoute(attachmentUrl, attachment, { method: 'DELETE' });
      const options = page.locator(`[data-cy="attachment-${attachment.id}"] button[aria-label="Alternativ"]`);
      await expect(page.locator(`[data-cy="attachment-${attachment.id}"]`)).toBeVisible();
      await dismissToasts(page);

      await options.click();
      const openButton = page.locator(`[data-cy="open-attachment-${attachment.id}"]`).filter({ hasText: 'Öppna' });
      await expect(openButton).toBeVisible();

      if (imageMimeTypes.includes(attachment.mimeType)) {
        // Start waiting before the click, or a fast response is missed.
        await Promise.all([
          page.waitForResponse((resp) => resp.url().includes(`/attachments/${attachment.id}`)),
          openButton.click(),
        ]);
        const preview = page.locator(MODAL_DIALOG);
        await waitForDialogOpened(preview);
        await expect(preview.locator('img')).toBeVisible();
        await preview.locator('.sk-modal-dialog-close').click();
        await waitForModalOverlaysGone(page);
      } else {
        await openButton.click();
      }

      await options.click();
      const deleteButton = page.locator(`[data-cy="delete-attachment-${attachment.id}"]`);
      await expect(deleteButton).toBeVisible();
      await deleteButton.filter({ hasText: 'Ta bort' }).click();
      const confirm = page.locator(CONFIRM_DIALOG);
      await waitForDialogOpened(confirm);
      await expect(confirm.locator('button.sk-btn-secondary').filter({ hasText: 'Nej' })).toBeVisible();
      await Promise.all([
        page.waitForResponse(
          (resp) => resp.url().includes(`/attachments/${attachment.id}`) && resp.request().method() === 'DELETE'
        ),
        confirm.locator('button.sk-btn-primary').filter({ hasText: 'Ja' }).click(),
      ]);
      await waitForModalOverlaysGone(page);
    }
  });

  test('Can upload attachment/attachments', async ({ page, mockRoute }) => {
    await mockRoute(
      `**/supportattachments/2281/errands/${mockSupportErrand.id}/attachments`,
      'attachment.txt',
      { method: 'POST' }
    );
    const addButton = page.locator('[data-cy="add-attachment-button"]');
    await expect(addButton).toBeVisible();
    await addButton.filter({ hasText: 'Ladda upp bilaga' }).click();
    const dragdrop = page.locator('[data-cy="dragdrop-upload"]');
    await expect(dragdrop).toBeVisible();
    await dragdrop.filter({ hasText: 'klicka för att bläddra på din enhet' }).click();

    // if empty file
    await page.locator('input[type=file]').setInputFiles('e2e/kontaktcenter/files/empty-attachment.txt');
    await expect(page.locator('.sk-form-error-message')).toHaveText(
      'Bilagan du försöker lägga till är tom. Försök igen.'
    );

    // if wrong format file
    await page.locator('input[type=file]').setInputFiles('e2e/kontaktcenter/files/testwrongformat.jfif');
    await expect(page.locator('.sk-form-error-message')).toHaveText('Filtypen stöds inte.');

    // right format and not empty
    await page.locator('input[type=file]').setInputFiles('e2e/kontaktcenter/files/attachment.txt');
    await page.locator('.sk-modal-footer button.sk-btn-primary').filter({ hasText: 'Ladda upp' }).click();
    await page.waitForResponse((resp) => resp.url().includes('supportattachments') && resp.status() === 200);
  });
});
