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
    // One notification per errand, so the badge matches the number of rows in the panel — the errand
    // with two messages counts once, not twice.
    await expect(bellBadge(page)).toContainText('4');
  });

  test('collapses the events of one errand into a single row', async ({ page }) => {
    await openPanel(page);

    const groups = page.locator('[data-cy="notification-group"]');
    await expect(groups).toHaveCount(1);
    await expect(groups.first()).toContainText('2 nya meddelanden');
    await expect(groups.first()).toContainText('KC-2024-000001');

    // Notifications carrying a single event are still shown as plain rows.
    await expect(page.locator('[data-cy="notification-item"]')).toHaveCount(3);
  });

  test('falls back to a generic label when the notification has no description', async ({ page }) => {
    await openPanel(page);

    const bare = page.locator('[data-cy="notification-item"]').filter({ hasText: 'KC-2024-000003' });
    await expect(bare).toContainText('Händelse på ärende');
    await expect(bare).not.toContainText('undefined');
  });

  test('tells a removal apart from an addition when there is no description', async ({ page }) => {
    await openPanel(page);

    const removed = page.locator('[data-cy="notification-item"]').filter({ hasText: 'KC-2024-000004' });
    await expect(removed).toContainText('Bilaga borttagen');
    await expect(removed).not.toContainText('Ny bilaga');
  });

  test('expands a group to show the individual events', async ({ page }) => {
    await openPanel(page);

    const group = page.locator('[data-cy="notification-group"]').first();
    await group.locator('[data-cy="notification-group-toggle"]').click();

    await expect(group.locator('[data-cy="notification-event"]')).toHaveCount(2);
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
    // One notification covers both messages, so acknowledging the row is a single id upstream.
    await expect(acknowledgeButton).toContainText('Markera som läst (1)');
    await acknowledgeButton.click();

    const request = await acknowledgeRequest;
    expect(JSON.parse(request.postData() ?? '{}').ids).toHaveLength(1);
  });

  // A notification covering several events used to stay unread when followed, while one covering a
  // single event was acknowledged — an arbitrary split, since upstream moves a notification between
  // those two states as activity arrives.
  test('acknowledges a grouped notification when it is followed to the errand', async ({ page }) => {
    await openPanel(page);

    const acknowledgeRequest = page.waitForRequest(
      (request) => request.url().includes('/supportnotifications/2281/acknowledge') && request.method() === 'PATCH'
    );

    await page.locator('[data-cy="notification-group"]').first().getByRole('link').click();

    const request = await acknowledgeRequest;
    expect(JSON.parse(request.postData() ?? '{}').ids).toEqual(['bb893d57-04e9-44af-a271-aff5df530bba']);
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
