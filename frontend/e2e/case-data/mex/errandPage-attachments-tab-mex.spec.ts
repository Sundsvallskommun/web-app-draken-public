// NOTE: This test file was DISABLED in Cypress (._cy.ts extension). All tests are skipped.

import { test, expect } from '../../fixtures/base.fixture';
import { mockAttachments } from '../fixtures/mockAttachments';
import { mockHistory } from '../fixtures/mockHistory';
import { mockMexErrand_base } from '../fixtures/mockMexErrand';
import { mockPersonId } from '../fixtures/mockPersonId';
import { mockAdmins } from '../fixtures/mockAdmins';
import { mockMe } from '../fixtures/mockMe';
import { mockMessages } from '../fixtures/mockMessages';
// Inlined to avoid importing React component in Playwright context
const imageMimeTypes = [
  'image/jpeg',
  'image/gif',
  'image/png',
  'image/tiff',
  'image/bmp',
  'image/heic',
  'image/heif',
];
import { mockLeaseAgreement, mockContractAttachment } from '../fixtures/mockContract';
import { mockEstateInfo11, mockEstateInfo12 } from '../fixtures/mockEstateInfo';

test.describe.skip('Errand page attachments tab', () => {
  test.beforeEach(async ({ page, mockRoute, dismissCookieConsent }) => {
    await mockRoute('**/messages/MEX-2024-000280*', mockMessages, { method: 'GET' });
    await mockRoute('**/users/admins', mockAdmins, { method: 'GET' });
    await mockRoute('**/me', mockMe, { method: 'GET' });
    await mockRoute('**/featureflags', [], { method: 'GET' });
    await mockRoute('**/personid', mockPersonId, { method: 'POST' });
    await page.route(/\/errand\/\d*/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockMexErrand_base),
      });
    }); // @getErrandById
    await page.route(/\/errand\/\d+\/attachments$/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockAttachments),
      });
    }); // @getErrandAttachments
    await mockRoute('**/errands/*', { data: 'ok', message: 'ok' }, { method: 'PATCH' }); // @patchErrand
    await mockRoute('**/errand/errandNumber/*', mockMexErrand_base, { method: 'GET' }); // @getErrand
    await mockRoute('**/stakeholders/personNumber', mockMexErrand_base.data.stakeholders, { method: 'POST' });
    await mockRoute(
      '**/contract/2024-01026',
      mockMexErrand_base.data.extraParameters.find((param) => param.key === 'contractId')?.values[0],
      { method: 'GET' }
    ); // @getContract
    await mockRoute('**/errands/*/history', mockHistory, { method: 'GET' }); // @getHistory
    await page.route(/\/errand\/\d+\/messages$/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockMessages),
      });
    });

    await mockRoute('**/contracts/2024-01026', mockLeaseAgreement, { method: 'GET' }); // @getContract
    await mockRoute('**/contracts/2281/2024-01026/attachments/1', mockContractAttachment, { method: 'GET' }); // @getContractAttachment
    await mockRoute('**/estateInfo/**1:1', mockEstateInfo11, { method: 'GET' }); // @getEstateInfo
    await mockRoute('**/estateInfo/**1:2', mockEstateInfo12, { method: 'GET' }); // @getEstateInfo

    await page.goto(`arende/${mockMexErrand_base.data.id}`);
    await page.waitForResponse((resp) => resp.url().includes('/errand/errandNumber/') && resp.status() === 200);
    await dismissCookieConsent();
    const attachmentsTab = page.locator('.sk-tabs-list button').nth(2);
    await expect(attachmentsTab).toHaveText(`Bilagor (${mockAttachments.data.length})`);
    await attachmentsTab.click({ force: true });
  });

  test('shows the correct attachment information', async ({ page }) => {
    await expect(
      page.locator('[data-cy="casedataAttachments-list"] .attachment-item')
    ).toHaveCount(mockAttachments.data.length);
  });

  test('Can handle attachment alternatives', async ({ page, mockRoute }) => {
    for (const attachment of mockAttachments.data) {
      await mockRoute(`**/casedata/2281/errands/101/attachments/${attachment.id}`, attachment, { method: 'GET' }); // @getAttachment
      await mockRoute(`**/casedata/2281/errands/101/attachments/${attachment.id}`, attachment, { method: 'DELETE' }); // @deleteAttachment
      await mockRoute(`**/casedata/2281/errands/*/attachments/${attachment.id}`, attachment, { method: 'PATCH' }); // @patchAttachment
      await mockRoute('**/errand/101*', mockMexErrand_base, { method: 'GET' }); // @getErrandAgain
      await expect(page.locator(`[data-cy="attachment-${attachment.id}"]`)).toBeVisible();

      await page.locator(`[data-cy="attachment-${attachment.id}"] [aria-label="Alternativ"]`).click({ force: true });
      // Can open attachment
      await page.locator(`[data-cy="open-attachment-${attachment.id}"]`).filter({ hasText: 'Öppna' }).click();
      if (imageMimeTypes.find((type) => type === attachment.mimeType)) {
        await page.waitForResponse(
          (resp) => resp.url().includes(`/attachments/${attachment.id}`) && resp.status() === 200
        );
        await expect(page.locator('img')).toBeVisible();
        await page.locator('.modal-close-btn').click();
      }
      await page.locator(`[data-cy="attachment-${attachment.id}"] [aria-label="Alternativ"]`).click({ force: true });
      // Can edit attachment
      await page.locator(`[data-cy="edit-attachment-${attachment.id}"]`).filter({ hasText: 'Ändra' }).click();
      await page.locator('[data-cy="edit-filename-input"]').clear();
      await page.locator('[data-cy="edit-filename-input"]').fill('dokument.pdf');
      await page.locator('select[data-cy="attachmentType"]').selectOption('Förfrågan markköp');
      await page.locator('.sk-modal-footer button.sk-btn-primary').filter({ hasText: 'Spara' }).click();
      await page.waitForResponse(
        (resp) => resp.url().includes(`/attachments/${attachment.id}`) && resp.request().method() === 'PATCH'
      );
      await page.locator(`[data-cy="attachment-${attachment.id}"] [aria-label="Alternativ"]`).click({ force: true });
      // Can delete attachment
      await page.locator(`[data-cy="delete-attachment-${attachment.id}"]`).filter({ hasText: 'Ta bort' }).click();
      await expect(page.locator('.sk-modal-dialog button.sk-btn-secondary').filter({ hasText: 'Nej' })).toBeVisible();
      await page.locator('.sk-modal-dialog button.sk-btn-primary').filter({ hasText: 'Ja' }).click();
      await page.waitForResponse(
        (resp) => resp.url().includes(`/attachments/${attachment.id}`) && resp.request().method() === 'DELETE'
      );
      await page.waitForResponse((resp) => resp.url().includes('/errand/101') && resp.status() === 200);
    }
  });

  test('Can upload attachment/attachments', async ({ page, mockRoute }) => {
    await mockRoute('**/casedata/2281/errands/101/attachments', 'attachment.txt', { method: 'POST' }); // @uploadAttachment
    await mockRoute('**/errand/101*', mockMexErrand_base, { method: 'GET' }); // @getErrandAfterUpload
    await page.locator('[data-cy="add-attachment-button"]').filter({ hasText: 'Ladda upp bilaga' }).click();
    await page.locator('[data-cy="dragdrop-upload"]').getByText('klicka för att bläddra på din enhet').click();
    // if empty file
    await page.locator('input[type=file]').setInputFiles('e2e/case-data/files/empty-attachment.txt');
    await expect(page.locator('.sk-form-error-message')).toHaveText(
      'Bilagan du försöker lägga till är tom. Försök igen.'
    );

    // if wrong format file
    await page.locator('input[type=file]').setInputFiles('e2e/case-data/files/testwrongformat.jfif');
    await expect(page.locator('.sk-form-error-message')).toHaveText('Filtypen stöds inte.');

    // right format and not empty
    await page.locator('input[type=file]').setInputFiles('e2e/case-data/files/attachment.txt');
    await page.locator('select[data-cy="attachmentType"]').selectOption('Förfrågan markköp');
    await page.locator('.sk-modal-footer button.sk-btn-primary').filter({ hasText: 'Ladda upp' }).click();
    await page.waitForResponse(
      (resp) => resp.url().includes('/attachments') && resp.request().method() === 'POST'
    );
    await page.waitForResponse((resp) => resp.url().includes('/errand/101') && resp.status() === 200);
  });
});
