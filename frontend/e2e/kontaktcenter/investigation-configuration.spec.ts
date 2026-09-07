import { expect, test } from '../fixtures/base.fixture';
import { installSupportAppMock } from '../fixtures/support-app.mock';

test('KC visar konfigurationsfel när runtime aktiverar en utredning som appen saknar', async ({ page }) => {
  await installSupportAppMock(page, { featureFlags: [{ name: 'useInvestigation', enabled: true }] });
  await page.goto('oversikt/');
  await expect(page.getByRole('heading', { name: 'Konfigurationen behöver rättas' })).toBeVisible();
  await expect(page.locator('[data-cy="aot-investigation-tab"]')).toHaveCount(0);
  await expect(page.locator('[data-cy="support-investigation-tab"]')).toHaveCount(0);
});
