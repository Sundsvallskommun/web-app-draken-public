import { test, expect } from '../../fixtures/base.fixture';
import { mockNotifications } from '../../kontaktcenter/fixtures/mockSupportNotifications';
import { CaseLabels } from '../../../src/casedata/interfaces/case-label';
import { ErrandStatus } from '../../../src/casedata/interfaces/errand-status';
import { appConfig } from '../../../src/config/appconfig';
import { mockAdmins } from '../fixtures/mockAdmins';
import { mockContractAttachment, mockLeaseAgreement } from '../fixtures/mockContract';
import { emptyMockErrands, mockErrands_base, mockFilterErrandsByProperty } from '../fixtures/mockErrands';
import { mockMe } from '../fixtures/mockMe';

test.describe('Overview page', () => {
  test.beforeEach(async ({ page, mockRoute, dismissCookieConsent }) => {
    await mockRoute('**/users/admins', mockAdmins, { method: 'GET' });
    await mockRoute('**/me', mockMe, { method: 'GET' });
    await mockRoute('**/featureflags', [], { method: 'GET' });
    await mockRoute('**/errands*', mockErrands_base, { method: 'GET' }); // @getErrands
    await mockRoute('**/casedatanotifications/2281', mockNotifications, { method: 'GET' }); // @getNotifications
    await mockRoute('**/contracts/2024-01026', mockLeaseAgreement, { method: 'GET' }); // @getContract
    await mockRoute('**/contracts/2281/2024-01026/attachments/1', mockContractAttachment, { method: 'GET' }); // @getContractAttachment
    await page.goto('oversikt');
    await page.waitForResponse((resp) => resp.url().includes('/errands') && resp.status() === 200);
    await dismissCookieConsent();
  });

  test('displays the logged in users initials', async ({ page }) => {
    const initials = 'MT';
    await expect(page.locator('[data-cy=avatar-aside]').filter({ hasText: initials })).toBeVisible();
  });

  test('displays table data', async ({ page }) => {
    await expect(page.locator('[data-cy="main-casedata-table"] .sk-table-tbody-tr')).toHaveCount(
      mockErrands_base.data.content.length
    );
  });

  test('displays the correct table header', async ({ page }) => {
    const headerRow = page.locator('[data-cy="main-casedata-table"] .sk-table-thead-tr').first();
    await expect(headerRow.locator('th').nth(0).locator('span').first()).toHaveText('Fast.bet');
    await expect(headerRow.locator('th').nth(1).locator('span').first()).toHaveText('Senaste aktivitet');
    await expect(headerRow.locator('th').nth(2).locator('span').first()).toHaveText('Ärendetyp');
    await expect(headerRow.locator('th').nth(3).locator('span').first()).toHaveText('Ärendemening');
    await expect(headerRow.locator('th').nth(4).locator('span').first()).toHaveText('Prio');
    await expect(headerRow.locator('th').nth(5).locator('span').first()).toHaveText('Registrerat');
    await expect(headerRow.locator('th').nth(6).locator('span').first()).toHaveText('Handläggare');
    await expect(headerRow.locator('th').nth(7).locator('span').first()).toHaveText('Status');
  });

  test('displays the filters', async ({ page }) => {
    await expect(page.locator('[data-cy="Show-filters-button"]')).toBeVisible();
    await expect(page.locator('[data-cy="Fastighetsbeteckning-filter"]')).toBeVisible();
    await expect(page.locator('[data-cy="Ärendetyp-filter"]')).toBeVisible();
    await expect(page.locator('[data-cy="Prioritet-filter"]')).toBeVisible();
    await expect(page.locator('[data-cy="Tidsperiod-filter"]')).toBeVisible();
    await page.locator('[data-cy="Tidsperiod-filter"]').click();
    await expect(page.locator('[data-cy="casedata-validFrom-input"]')).toBeVisible();
    await expect(page.locator('[data-cy="casedata-validTo-input"]')).toBeVisible();
    await expect(page.locator('[data-cy="Handläggare-filter"]')).toBeVisible();
  });

  test('allows filtering by a property designation', async ({ page, mockRoute }) => {
    const query = 'BALDER 1';
    await expect(page.locator('[data-cy="Show-filters-button"]')).toBeVisible();
    await page.locator('[data-cy="Fastighetsbeteckning-filter"]').click();
    await expect(page.locator('[data-cy="Fastighetsbeteckning-input"]')).toBeVisible();
    await page.locator('[data-cy="Fastighetsbeteckning-input"]').fill(query);
    await page.locator('[data-cy="Fastighetsbeteckning-input"]').locator('..').locator('button').filter({ hasText: 'Lägg till' }).click();

    await mockRoute('**/errands?*', mockFilterErrandsByProperty, { method: 'GET' }); // @getErrandsByProperty
    await page.waitForResponse((resp) => resp.url().includes('/errands') && resp.status() === 200);
    await expect(page.locator('[data-cy="main-casedata-table"] .sk-table-tbody-tr')).toHaveCount(
      mockFilterErrandsByProperty.data.content.length
    );

    await expect(page.locator(`[data-cy="tag-property-${query}"]`)).toBeVisible();
    await page.locator(`[data-cy="tag-property-${query}"]`).click();
    await mockRoute('**/errands?*', mockErrands_base, { method: 'GET' }); // @getBaseErrands
    await page.waitForResponse((resp) => resp.url().includes('/errands') && resp.status() === 200);
    await expect(page.locator('[data-cy="main-casedata-table"] .sk-table-tbody-tr')).toHaveCount(
      mockErrands_base.data.content.length
    );
  });

  test('allows filtering by a single caseType', async ({ page }) => {
    await expect(page.locator('[data-cy="Show-filters-button"]')).toBeVisible();
    const entries = Object.entries(CaseLabels.MEX);
    await page.locator('[data-cy="Ärendetyp-filter"]').click();

    const filterResponsePromise = page.waitForResponse(
      (resp) => resp.url().includes('/errands') && [200, 304].includes(resp.status())
    );
    await page.locator(`[data-cy="Ärendetyp-filter-${entries[0][0]}"]`).click({ force: true });
    await filterResponsePromise;

    await page.locator('[data-cy="Ärendetyp-filter"]').click();
    await expect(page.locator('[data-cy="tag-caseType"]')).toBeVisible();
    await page.locator('[data-cy="tag-caseType"]').click();
  });

  test('allows filtering by multiple caseTypes', async ({ page }) => {
    const entries = Object.entries(CaseLabels.MEX);
    await expect(page.locator('[data-cy="Show-filters-button"]')).toBeVisible();
    await page.locator('[data-cy="Ärendetyp-filter"]').click();

    for (let idx = 0; idx < entries.length; idx++) {
      const entry = entries[idx];
      const filterResponsePromise = page.waitForResponse(
        (resp) => resp.url().includes('/errands') && [200, 304].includes(resp.status())
      );
      await page.locator(`[data-cy="Ärendetyp-filter-${entry[0]}"]`).click({ force: true });
      await filterResponsePromise;
    }

    await page.locator('[data-cy="Ärendetyp-filter"]').click();
    await expect(page.locator('[data-cy="tag-clearAll"]')).toBeVisible();
    await expect(page.locator('[data-cy="tag-clearAll"]')).toContainText('Rensa alla');
    await page.locator('[data-cy="tag-clearAll"]').click();
  });

  test('allows filtering by priority', async ({ page }) => {
    await expect(page.locator('[data-cy="Show-filters-button"]')).toBeVisible();
    const labels = ['HIGH', 'MEDIUM', 'LOW'];
    await page.locator('[data-cy="Prioritet-filter"]').click();

    const filterResponsePromise = page.waitForResponse(
      (resp) => resp.url().includes('/errands') && [200, 304].includes(resp.status())
    );
    await page.locator(`[data-cy="Prioritet-filter-${labels[0]}"]`).click();
    await filterResponsePromise;

    await page.locator('[data-cy="Prioritet-filter"]').click();
    await page.locator('[data-cy="tag-prio"]').click();
  });

  test('allows filtering by date', async ({ page }) => {
    await expect(page.locator('[data-cy="Show-filters-button"]')).toBeVisible();
    await page.locator('[data-cy="Tidsperiod-filter"]').click();
    await expect(page.locator('[data-cy="casedata-validFrom-input"]')).toBeVisible();
    await page.locator('[data-cy="casedata-validFrom-input"]').fill('2024-05-22');
    await expect(page.locator('[data-cy="casedata-validTo-input"]')).toBeVisible();
    await page.locator('[data-cy="casedata-validTo-input"]').fill('2024-05-27');
    await page.locator('[data-cy="casedata-validTo-input"]').locator('..').locator('button').filter({ hasText: 'Visa tidsperiod' }).click();

    const filterResponsePromise = page.waitForResponse(
      (resp) => resp.url().includes('/errands') && [200, 304].includes(resp.status())
    );
    await filterResponsePromise;

    await page.locator('[data-cy="Tidsperiod-filter"]').click();
    await expect(page.locator('[data-cy="tag-date"]')).toBeVisible();
    await page.locator('[data-cy="tag-date"]').click();
  });

  test('allows filtering by administrator', async ({ page }) => {
    await expect(page.locator('[data-cy="Show-filters-button"]')).toBeVisible();

    for (const a of mockAdmins.data) {
      await page.locator('[data-cy="Handläggare-filter"]').click();
      await expect(page.locator(`[data-cy="admin-${a.guid}"]`)).toBeVisible();
      await page.locator(`[data-cy="admin-${a.guid}"]`).click({ force: true });

      const filterResponsePromise = page.waitForResponse(
        (resp) => resp.url().includes('/errands') && [200, 304].includes(resp.status())
      );
      await filterResponsePromise;

      await page.locator('[data-cy="Handläggare-filter"]').click();
      await expect(page.locator('[data-cy="tag-admin"]')).toBeVisible();
      await page.locator('[data-cy="tag-admin"]').click();
    }
  });

  test('allows filtering by single status', async ({ page }) => {
    const labels = Object.entries(ErrandStatus);
    await page.locator('button').filter({ hasText: 'Öppna ärenden' }).click();
    await expect(page.locator('[data-cy="Show-filters-button"]')).toBeVisible();
    await page.locator('[data-cy="Status-filter"]').click();

    const filterResponsePromise = page.waitForResponse(
      (resp) => resp.url().includes('/errands') && [200, 304].includes(resp.status())
    );
    await expect(page.locator(`[data-cy="Status-filter-${labels[1][0]}"]`)).toBeVisible();
    await page.locator(`[data-cy="Status-filter-${labels[1][0]}"]`).click();
    await filterResponsePromise;

    await page.locator('[data-cy="Status-filter"]').click();
    await expect(page.locator(`[data-cy="tag-status-${labels[2][0]}"]`)).toBeVisible();
    await expect(page.locator(`[data-cy="tag-status-${labels[2][0]}"]`)).toContainText(labels[2][1] as string);
    await page.locator(`[data-cy="tag-status-${labels[2][0]}"]`).click();
  });

  test('allows filtering by multiple statuses', async ({ page }) => {
    const labels = Object.entries(ErrandStatus);
    await page.locator('button').filter({ hasText: 'Öppna ärenden' }).click();
    await expect(page.locator('[data-cy="Show-filters-button"]')).toBeVisible();
    await page.locator('[data-cy="Status-filter"]').click();

    for (const label of labels) {
      if (
        label[0] !== 'ArendeAvslutat' &&
        label[0] !== 'ArendeInkommit' &&
        label[0] !== 'Tilldelat' &&
        label[0] !== 'BeslutOverklagat'
      ) {
        const filterResponsePromise = page.waitForResponse(
          (resp) => resp.url().includes('/errands') && [200, 304].includes(resp.status())
        );
        await expect(page.locator(`[data-cy="Status-filter-${label[0]}"]`)).toBeVisible();
        await page.locator(`[data-cy="Status-filter-${label[0]}"]`).click({ force: true });
        await filterResponsePromise;
      }
    }

    await page.locator('[data-cy="Status-filter"]').click();
  });

  test('allows filtering by stakeholder type', async ({ page }) => {
    await expect(page.locator('[data-cy="Show-filters-button"]')).toBeVisible();
    const labels = ['PERSON', 'ORGANIZATION'];
    await page.locator('[data-cy="StakeholderType-filter"]').click();

    const filterResponsePromise = page.waitForResponse(
      (resp) => resp.url().includes('/errands') && [200, 304].includes(resp.status())
    );
    await page.locator(`[data-cy="StakeholderType-filter-${labels[0]}"]`).click();
    await filterResponsePromise;

    await page.locator('[data-cy="StakeholderType-filter"]').click();
    await page.locator(`[data-cy="tag-stakeholdertype-${labels[0]}"]`).click();
  });

  test('allows filtering only my errands', async ({ page }) => {
    const filterResponsePromise = page.waitForResponse(
      (resp) => resp.url().includes('/errands') && [200, 304].includes(resp.status())
    );
    await expect(page.locator('[data-cy="myErrands-filter"]')).toBeVisible();
    await page.locator('[data-cy="myErrands-filter"]').check({ force: true });
    await filterResponsePromise;

    await expect(page.locator('[data-cy="myErrands-filter"]')).toBeVisible();
    await page.locator('[data-cy="myErrands-filter"]').uncheck({ force: true });
  });

  test('Can use searchfield', async ({ page, mockRoute }) => {
    await expect(page.locator('[data-cy="query-filter"]')).toBeVisible();
    await page.locator('[data-cy="query-filter"]').fill('Text goes here');
    await page.getByRole('button', { name: 'Sök' }).click();

    await mockRoute('**/errands*', emptyMockErrands, { method: 'GET' }); // @emptyQuery-filterSearch
    await page.waitForResponse((resp) => resp.url().includes('/errands') && resp.status() === 200);
    await expect(page.locator('Caption#errandTableCaption').filter({ hasText: 'Det finns inga ärenden' })).toBeVisible();

    await expect(page.locator('[data-cy="query-filter"]')).toBeVisible();
    await page.locator('[data-cy="query-filter"]').clear();
    await page.locator('[data-cy="query-filter"]').fill('balder');
    await page.getByRole('button', { name: 'Sök' }).click();

    await mockRoute('**/errands*', mockErrands_base, { method: 'GET' }); // @listedQuery-filterSearch
    await page.waitForResponse((resp) => resp.url().includes('/errands') && resp.status() === 200);
    await expect(page.locator('[data-cy="main-casedata-table"] .sk-table-tbody-tr')).toHaveCount(
      mockErrands_base.data.content.length
    );
  });

  test('Can use export', async ({ page }) => {
    if (appConfig.features.useErrandExport) {
      await expect(page.locator('[data-cy="export-button"]')).toBeVisible();
      await page.locator('[data-cy="export-button"]').click();
      await expect(page.locator('p').filter({ hasText: 'Det finns ärenden som inte är avslutade. Vill du ändå exportera listan?' })).toBeVisible();
    } else {
      // Export button should not be visible when feature is disabled
      await expect(page.locator('[data-cy="export-button"]')).toHaveCount(0);
    }
  });
});
