import { mockAdmins } from '../case-data/fixtures/mockAdmins';
import { mockMe } from '../case-data/fixtures/mockMe';
import { expect, test } from '../fixtures/base.fixture';
import { mockMetaData } from './fixtures/mockMetadata';
import { mockSupportAdminsResponse } from './fixtures/mockSupportAdmins';
import { mockSupportErrands, mockSupportErrandsEmpty } from './fixtures/mockSupportErrands';
import { mockNotifications } from './fixtures/mockSupportNotifications';

/**
 * The notification poller is the only thing keeping the bell badge current while a user sits on the
 * overview, so its interval is worth asserting rather than assuming. The clock is faked so the test
 * can jump a minute ahead instead of waiting one.
 */
test.describe('Notification polling', () => {
  test('refetches notifications once per minute and stops while the tab is hidden', async ({
    page,
    mockRoute,
    dismissCookieConsent,
  }) => {
    // Must be installed before the app boots so the interval is created against the fake clock.
    await page.clock.install();

    await page.context().addCookies([{ name: 'connect.sid', value: 'test-session', domain: 'localhost', path: '/' }]);
    await mockRoute('**/administrators', mockAdmins, { method: 'GET' });
    await mockRoute('**/me', mockMe, { method: 'GET' });
    await mockRoute('**/featureflags', [], { method: 'GET' });
    await mockRoute('**/supporterrands/2281?page=0*', mockSupportErrands, { method: 'GET' });
    await mockRoute('**/supporterrands/2281?page=1*', mockSupportErrandsEmpty, { method: 'GET' });
    await mockRoute('**/supportmetadata/2281', mockMetaData, { method: 'GET' });
    await mockRoute('**/users/admins', mockSupportAdminsResponse, { method: 'GET' });

    let notificationRequests = 0;
    await page.route('**/supportnotifications/2281', async (route) => {
      if (route.request().method() === 'GET') notificationRequests += 1;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockNotifications),
      });
    });

    await page.goto('oversikt/');
    await page.waitForResponse((resp) => resp.url().includes('supporterrands') && resp.status() === 200);
    await dismissCookieConsent();

    // Mounting fetches once so the badge is not empty on arrival.
    await expect.poll(() => notificationRequests).toBe(1);

    await page.clock.runFor(60_000);
    await expect.poll(() => notificationRequests).toBe(2);

    await page.clock.runFor(60_000);
    await expect.poll(() => notificationRequests).toBe(3);

    // Hiding the tab stops the loop: polling a page nobody is looking at is wasted traffic.
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await page.clock.runFor(120_000);
    expect(notificationRequests).toBe(3);

    // Coming back catches up immediately rather than waiting out the rest of the interval.
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await expect.poll(() => notificationRequests).toBe(4);
  });
});
