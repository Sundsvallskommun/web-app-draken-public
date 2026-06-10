import { test, expect } from '../../fixtures/base.fixture';
import { mockErrand_base } from '../fixtures/mockErrand';
import { mockPersonId } from '../fixtures/mockPersonId';
import { mockAdmins } from '../fixtures/mockAdmins';
import { mockErrands_base } from '../fixtures/mockErrands';
import { mockMe } from '../fixtures/mockMe';
import { mockMessages } from '../fixtures/mockMessages';
import { mockPermits } from '../fixtures/mockPermits';
import { mockNotifications } from '../../kontaktcenter/fixtures/mockSupportNotifications';

test.describe('Overview page', () => {
  test.beforeEach(async ({ page, mockRoute, dismissCookieConsent }) => {
    await mockRoute('**/messages', mockMessages, { method: 'POST' });
    await mockRoute('**/users/admins', mockAdmins);
    await mockRoute('**/me', mockMe);
    await mockRoute('**/featureflags', []);
    await mockRoute('**/parking-permits/', mockPermits);
    await mockRoute('**/parking-permits/?personId=aaaaaaa-bbbb-aaaa-bbbb-aaaabbbbcccc', mockPermits);
    await mockRoute('**/personid*', mockPersonId, { method: 'POST' });
    await mockRoute('**/errands*', mockErrands_base);
    await page.route(/\/errand\/\d*/, async (route) => {
      if (route.request().method() !== 'GET') {
        await route.fallback();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockErrand_base),
      });
    });
    await mockRoute('**/casedatanotifications/2281', mockNotifications);
    await page.goto('oversikt');
    await page.waitForResponse((resp) => resp.url().includes('/errands') && resp.status() === 200);
    await dismissCookieConsent();
  });

  test('displays the correct table header for PT', async ({ page }) => {
    const headerRow = page.locator('[data-cy="main-casedata-table"] .sk-table-thead-tr').first();
    await expect(headerRow.locator('th').nth(0).locator('span').first()).toHaveText('Status');
    await expect(headerRow.locator('th').nth(1).locator('span').first()).toHaveText('Senaste aktivitet');
    await expect(headerRow.locator('th').nth(2).locator('span').first()).toHaveText('Ärendetyp');
    await expect(headerRow.locator('th').nth(3).locator('span').first()).toHaveText('Ärendenummer');
    await expect(headerRow.locator('th').nth(4).locator('span').first()).toHaveText('Prioritet');
    await expect(headerRow.locator('th').nth(5).locator('span').first()).toHaveText('Ärendeägare');
    await expect(headerRow.locator('th').nth(6).locator('span').first()).toHaveText('Registrerat');
    await expect(headerRow.locator('th').nth(7).locator('span').first()).toHaveText('Handläggare');
  });

  test('displays PT-specific filters including Phase filter', async ({ page }) => {
    await page.locator('[aria-label="status-button-Under granskning"]').click();
    await expect(page.locator('[data-cy="Show-filters-button"]')).toBeVisible();
    await expect(page.locator('[data-cy="Status-filter"]')).toBeVisible();
    await expect(page.locator('[data-cy="Ärendetyp-filter"]')).toBeVisible();
    await expect(page.locator('[data-cy="Prioritet-filter"]')).toBeVisible();
    await expect(page.locator('[data-cy="Tidsperiod-filter"]')).toBeVisible();
    await page.locator('[data-cy="Tidsperiod-filter"]').click();
    await expect(page.locator('[data-cy="casedata-validFrom-input"]')).toBeVisible();
    await expect(page.locator('[data-cy="casedata-validTo-input"]')).toBeVisible();
    await expect(page.locator('[data-cy="Handläggare-filter"]')).toBeVisible();
    await expect(page.locator('[data-cy="Phase-filter"]')).toBeVisible();
  });
});
