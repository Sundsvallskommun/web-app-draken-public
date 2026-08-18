import { mockAdmins } from '../case-data/fixtures/mockAdmins';
import { mockMe } from '../case-data/fixtures/mockMe';
import { expect, test } from '../fixtures/base.fixture';
import { mockMetaData } from './fixtures/mockMetadata';
import { mockSupportAdminsResponse } from './fixtures/mockSupportAdmins';
import { mockSupportErrands, mockSupportErrandsEmpty } from './fixtures/mockSupportErrands';
import { mockAcknowledgeResult, mockNotifications } from './fixtures/mockSupportNotifications';

test.describe('Notifications', () => {
  test.beforeEach(async ({ page, mockRoute, dismissCookieConsent }) => {
    await page.context().addCookies([{ name: 'connect.sid', value: 'test-session', domain: 'localhost', path: '/' }]);
    await mockRoute('**/administrators', mockAdmins, { method: 'GET' });
    await mockRoute('**/me', mockMe, { method: 'GET' });
    await mockRoute('**/featureflags', [], { method: 'GET' });
    await mockRoute('**/supporterrands/2281?page=0*', mockSupportErrands, { method: 'GET' });
    await mockRoute('**/supporterrands/2281?page=1*', mockSupportErrandsEmpty, { method: 'GET' });
    await mockRoute('**/supportmetadata/2281', mockMetaData, { method: 'GET' });
    await mockRoute('**/supportnotifications/2281', mockNotifications, { method: 'GET' });
    await mockRoute('**/supportnotifications/2281/acknowledge', mockAcknowledgeResult, { method: 'PATCH' });
    await mockRoute('**/users/admins', mockSupportAdminsResponse, { method: 'GET' });
    await page.goto('oversikt/');
    await page.waitForResponse((resp) => resp.url().includes('supporterrands') && resp.status() === 200);
    await dismissCookieConsent();
  });

  // The status filters in the sidebar carry badges too, so the count has to be read from the bell.
  const bellBadge = (page: import('@playwright/test').Page) =>
    page.locator('[aria-label="Notifieringar"] .sk-badge-content');

  const openPanel = async (page: import('@playwright/test').Page) => {
    await page.locator('[aria-label="Notifieringar"]').click();
    // Exact, otherwise this also matches the "Nya ärenden" heading behind the panel.
    await expect(page.getByRole('heading', { name: 'Nya', exact: true })).toBeVisible();
  };

  test('counts every unacknowledged notification on the bell', async ({ page }) => {
    // Four notifications, two of which are merged into one group in the panel.
    await expect(bellBadge(page)).toContainText('4');
  });

  test('merges notifications for the same errand and subtype into one row', async ({ page }) => {
    await openPanel(page);

    const groups = page.locator('[data-cy="notification-group"]');
    await expect(groups).toHaveCount(1);
    await expect(groups.first()).toContainText('2 nya meddelanden');
    await expect(groups.first()).toContainText('KC-2024-000001');

    // The two ungrouped notifications are still shown on their own.
    await expect(page.locator('[data-cy="notification-item"]')).toHaveCount(2);
  });

  test('falls back to a generic label when the notification has no description', async ({ page }) => {
    await openPanel(page);

    const bare = page.locator('[data-cy="notification-item"]').filter({ hasText: 'KC-2024-000003' });
    await expect(bare).toContainText('Händelse på ärende');
    await expect(bare).not.toContainText('undefined');
  });

  test('expands a group to show the individual notifications', async ({ page }) => {
    await openPanel(page);

    const group = page.locator('[data-cy="notification-group"]').first();
    await group.locator('[data-cy="notification-group-toggle"]').click();

    await expect(group.locator('[data-cy="notification-item"]')).toHaveCount(2);
  });

  test('acknowledges a whole group in a single request', async ({ page }) => {
    await openPanel(page);

    const acknowledgeRequest = page.waitForRequest(
      (request) => request.url().includes('/supportnotifications/2281/acknowledge') && request.method() === 'PATCH'
    );

    // sk-web-gui renders a decorative span over the real input, so the click has to be forced.
    await page
      .locator('[data-cy="notification-group"]')
      .first()
      .locator('input[type="checkbox"]')
      .first()
      .check({ force: true });

    const acknowledgeButton = page.locator('[data-cy="acknowledge-selected-notifications"]');
    await expect(acknowledgeButton).toContainText('Markera som läst (2)');
    await acknowledgeButton.click();

    const request = await acknowledgeRequest;
    expect(JSON.parse(request.postData() ?? '{}').ids).toHaveLength(2);
  });

  test('links a notification to the errand log', async ({ page }) => {
    await openPanel(page);

    const link = page.locator('[data-cy="notification-item"]').first().getByRole('link');
    const href = await link.getAttribute('href');

    expect(href).toContain('/arende/KC-2024-000002');
    expect(href).toContain('tab=history');
    expect(href).toContain('notification=cc893d57-04e9-44af-a271-aff5df530dda');
  });
});
