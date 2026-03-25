import { test, expect } from '../../fixtures/base.fixture';
import { mockAttachmentsPT } from '../fixtures/mockAttachments';
import { mockHistory } from '../fixtures/mockHistory';
import { mockPersonId } from '../fixtures/mockPersonId';
import { mockAdmins } from '../fixtures/mockAdmins';
import { mockAsset } from '../fixtures/mockAsset';
import { mockConversationMessages, mockConversations } from '../fixtures/mockConversations';
import { mockMe } from '../fixtures/mockMe';
import { mockMessages } from '../fixtures/mockMessages';
import { mockPTErrand_base } from '../fixtures/mockPtErrand';
import { mockRelations } from '../fixtures/mockRelations';

const tableHeaderColumns: Record<number, string> = {
  0: 'Typ',
  1: 'Kortnummer',
  2: 'Status',
  3: 'Ärendenummer',
  4: 'Beslutad',
  5: 'Giltighetstid',
};

test.describe('Errand page assets tab', () => {
  test.beforeEach(async ({ page, mockRoute, dismissCookieConsent }) => {
    await mockRoute('**/schemas/*/latest', { data: { id: 'mock-schema-id', value: {} }, message: 'success' });
    await mockRoute('**/schemas/*/ui-schema', { data: { id: 'mock-ui-schema-id', value: {} }, message: 'success' });
    await mockRoute('**/users/admins', mockAdmins);
    await mockRoute('**/me', mockMe);
    await mockRoute('**/featureflags', []);
    await mockRoute('**/personid', mockPersonId, { method: 'POST' });
    await page.route(/\/errand\/\d*/, async (route) => {
      if (route.request().method() !== 'GET') {
        await route.fallback();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockPTErrand_base),
      });
    });
    await page.route(/\/errand\/\d+\/attachments$/, async (route) => {
      if (route.request().method() !== 'GET') {
        await route.fallback();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockAttachmentsPT),
      });
    });
    await mockRoute('**/errands/*', { data: 'ok', message: 'ok' }, { method: 'PATCH' });
    await mockRoute('**/errand/errandNumber/*', mockPTErrand_base);
    await mockRoute('**/stakeholders/personNumber', mockPTErrand_base.data.stakeholders, { method: 'POST' });
    await mockRoute('**/assets?partyId=aaaaaaa-bbbb-aaaa-bbbb-aaaabbbbcccc&type=PARKINGPERMIT', mockAsset);
    await mockRoute(
      '**/assets?municipalityId=2281&partyId=aaaaaaa-bbbb-aaaa-bbbb-aaaabbbbcccc&assetId=PRH-2022-000019&type=FTErrandAssets',
      {}
    );

    await mockRoute('**/messages/*', mockMessages);
    await mockRoute('**/messages', mockMessages, { method: 'POST' });
    await mockRoute('**/errands/*/history', mockHistory);

    await mockRoute('**/contracts/2024-01026', mockPTErrand_base);

    await page.route(/\/errand\/\d+\/messages$/, async (route) => {
      if (route.request().method() !== 'GET') {
        await route.fallback();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockMessages),
      });
    });

    await mockRoute('**/sourcerelations/**/**', mockRelations);
    await mockRoute('**/targetrelations/**/**', mockRelations);
    await mockRoute('**/namespace/errands/**/communication/conversations', mockConversations);
    await mockRoute('**/errands/**/communication/conversations/*/messages', mockConversationMessages);
    await mockRoute('**/errands/**/extraparameters', {}, { method: 'PATCH' });

    await page.goto(`arende/${mockPTErrand_base.data.errandNumber}`);
    await page.waitForResponse((resp) => resp.url().includes('/errand/errandNumber/') && resp.status() === 200);
    await dismissCookieConsent();
    const assetsTab = page.locator('.sk-tabs-list button').nth(4);
    await expect(assetsTab).toHaveText(`Tillstånd & tjänster (${mockAsset.data.length})`);
    await assetsTab.click({ force: true });
  });

  test('shows the correct table headers and assets', async ({ page }) => {
    await expect(page.locator('[data-cy="assets-table"]')).toBeVisible();
    await expect(page.locator('.sk-table-sortbutton').filter({ hasText: tableHeaderColumns[0] })).toBeVisible();
    await expect(page.locator('.sk-table-sortbutton').filter({ hasText: tableHeaderColumns[1] })).toBeVisible();
    await expect(page.locator('.sk-table-sortbutton').filter({ hasText: tableHeaderColumns[2] })).toBeVisible();
    await expect(page.locator('.sk-table-sortbutton').filter({ hasText: tableHeaderColumns[3] })).toBeVisible();
    await expect(page.locator('.sk-table-sortbutton').filter({ hasText: tableHeaderColumns[4] })).toBeVisible();
    await expect(page.locator('.sk-table-sortbutton').filter({ hasText: tableHeaderColumns[5] })).toBeVisible();

    await expect(page.locator('[data-cy="table-column-type"]').locator('strong')).toContainText('P-tillstånd');
    await expect(page.locator('[data-cy="table-column-assetId"]').locator('span')).toContainText('133773');
    await expect(page.locator('[data-cy="table-column-status"]').locator('span')).toContainText('Aktivt');
    await expect(page.locator('[data-cy="table-column-errandNumber"]').locator('span')).toContainText(
      'PRH-2023-000283'
    );
    await expect(page.locator('[data-cy="table-column-issued"]').locator('span')).toContainText('2023-01-01');
    const validToCol = page.locator('[data-cy="table-column-validTo"]');
    await expect(validToCol).toContainText('2023-01-01');
    await expect(validToCol).toContainText('2023');
  });
});
