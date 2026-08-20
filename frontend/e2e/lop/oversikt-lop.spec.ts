import { test, expect } from '../fixtures/base.fixture';
import { mockAdmins } from '../case-data/fixtures/mockAdmins';
import { mockMe } from '../case-data/fixtures/mockMe';
import { mockSupportAdminsResponse } from './fixtures/mockSupportAdmins';
import { mockCategories, mockMetaData } from './fixtures/mockMetadata';
import {
  mockFilterAdminErrands,
  mockFilterChannelErrands,
  mockFilterDateErrands,
  mockFilteredCategoryErrands,
  mockFilteredPrioErrands,
  mockOngoingSupportErrands,
  mockSuspendedSupportErrands,
  mockSolvedSupportErrands,
  mockSupportErrands,
  mockSupportErrandsEmpty,
  mockCount,
} from './fixtures/mockSupportErrands';
import { mockNotifications } from './fixtures/mockSupportNotifications';
import { mockBillingRecords } from './fixtures/mockBillingRecords';

test.describe('Overview errands lop', () => {
  test.beforeEach(async ({ page, mockRoute, dismissCookieConsent }) => {
    await page.context().addCookies([
      { name: 'connect.sid', value: 'test-session', domain: 'localhost', path: '/' },
    ]);
    await mockRoute('**/administrators', mockAdmins, { method: 'GET' });
    await mockRoute('**/me', mockMe, { method: 'GET' });
    await mockRoute('**/featureflags', [], { method: 'GET' });
    await mockRoute('**/billing/2281/billingrecords**', mockBillingRecords, { method: 'GET' });
    await mockRoute('**/countsupporterrands/**', mockCount, { method: 'GET' });
    await mockRoute('**/supporterrands/2281?page=0*', mockSupportErrands, { method: 'GET' });
    await mockRoute('**/supporterrands/2281?page=1*', mockSupportErrandsEmpty, { method: 'GET' });
    await mockRoute('**/supportmetadata/2281', mockMetaData, { method: 'GET' });
    await mockRoute('**/supportnotifications/2281', mockNotifications, { method: 'GET' });
    await mockRoute('**/users/admins', mockSupportAdminsResponse, { method: 'GET' });

    await page.goto('oversikt/');
    await page.waitForResponse((resp) => resp.url().includes('supporterrands/2281?page=0') && resp.status() === 200);
    await dismissCookieConsent();
  });

  test('displays the logged in users name', async ({ page }) => {
    await expect(page.locator('[data-cy="userinfo"]')).toContainText('My Testsson');
  });

  test('displays the correct number of errands', async ({ page }) => {
    await expect(page.locator('[data-cy="main-table"] .sk-table-tbody-tr')).toHaveCount(
      mockSupportErrands.content.length
    );
  });

  test('displays the correct table header', async ({ page }) => {
    const headerRow = page.locator('[data-cy="main-table"] .sk-table-thead-tr').first();
    await expect(headerRow.locator('th').nth(0).locator('span').first()).toHaveText('Status');
    await expect(headerRow.locator('th').nth(1).locator('span').first()).toHaveText('Senaste aktivitet');
    await expect(headerRow.locator('th').nth(2).locator('span').first()).toHaveText('Verksamhet');
    await expect(headerRow.locator('th').nth(3).locator('span').first()).toHaveText('Ärendekategori');
    await expect(headerRow.locator('th').nth(4).locator('span').first()).toHaveText('Inkom via');
    await expect(headerRow.locator('th').nth(5).locator('span').first()).toHaveText('Registrerades');
    await expect(headerRow.locator('th').nth(6).locator('span').first()).toHaveText('Prioritet');
    await expect(headerRow.locator('th').nth(7).locator('span').first()).toHaveText('Registrerad av');
  });

  test('displays the filters', async ({ page }) => {
    await expect(page.locator('[data-cy="show-filters-button"]')).toBeVisible();
    await expect(page.locator('[data-cy="Verksamhet-filter"]')).toBeVisible();
    await expect(page.locator('[data-cy="Ärendetyp-filter"]')).toBeVisible();
    await expect(page.locator('[data-cy="Prioritet-filter"]')).toBeVisible();
    await expect(page.locator('[data-cy="Tidsperiod-filter"]')).toBeVisible();
    await expect(page.locator('[data-cy="Handläggare-filter"]')).toBeVisible();
    await expect(page.locator('[data-cy="Channel-filter"]')).toBeVisible();
  });

  // FILTER
  test('allows filtering', async ({ page, mockRoute }) => {
    await expect(page.locator('[data-cy="show-filters-button"]')).toBeVisible();

    // The filters are now PopupMenus: open the menu button, then tick a checkbox.
    // Selected filters are shown as removable chips ("Rensa ...") in the tags area.

    // Verksamhet (label category)
    await mockRoute(/\/supporterrands\/2281\?page=0.*labelCategory.*/, mockFilteredCategoryErrands, { method: 'GET' });
    await page.locator('[data-cy="Verksamhet-filter"]').click();
    await page.locator('[data-cy^="Verksamhet-filter-"]').first().click();
    await page.waitForResponse((resp) => resp.url().includes('supporterrands/2281?page=0') && resp.url().includes('labelCategory'));
    await expect(page.locator('[data-cy="main-table"] .sk-table-tbody-tr')).toHaveCount(
      mockFilteredCategoryErrands.content.length
    );

    await mockRoute('**/supporterrands/2281?page=0*', mockSupportErrands, { method: 'GET' });
    await page.keyboard.press('Escape');
    await page.locator('[aria-label="Rensa verksamhet"]').click();
    await page.waitForResponse((resp) => resp.url().includes('supporterrands/2281?page=0'));
    await expect(page.locator('[data-cy="main-table"] .sk-table-tbody-tr')).toHaveCount(
      mockSupportErrands.content.length
    );

    // Ärendekategori (label type)
    await mockRoute(/\/supporterrands\/2281\?page=0.*labelType.*/, mockFilteredCategoryErrands, { method: 'GET' });
    await page.locator('[data-cy="Ärendekategori-filter"]').click();
    await page.locator(`[data-cy="Ärendekategori-filter-${mockCategories[0].types[0].displayName}"]`).click();
    await page.waitForResponse((resp) => resp.url().includes('supporterrands/2281?page=0') && resp.url().includes('labelType'));
    await expect(page.locator('[data-cy="main-table"] .sk-table-tbody-tr')).toHaveCount(
      mockFilteredCategoryErrands.content.length
    );

    await mockRoute('**/supporterrands/2281?page=0*', mockSupportErrands, { method: 'GET' });
    await page.keyboard.press('Escape');
    await page.locator('[aria-label="Rensa ärendetyp"]').first().click();
    await page.waitForResponse((resp) => resp.url().includes('supporterrands/2281?page=0'));
    await expect(page.locator('[data-cy="main-table"] .sk-table-tbody-tr')).toHaveCount(
      mockSupportErrands.content.length
    );

    // Prioritet
    await mockRoute('**/supporterrands/2281?page=0*', mockFilteredPrioErrands, { method: 'GET' });
    await page.locator('[data-cy="Prioritet-filter"]').click();
    await page.locator('[data-cy="Prioritet-filter-HIGH"]').click();
    await page.waitForResponse((resp) => resp.url().includes('supporterrands/2281?page=0'));
    await expect(page.locator('[data-cy="main-table"] .sk-table-tbody-tr')).toHaveCount(
      mockFilteredPrioErrands.content.length
    );

    await mockRoute('**/supporterrands/2281?page=0*', mockSupportErrands, { method: 'GET' });
    await page.keyboard.press('Escape');
    await page.locator('[aria-label="Rensa prioritet"]').click();
    await page.waitForResponse((resp) => resp.url().includes('supporterrands/2281?page=0'));
    await expect(page.locator('[data-cy="main-table"] .sk-table-tbody-tr')).toHaveCount(
      mockSupportErrands.content.length
    );

    // Tidsperiod
    await mockRoute('**/supporterrands/2281?page=0*', mockFilterDateErrands, { method: 'GET' });
    await page.locator('[data-cy="Tidsperiod-filter"]').click();
    await page.locator('[data-cy="validFrom-input"]').fill('2024-05-14');
    await page.locator('[data-cy="validTo-input"]').fill('2024-06-14');
    await page.locator('[data-cy="Tidsperiod-button"]').click();
    await page.waitForResponse((resp) => resp.url().includes('supporterrands/2281?page=0'));
    await expect(page.locator('[data-cy="main-table"] .sk-table-tbody-tr')).toHaveCount(
      mockFilterDateErrands.content.length
    );

    await mockRoute('**/supporterrands/2281?page=0*', mockSupportErrands, { method: 'GET' });
    await page.locator('[aria-label="Rensa Tidsperiod"]').click();
    await page.waitForResponse((resp) => resp.url().includes('supporterrands/2281?page=0'));
    await expect(page.locator('[data-cy="main-table"] .sk-table-tbody-tr')).toHaveCount(
      mockSupportErrands.content.length
    );

    // Handläggare
    await mockRoute('**/supporterrands/2281?page=0*', mockFilterAdminErrands, { method: 'GET' });
    await page.locator('[data-cy="Handläggare-filter"]').click();
    await page.locator(`[data-cy="Handläggare-filter-${mockSupportAdminsResponse.data[1].name}"]`).click();
    await page.waitForResponse((resp) => resp.url().includes('supporterrands/2281?page=0'));
    await expect(page.locator('[data-cy="main-table"] .sk-table-tbody-tr')).toHaveCount(
      mockFilterAdminErrands.content.length
    );

    await mockRoute('**/supporterrands/2281?page=0*', mockSupportErrands, { method: 'GET' });
    await page.keyboard.press('Escape');
    await page.locator('[aria-label="Rensa Handläggare"]').click();
    await page.waitForResponse((resp) => resp.url().includes('supporterrands/2281?page=0'));
    await expect(page.locator('[data-cy="main-table"] .sk-table-tbody-tr')).toHaveCount(
      mockSupportErrands.content.length
    );

    // Channel
    await mockRoute('**/supporterrands/2281?page=0*', mockFilterChannelErrands, { method: 'GET' });
    await page.locator('[data-cy="Channel-filter"]').click();
    await page.locator('[data-cy="Channel-filter-CHAT"]').click();
    await page.waitForResponse((resp) => resp.url().includes('supporterrands/2281?page=0'));
    await expect(page.locator('[data-cy="main-table"] .sk-table-tbody-tr')).toHaveCount(
      mockFilterChannelErrands.content.length
    );

    await mockRoute('**/supporterrands/2281?page=0*', mockSupportErrands, { method: 'GET' });
    await page.keyboard.press('Escape');
    await page.locator('[aria-label="Rensa Kanal"]').click();
    await page.waitForResponse((resp) => resp.url().includes('supporterrands/2281?page=0'));
    await expect(page.locator('[data-cy="main-table"] .sk-table-tbody-tr')).toHaveCount(
      mockSupportErrands.content.length
    );
  });

  // SIDEBAR DISPLAY
  test('displays sidebar - user, notifications button and errand statuses', async ({ page }) => {
    await expect(page.locator('[data-cy="overview-aside"]')).toBeVisible();
    await expect(page.locator('[data-cy="avatar-aside"]')).toBeVisible();
    await expect(page.locator('[aria-label="Notifieringar"]')).toBeVisible();
    await expect(page.locator('[aria-label="status-button-ASSIGNED"]')).toBeVisible();
    await expect(page.locator('[aria-label="status-button-NEW"]')).toBeVisible();
    await expect(page.locator('[aria-label="status-button-ONGOING"]')).toBeVisible();
    await expect(page.locator('[aria-label="status-button-SOLVED"]')).toBeVisible();
    await expect(page.locator('[aria-label="status-button-SUSPENDED"]')).toBeVisible();
  });

  // SIDEBAR USE
  test('allows to switch between errand statuses in sidebar', async ({ page, mockRoute }) => {
    // Register each status mock before clicking, otherwise the request fires
    // against the previously-registered mock and returns the wrong row count.
    await mockRoute('**/supporterrands/2281?page=0*', mockOngoingSupportErrands, { method: 'GET' });
    await Promise.all([
      page.waitForResponse((resp) => resp.url().includes('supporterrands/2281?page=0')),
      page.locator('[aria-label="status-button-ONGOING"]').click(),
    ]);
    await expect(page.locator('[data-cy="main-table"] .sk-table-tbody-tr')).toHaveCount(
      mockOngoingSupportErrands.content.length
    );

    await mockRoute('**/supporterrands/2281?page=0*', mockSuspendedSupportErrands, { method: 'GET' });
    await Promise.all([
      page.waitForResponse((resp) => resp.url().includes('supporterrands/2281?page=0')),
      page.locator('[aria-label="status-button-SUSPENDED"]').click(),
    ]);
    await expect(page.locator('[data-cy="main-table"] .sk-table-tbody-tr')).toHaveCount(
      mockSuspendedSupportErrands.content.length
    );

    await mockRoute('**/supporterrands/2281?page=0*', mockSolvedSupportErrands, { method: 'GET' });
    await Promise.all([
      page.waitForResponse((resp) => resp.url().includes('supporterrands/2281?page=0')),
      page.locator('[aria-label="status-button-SOLVED"]').click(),
    ]);
    await expect(page.locator('[data-cy="main-table"] .sk-table-tbody-tr')).toHaveCount(
      mockSolvedSupportErrands.content.length
    );

    await mockRoute('**/supporterrands/2281?page=0*', mockSupportErrands, { method: 'GET' });
    await Promise.all([
      page.waitForResponse((resp) => resp.url().includes('supporterrands/2281?page=0')),
      page.locator('[aria-label="status-button-NEW"]').click(),
    ]);
    await expect(page.locator('[data-cy="main-table"] .sk-table-tbody-tr')).toHaveCount(
      mockSupportErrands.content.length
    );
  });

  // SEARCH
  test('displays search and allows to filter table', async ({ page, mockRoute }) => {
    await page.locator('[data-cy="query-filter"]').fill('kctest2');
    await mockRoute('**/supporterrands/2281?page=0*', mockFilterAdminErrands, { method: 'GET' });
    await page.locator('[data-cy="query-filter"]').press('Enter');
    await page.waitForResponse((resp) => resp.url().includes('supporterrands/2281?page=0'));
    await expect(page.locator('[data-cy="main-table"] .sk-table-tbody-tr').filter({ hasText: 'kctest2' }).first()).toBeVisible();

    await page.locator('[data-cy="query-filter"]').clear();
    await page.locator('[data-cy="query-filter"]').fill('search text');
    await mockRoute('**/supporterrands/2281?page=0*', mockSupportErrandsEmpty, { method: 'GET' });
    await page.locator('[data-cy="query-filter"]').press('Enter');
    await page.waitForResponse((resp) => resp.url().includes('supporterrands/2281?page=0'));
    await expect(page.locator('Caption#errandTableCaption')).toContainText('Det finns inga ärenden');

    await mockRoute('**/supporterrands/2281?page=0*', mockSupportErrands, { method: 'GET' });
    await page.locator('[data-cy="query-filter"]').fill('');
    await page.locator('[data-cy="query-filter"]').press('Enter');
    await page.waitForResponse((resp) => resp.url().includes('supporterrands/2281?page=0'));
    await expect(page.locator('[data-cy="main-table"] .sk-table-tbody-tr')).toHaveCount(
      mockSupportErrands.content.length
    );
  });
});
