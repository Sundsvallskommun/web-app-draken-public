import { test, expect } from '../fixtures/base.fixture';
import { mockAdmins } from '../case-data/fixtures/mockAdmins';
import { mockMe } from '../case-data/fixtures/mockMe';
import { mockSupportAdminsResponse } from './fixtures/mockSupportAdmins';
import { mockCategories, mockMetaData } from './fixtures/mockMetadata';
import {
  mockEmptySupportErrand,
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
} from './fixtures/mockSupportErrands';
import { mockNotifications } from './fixtures/mockSupportNotifications';

test.describe('Overview support errand', () => {
  test.beforeEach(async ({ page, mockRoute, dismissCookieConsent }) => {
    await mockRoute('**/administrators', mockAdmins, { method: 'GET' });
    await mockRoute('**/me', mockMe, { method: 'GET' });
    await mockRoute('**/featureflags', [], { method: 'GET' });
    await mockRoute('**/supporterrands/2281?page=0*', mockSupportErrands, { method: 'GET' });
    await mockRoute('**/supporterrands/2281?page=1*', mockSupportErrandsEmpty, { method: 'GET' });
    await mockRoute('**/supportmetadata/2281', mockMetaData, { method: 'GET' });
    await mockRoute('**/supportnotifications/2281', mockNotifications, { method: 'GET' });
    await mockRoute('**/users/admins', mockSupportAdminsResponse, { method: 'GET' });
    await page.goto('oversikt/');
    await page.waitForResponse((resp) => resp.url().includes('supporterrands') && resp.status() === 200);
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
    await expect(headerRow.locator('th').nth(3).locator('span').first()).toHaveText('Ärendetyp');
    await expect(headerRow.locator('th').nth(4).locator('span').first()).toHaveText('Inkom via');
    await expect(headerRow.locator('th').nth(5).locator('span').first()).toHaveText('Registrerades');
    await expect(headerRow.locator('th').nth(6).locator('span').first()).toHaveText('Prioritet');
    await expect(headerRow.locator('th').nth(7).locator('span').first()).toHaveText('Registrerad av');
  });

  test('displays the filters', async ({ page }) => {
    await expect(page.locator('[data-cy="show-filters-button"]')).toBeVisible();
    await expect(page.locator('[data-cy="Verksamhet-filter"]')).toBeVisible();
    await expect(page.locator('[data-cy="Ärendekategori-filter"]')).toBeVisible();
    await expect(page.locator('[data-cy="Prioritet-filter"]')).toBeVisible();
    await expect(page.locator('[data-cy="Tidsperiod-filter"]')).toBeVisible();
    await expect(page.locator('[data-cy="Handläggare-filter"]')).toBeVisible();
    await expect(page.locator('[data-cy="Channel-filter"]')).toBeVisible();
  });

  //FILTER
  test('allows filtering', async ({ page, mockRoute }) => {
    await expect(page.locator('[data-cy="show-filters-button"]')).toBeVisible();

    //Verksamhet
    await page.locator('[data-cy="Verksamhet-filter"]').fill('1');
    await page.locator(`[data-cy=Verksamhet-filter-${mockCategories[0].name}]`).click();

    await mockRoute('**/supporterrands/2281?page=0*', mockFilteredCategoryErrands, { method: 'GET' });

    await page.waitForResponse((resp) => resp.url().includes('supporterrands') && resp.status() === 200);
    await expect(page.locator('[data-cy="main-table"] .sk-table-tbody-tr')).toHaveCount(
      mockFilteredCategoryErrands.content.length
    );

    await page.locator('[data-cy="Verksamhet-filter"]').fill('1');
    await page.locator('[aria-label="Rensa verksamhet"]').click();

    await mockRoute('**/supporterrands/2281?page=0*', mockSupportErrands, { method: 'GET' });

    await page.waitForResponse((resp) => resp.url().includes('supporterrands') && resp.status() === 200);
    await expect(page.locator('[data-cy="main-table"] .sk-table-tbody-tr')).toHaveCount(
      mockSupportErrands.content.length
    );

    //Ärendetyp
    await page.locator('[data-cy="Ärendekategori-filter"]').fill('2');
    await page.locator(`[data-cy=Ärendekategori-filter-${mockCategories[0].types[0].name}]`).click();

    await mockRoute('**/supporterrands/2281?page=0*', mockFilteredCategoryErrands, { method: 'GET' });

    await page.waitForResponse((resp) => resp.url().includes('supporterrands') && resp.status() === 200);
    await expect(page.locator('[data-cy="main-table"] .sk-table-tbody-tr')).toHaveCount(
      mockFilteredCategoryErrands.content.length
    );

    await page.locator('[data-cy="Ärendekategori-filter"]').fill('2');
    await page.locator('[aria-label="Rensa ärendetyp"]').click();
    await mockRoute('**/supporterrands/2281?page=0*', mockSupportErrands, { method: 'GET' });
    await page.waitForResponse((resp) => resp.url().includes('supporterrands') && resp.status() === 200);
    await expect(page.locator('[data-cy="main-table"] .sk-table-tbody-tr')).toHaveCount(
      mockSupportErrands.content.length
    );

    //Prioritet
    await page.locator('[data-cy="Prioritet-filter"]').fill('3');
    await page.locator('[data-cy=Prioritet-filter-HIGH]').click();

    await mockRoute('**/supporterrands/2281?page=0*', mockFilteredPrioErrands, { method: 'GET' });

    await page.waitForResponse((resp) => resp.url().includes('supporterrands') && resp.status() === 200);
    await expect(page.locator('[data-cy="main-table"] .sk-table-tbody-tr')).toHaveCount(
      mockFilteredPrioErrands.content.length
    );

    await page.locator('[data-cy="Prioritet-filter"]').fill('3');
    await page.locator('[aria-label="Rensa prioritet"]').click();

    await mockRoute('**/supporterrands/2281?page=0*', mockSupportErrands, { method: 'GET' });
    await page.waitForResponse((resp) => resp.url().includes('supporterrands') && resp.status() === 200);
    await expect(page.locator('[data-cy="main-table"] .sk-table-tbody-tr')).toHaveCount(
      mockSupportErrands.content.length
    );

    //Tidsperiod
    await page.locator('[data-cy="Tidsperiod-filter"]').fill('4');
    await page.locator('[data-cy="validFrom-input"]').fill('2024-05-14');
    await page.locator('[data-cy="validTo-input"]').fill('2024-06-14');
    await page.locator('[data-cy="Tidsperiod-button"]').click();

    await mockRoute('**/supporterrands/2281?page=0*', mockFilterDateErrands, { method: 'GET' });

    await page.waitForResponse((resp) => resp.url().includes('supporterrands') && resp.status() === 200);
    await expect(page.locator('[data-cy="main-table"] .sk-table-tbody-tr')).toHaveCount(
      mockFilterDateErrands.content.length
    );

    await page.locator('[aria-label="Rensa Tidsperiod"]').click();

    await mockRoute('**/supporterrands/2281?page=0*', mockSupportErrands, { method: 'GET' });
    await page.waitForResponse((resp) => resp.url().includes('supporterrands') && resp.status() === 200);
    await expect(page.locator('[data-cy="main-table"] .sk-table-tbody-tr')).toHaveCount(
      mockSupportErrands.content.length
    );

    //Handläggare
    await page.locator('[data-cy="Handläggare-filter"]').fill('5');
    await page.locator(`[data-cy=Handläggare-filter-${mockSupportAdminsResponse.data[1].name}]`).click();

    await mockRoute('**/supporterrands/2281?page=0*', mockFilterAdminErrands, { method: 'GET' });

    await page.waitForResponse((resp) => resp.url().includes('supporterrands') && resp.status() === 200);
    await expect(page.locator('[data-cy="main-table"] .sk-table-tbody-tr')).toHaveCount(
      mockFilterAdminErrands.content.length
    );

    await page.locator('[data-cy="Handläggare-filter"]').fill('5');
    await page.locator('[aria-label="Rensa Handläggare"]').click();

    await mockRoute('**/supporterrands/2281?page=0*', mockSupportErrands, { method: 'GET' });
    await page.waitForResponse((resp) => resp.url().includes('supporterrands') && resp.status() === 200);
    await expect(page.locator('[data-cy="main-table"] .sk-table-tbody-tr')).toHaveCount(
      mockSupportErrands.content.length
    );

    //Channel
    await page.locator('[data-cy="Channel-filter"]').fill('6');
    await page.locator('[data-cy="Channel-filter-CHAT"]').click();

    await mockRoute('**/supporterrands/2281?page=0*', mockFilterChannelErrands, { method: 'GET' });

    await page.waitForResponse((resp) => resp.url().includes('supporterrands') && resp.status() === 200);
    await expect(page.locator('[data-cy="main-table"] .sk-table-tbody-tr')).toHaveCount(
      mockFilterChannelErrands.content.length
    );

    await page.locator('[data-cy="Channel-filter"]').fill('6');
    await page.locator('[aria-label="Rensa Kanal"]').click();

    await mockRoute('**/supporterrands/2281?page=0*', mockSupportErrands, { method: 'GET' });
    await page.waitForResponse((resp) => resp.url().includes('supporterrands') && resp.status() === 200);
    await expect(page.locator('[data-cy="main-table"] .sk-table-tbody-tr')).toHaveCount(
      mockSupportErrands.content.length
    );
  });

  //SIDEBAR DISPLAY
  test('displays sidebar - user, notifications button and errand statuses', async ({ page }) => {
    await expect(page.locator('[data-cy="overview-aside"]')).toBeVisible();
    await expect(page.locator('[data-cy="avatar-aside"]')).toBeVisible();
    await expect(page.locator('[aria-label="Notifieringar"]')).toBeVisible();
    await expect(page.locator(`[aria-label="status-button-${mockMetaData.statuses[0].name}"]`)).toBeVisible();
    await expect(page.locator(`[aria-label="status-button-${mockMetaData.statuses[1].name}"]`)).toBeVisible();
    await expect(page.locator(`[aria-label="status-button-${mockMetaData.statuses[2].name}"]`)).toBeVisible();
    await expect(page.locator(`[aria-label="status-button-${mockMetaData.statuses[3].name}"]`)).toBeVisible();
  });

  //SIDEBAR USE
  test('allows to switch between errand statuses in sidebar', async ({ page, mockRoute }) => {
    await page.locator(`[aria-label="status-button-${mockMetaData.statuses[1].name}"]`).click();
    await mockRoute('**/supporterrands/2281?page=0*', mockOngoingSupportErrands, { method: 'GET' });
    await page.waitForResponse((resp) => resp.url().includes('supporterrands') && resp.status() === 200);
    await expect(page.locator('[data-cy="main-table"] .sk-table-tbody-tr')).toHaveCount(
      mockOngoingSupportErrands.content.length
    );

    await page.locator(`[aria-label="status-button-${mockMetaData.statuses[2].name}"]`).click();
    await mockRoute('**/supporterrands/2281?page=0*', mockSuspendedSupportErrands, { method: 'GET' });
    await page.waitForResponse((resp) => resp.url().includes('supporterrands') && resp.status() === 200);
    await expect(page.locator('[data-cy="main-table"] .sk-table-tbody-tr')).toHaveCount(
      mockSuspendedSupportErrands.content.length
    );

    await page.locator(`[aria-label="status-button-${mockMetaData.statuses[3].name}"]`).click();
    await mockRoute('**/supporterrands/2281?page=0*', mockSolvedSupportErrands, { method: 'GET' });
    await page.waitForResponse((resp) => resp.url().includes('supporterrands') && resp.status() === 200);
    await expect(page.locator('[data-cy="main-table"] .sk-table-tbody-tr')).toHaveCount(
      mockSolvedSupportErrands.content.length
    );

    await page.locator(`[aria-label="status-button-${mockMetaData.statuses[0].name}"]`).click();
    await mockRoute('**/supporterrands/2281?page=0*', mockSupportErrands, { method: 'GET' });
    await page.waitForResponse((resp) => resp.url().includes('supporterrands') && resp.status() === 200);
    await expect(page.locator('[data-cy="main-table"] .sk-table-tbody-tr')).toHaveCount(
      mockSupportErrands.content.length
    );
  });

  //SEARCH
  test('displays search and allows to filter table', async ({ page, mockRoute }) => {
    await page.locator('[data-cy="query-filter"]').fill('kctest2');
    await page.locator('button').filter({ hasText: 'Sök' }).click();
    await mockRoute('**/supporterrands/2281?page=0*', mockFilterAdminErrands, { method: 'GET' });
    await page.waitForResponse((resp) => resp.url().includes('supporterrands') && resp.status() === 200);
    await expect(page.locator('[data-cy="main-table"] .sk-table-tbody-tr')).toContainText('kctest2');

    await page.locator('[data-cy="query-filter"]').clear();
    await page.locator('[data-cy="query-filter"]').fill('search text');
    await page.locator('button').filter({ hasText: 'Sök' }).click();
    await mockRoute('**/supporterrands/2281?page=0*', mockEmptySupportErrand, { method: 'GET' });
    await page.waitForResponse((resp) => resp.url().includes('supporterrands') && resp.status() === 200);
    await expect(page.locator('Caption#errandTableCaption')).toContainText('Det finns inga ärenden');

    await page.locator('[data-cy="query-filter"]').clear();
    await page.locator('button').filter({ hasText: 'Sök' }).click();
    await mockRoute('**/supporterrands/2281?page=0*', mockSupportErrands, { method: 'GET' });
    await page.waitForResponse((resp) => resp.url().includes('supporterrands') && resp.status() === 200);
    await expect(page.locator('[data-cy="main-table"] .sk-table-tbody-tr')).toHaveCount(
      mockSupportErrands.content.length
    );
  });
});
