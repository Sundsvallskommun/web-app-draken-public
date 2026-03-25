import { test, expect } from '../fixtures/base.fixture';
import { mockAdmins } from '../case-data/fixtures/mockAdmins';
import { mockMe } from '../case-data/fixtures/mockMe';
import { mockAdressResponse, mockPersonIdResponse } from './fixtures/mockAdressResponse';
import { mockMetaData } from './fixtures/mockMetadata';
import { mockSupportAdminsResponse } from './fixtures/mockSupportAdmins';
import {
  mockEmptySupportErrand,
  mockSupportAttachments,
  mockSupportErrand,
  mockSupportMessages,
  mockSupportNotes,
} from './fixtures/mockSupportErrands';

test.describe.skip('Errand page support attachments tab', () => {
  test.beforeEach(async ({ page, mockRoute }) => {
    await mockRoute('**/administrators', mockAdmins, { method: 'GET' });
    await mockRoute('**/users/admins', mockSupportAdminsResponse, { method: 'GET' });
    await mockRoute('**/me', mockMe, { method: 'GET' });
    await mockRoute('**/featureflags', [], { method: 'GET' });
    await mockRoute('**/supporterrands/2281/c9a96dcb-24b1-479b-84cb-2cc0260bb490', mockSupportErrand, {
      method: 'GET',
    });
    await mockRoute('**/supportattachments/2281/errands/*/attachments', mockSupportAttachments, { method: 'GET' });
    await mockRoute('**/supportmessage/2281/errands/*/communication', mockSupportMessages, { method: 'GET' });
    await mockRoute('**/supportnotes/2281/*', mockSupportNotes, { method: 'GET' });
    await mockRoute('**/supportmetadata/2281', mockMetaData, { method: 'GET' });
    await mockRoute('**/personid', mockPersonIdResponse, { method: 'POST' });
    await mockRoute('**/address', mockAdressResponse, { method: 'POST' });
    await mockRoute(`**/supporterrands/2281/${mockEmptySupportErrand.id}`, mockEmptySupportErrand, { method: 'PATCH' });

    await page.goto('arende/c9a96dcb-24b1-479b-84cb-2cc0260bb490');
    await page.waitForResponse((resp) => resp.url().includes('supporterrands') && resp.status() === 200);
    await page.locator('.sk-cookie-consent-btn-wrapper').getByText('Godkänn alla').click();
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
    for (const attachment of mockSupportAttachments) {
      await mockRoute(
        `**/supportattachments/2281/errands/c9a96dcb-24b1-479b-84cb-2cc0260bb490/attachments/${attachment.id}`,
        attachment,
        { method: 'GET' }
      );
      await mockRoute(
        `**/supportattachments/2281/errands/c9a96dcb-24b1-479b-84cb-2cc0260bb490/attachments/${attachment.id}`,
        attachment,
        { method: 'DELETE' }
      );
      await expect(page.locator(`[data-cy="attachment-${attachment.id}"]`)).toBeVisible();

      await page.locator(`[data-cy="attachment-${attachment.id}"] button[aria-label="Alternativ"]`).click();
      const openButton = page.locator(`[data-cy="open-attachment-${attachment.id}"]`);
      await expect(openButton).toBeVisible();
      await openButton.filter({ hasText: 'Öppna' }).click();

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
      if (imageMimeTypes.find((type) => type === attachment.mimeType)) {
        await page.waitForResponse((resp) =>
          resp.url().includes(`supportattachments/2281/errands/c9a96dcb-24b1-479b-84cb-2cc0260bb490/attachments/${attachment.id}`)
        );
        await expect(page.locator('img')).toBeVisible();
        await page.locator('.modal-close-btn').click();
      }
      await page.locator(`[data-cy="attachment-${attachment.id}"] button[aria-label="Alternativ"]`).click();
      const deleteButton = page.locator(`[data-cy="delete-attachment-${attachment.id}"]`);
      await expect(deleteButton).toBeVisible();
      await deleteButton.filter({ hasText: 'Ta bort' }).click();
      await expect(page.locator('.sk-modal-dialog button.sk-btn-secondary').filter({ hasText: 'Nej' })).toBeVisible();
      await page.locator('.sk-modal-dialog button.sk-btn-primary').filter({ hasText: 'Ja' }).click();
    }
  });

  test('Can upload attachment/attachments', async ({ page, mockRoute }) => {
    await mockRoute(
      '**/supportattachments/2281/errands/c9a96dcb-24b1-479b-84cb-2cc0260bb490/attachments',
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
