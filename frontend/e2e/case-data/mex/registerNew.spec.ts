import { test, expect } from '../../fixtures/base.fixture';
import { MEXCaseLabel } from '../../../src/casedata/interfaces/case-label';
import { MEXLegacyCaseType } from '../../../src/casedata/interfaces/case-type';
import { mockAttachments } from '../fixtures/mockAttachments';
import { mockErrands_base } from '../fixtures/mockErrands';
import { mockAdmins } from '../fixtures/mockAdmins';
import { mockContractAttachment, mockLeaseAgreement, mockPurchaseAgreement } from '../fixtures/mockContract';
import { mockConversationMessages, mockConversations } from '../fixtures/mockConversations';
import { mockMe } from '../fixtures/mockMe';
import { mockMexErrand_base } from '../fixtures/mockMexErrand';
import { mockNotifications } from '../fixtures/mockNotifications';
import { mockRelations } from '../fixtures/mockRelations';
import { mockJsonSchema } from '../fixtures/mockJsonSchema';

test.describe('Register errand', () => {
  test.beforeEach(async ({ page, mockRoute, dismissCookieConsent }) => {
    await mockRoute('**/users/admins', mockAdmins, { method: 'GET' });
    await mockRoute('**/me', mockMe, { method: 'GET' }); // @mockMe
    await mockRoute('**/featureflags', [], { method: 'GET' });
    await page.route(/2281\/errand\/\d*/, async (route) => {
      if (route.request().method() !== 'GET') { await route.fallback(); return; }
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockMexErrand_base) });
    }); // @getErrandById
    await page.route(/\/errand\/\d+\/attachments$/, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockAttachments) });
    }); // @getErrandAttachments
    await mockRoute('**/contract/2024-01026', mockPurchaseAgreement, { method: 'GET' }); // @getContract
    await mockRoute('**/casedatanotifications/2281', mockNotifications, { method: 'GET' }); // @getNotifications
    await mockRoute('**/sourcerelations/**/**', mockRelations, { method: 'GET' }); // @getSourceRelations
    await mockRoute('**/targetrelations/**/**', mockRelations, { method: 'GET' }); // @getTargetRelations
    await mockRoute('**/namespace/errands/**/communication/conversations', mockConversations, { method: 'GET' }); // @getConversations
    await mockRoute('**/errands/**/communication/conversations/*/messages', mockConversationMessages, { method: 'GET' }); // @getConversationMessages
    await mockRoute('**/contracts/2024-01026', mockLeaseAgreement, { method: 'GET' }); // @getContract
    await mockRoute('**/contracts/2281/2024-01026/attachments/1', mockContractAttachment, { method: 'GET' }); // @getContractAttachment
    await mockRoute('**/schemas/FTErrandAssets/latest', mockJsonSchema, { method: 'GET' }); // @getJsonSchema
    await page.goto('registrera');
    await dismissCookieConsent();
  });

  test('shows correct buttons and input select fields', async ({ page }) => {
    await expect(page.locator('[data-cy="registerErrandHeading"] button').nth(0).filter({ hasText: 'Avbryt' })).toBeVisible();
    await expect(page.locator('[data-cy="registerErrandHeading"] button').nth(1).filter({ hasText: 'Registrera' })).toBeVisible();
    await expect(page.locator('.sk-tabs .sk-tabs-list-item-button').nth(0).filter({ hasText: 'Grunduppgifter' })).toBeVisible();
    await expect(page.locator('[data-cy="channel-input"]')).toBeVisible();
    await expect(page.locator('[data-cy="channel-input"]')).toBeDisabled();
    await expect(page.locator('[data-cy="municipality-input"]')).toBeVisible();
    await expect(page.locator('[data-cy="casetype-input"]')).toBeVisible();
    await expect(page.locator('[data-cy="priority-input"]')).toBeVisible();
    await expect(page.locator('button[data-cy="save-and-continue-button"]').filter({ hasText: 'Registrera' })).toBeVisible();
  });

  test('Manages select input and register', async ({ page, mockRoute }) => {
    await mockRoute('**/errands', mockMexErrand_base, { method: 'POST' }); // @postErrand

    await expect(page.locator('[data-cy="municipality-input"]')).toBeDisabled();

    const legacyKeys = Object.keys(MEXLegacyCaseType);
    const caseLabels = Object.entries(MEXCaseLabel).filter(([key]) => !legacyKeys.includes(key));
    for (const [, value] of caseLabels) {
      await page.locator('[data-cy="casetype-input"]').selectOption(value);
    }

    await page.locator('[data-cy="priority-input"]').selectOption('Hög');
    await page.locator('[data-cy="priority-input"]').selectOption('Medel');
    await page.locator('[data-cy="priority-input"]').selectOption('Låg');

    await page.locator('button[data-cy="save-and-continue-button"]').filter({ hasText: 'Registrera' }).click();

    await page.waitForResponse((resp) => resp.url().includes('/errands') && resp.request().method() === 'POST' && resp.status() === 200);
    await page.waitForResponse((resp) => resp.url().includes('/errand/') && resp.request().method() === 'GET' && resp.status() === 200);
    await page.waitForResponse((resp) => resp.url().includes('/attachments') && resp.status() === 200);

    await page.goto(`arende/${mockMexErrand_base.data.errandNumber}`);
  });

  test('Can cancel the process, going back to overview', async ({ page, mockRoute }) => {
    await mockRoute('**/errands*', mockErrands_base, { method: 'GET' }); // @getErrands

    await expect(page.locator('[data-cy="registerErrandHeading"] button').nth(0).filter({ hasText: 'Avbryt' })).toBeVisible();
    await page.locator('[data-cy="registerErrandHeading"] button').nth(0).filter({ hasText: 'Avbryt' }).click();

    await page.waitForResponse((resp) => resp.url().includes('/errands') && resp.status() === 200);
    await page.goto('oversikt');
  });
});
