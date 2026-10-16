import type { Page } from '@playwright/test';

import { expect, test } from '../fixtures/base.fixture';
import { errandNumber, installIafApiMock } from './fixtures/investigation-flow.mock';

test.skip(!['IAF', 'VOF'].includes(process.env.NEXT_PUBLIC_APPLICATION ?? ''), 'Körs med IAF/VOF-profilen.');

/**
 * The relations module in avvikelse is Relaterade rapporter: the other reports on the errand's brukare. Every other
 * drake keeps Kopplade ärenden. The flags are served, as Adminpanelen serves them where the module is switched on.
 */
const relatedReportsFlags = [
  { name: 'isSupportManagement', enabled: true },
  { name: 'useDetailsTab', enabled: true },
  { name: 'useLabelCategorization', enabled: true },
  { name: 'useInvestigation', enabled: true },
  { name: 'useAvvikelseInvestigation', enabled: true },
  { name: 'useRelations', enabled: true },
  { name: 'useRelatedReports', enabled: true },
];

async function openBasics(page: Page, dismissCookieConsent: () => Promise<void>) {
  const errandResponse = page.waitForResponse(
    (response) => response.url().includes(`/supporterrands/errandnumber/${errandNumber}`) && response.status() === 200
  );
  await page.goto(`arende/${errandNumber}`);
  await errandResponse;
  await dismissCookieConsent();
  await page.getByRole('tab', { name: 'Grundinformation', exact: true }).click();
}

const relationsModule = (page: Page) => page.locator('[data-cy="connected-errands-disclosure"]');

test('names the relations module Relaterade rapporter', async ({ page, dismissCookieConsent }) => {
  await installIafApiMock(page, { featureFlags: relatedReportsFlags });
  await openBasics(page, dismissCookieConsent);

  await expect(relationsModule(page)).toContainText('Relaterade rapporter');
  await expect(relationsModule(page)).not.toContainText('Kopplade ärenden');
});
