import { expect, test } from '../fixtures/base.fixture';
import { application, errandNumber, installSupportAppMock } from '../fixtures/support-app.mock';

// Every project runs this suite against its own compiled entrypoint and checked-in environment
// example. Shared test code is not a substitute for starting each individual dragon.
test('the selected dragon can log in, list and open a SupportManagement errand', async ({
  page,
  dismissCookieConsent,
}, testInfo) => {
  expect(application.toLowerCase()).toBe(testInfo.project.name);
  const failures: string[] = [];
  page.on('pageerror', (error) => failures.push(error.message));
  const trace = await installSupportAppMock(page);

  await page.goto('login');
  await expect(page.locator('[data-cy="loginButton"]')).toBeVisible();
  expect(trace.profileGets).toBe(0);

  await page.goto('oversikt/');
  await dismissCookieConsent();
  await expect(page.locator('[data-cy="main-table"] .sk-table-tbody-tr')).toHaveCount(1);
  await expect(page.locator('[data-cy="main-table"]')).toContainText(errandNumber);

  await page.goto(`arende/${errandNumber}`);
  await expect(page.getByRole('tab', { name: 'Grundinformation', exact: true })).toBeVisible();
  await expect(page.locator('[data-cy="avvikelse-label-categorization"]')).toHaveCount(0);
  await expect(page.locator('[data-cy="support-investigation-tab"]')).toHaveCount(0);
  expect(trace.investigationDocumentRequests).toEqual([]);
  expect(trace.schemaRequests).toEqual([]);
  expect(trace.classificationPatches).toBe(0);
  expect(failures).toEqual([]);
});
