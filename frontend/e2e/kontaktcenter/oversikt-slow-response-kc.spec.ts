import { test, expect } from '../fixtures/base.fixture';
import { mockAdmins } from '../case-data/fixtures/mockAdmins';
import { mockMe } from '../case-data/fixtures/mockMe';
import { mockSupportAdminsResponse } from './fixtures/mockSupportAdmins';
import { mockMetaData } from './fixtures/mockMetadata';
import { mockOngoingSupportErrands, mockSupportErrands } from './fixtures/mockSupportErrands';
import { mockNotifications } from './fixtures/mockSupportNotifications';

/**
 * The overview asks for errands again on every filter, sort and page change, so several requests
 * can be in flight at once and they do not have to answer in the order they were sent. The table
 * only renders errands whose status the sidebar has selected, so a result fetched for another
 * status renders as an empty table beside a correct count - which is exactly what a slow response
 * used to produce when it landed after the one that replaced it.
 */
test.describe('Overview support errands, slow responses', () => {
  // Anchored on the leading slash so it does not also match countsupporterrands.
  const LIST_URL = /\/supporterrands\/2281\?/;
  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
  const statusOf = (url: string) => new URL(url).searchParams.get('status');

  test.beforeEach(async ({ page, mockRoute }) => {
    await page.context().addCookies([{ name: 'connect.sid', value: 'test-session', domain: 'localhost', path: '/' }]);
    await mockRoute('**/administrators', mockAdmins, { method: 'GET' });
    await mockRoute('**/me', mockMe, { method: 'GET' });
    await mockRoute('**/featureflags', [], { method: 'GET' });
    await mockRoute('**/supportmetadata/2281', mockMetaData, { method: 'GET' });
    await mockRoute('**/supportnotifications/2281', mockNotifications, { method: 'GET' });
    await mockRoute('**/users/admins', mockSupportAdminsResponse, { method: 'GET' });
    await mockRoute('**/countsupporterrands/**', { count: 10 }, { method: 'GET' });
  });

  test.afterEach(async ({ page }) => {
    // The routes below answer slowly on purpose; dropping them keeps a late request from holding
    // up the teardown.
    await page.unrouteAll({ behavior: 'ignoreErrors' });
  });

  test('a slow answer to a replaced request does not empty the table', async ({ page, dismissCookieConsent }) => {
    test.setTimeout(60_000);
    // The errands for the status the page opens on, NEW, answer slowly. The request that replaces
    // them when the user switches to "Öppna ärenden" answers immediately.
    await page.route(LIST_URL, async (route) => {
      const isNewStatusRequest = statusOf(route.request().url()) === 'NEW';
      if (isNewStatusRequest) {
        await delay(8000);
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(isNewStatusRequest ? mockSupportErrands : mockOngoingSupportErrands),
      });
    });

    const slowRequest = page.waitForRequest(LIST_URL);
    await page.goto('oversikt/');
    await dismissCookieConsent();
    await slowRequest;

    const slowAnswer = page.waitForResponse(
      (response) => LIST_URL.test(response.url()) && statusOf(response.url()) === 'NEW'
    );
    await page.locator('[aria-label="status-button-ONGOING"]').click();
    await expect(page.locator('[data-cy="main-table"] .sk-table-tbody-tr')).toHaveCount(
      mockOngoingSupportErrands.content.length
    );

    await slowAnswer;
    await expect(page.locator('[data-cy="main-table"] .sk-table-tbody-tr')).toHaveCount(
      mockOngoingSupportErrands.content.length
    );
  });

  test('the first load asks for the selected status only', async ({ page, dismissCookieConsent }) => {
    // Asking before the status is known means asking for every errand there is: the slowest query
    // the overview can make, and one whose answer the table cannot show anyway.
    const listQueries: string[] = [];
    await page.route(LIST_URL, async (route) => {
      listQueries.push(decodeURIComponent(new URL(route.request().url()).search));
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockSupportErrands) });
    });

    await page.goto('oversikt/');
    await dismissCookieConsent();
    await expect(page.locator('[data-cy="main-table"] .sk-table-tbody-tr')).toHaveCount(
      mockSupportErrands.content.length
    );

    expect(listQueries).toHaveLength(1);
    expect(listQueries[0]).toContain('status=NEW');
  });
});
