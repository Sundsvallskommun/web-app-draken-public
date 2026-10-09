import type { Page } from '@playwright/test';

import { expect, test } from '../fixtures/base.fixture';
import { errandNumber, installIafApiMock } from './fixtures/investigation-flow.mock';

test.skip(!['IAF', 'VOF'].includes(process.env.NEXT_PUBLIC_APPLICATION ?? ''), 'Körs med IAF/VOF-profilen.');

async function visitErrand(page: Page, dismissCookieConsent: () => Promise<void>) {
  const errandResponse = page.waitForResponse(
    (response) => response.url().includes(`/supporterrands/errandnumber/${errandNumber}`) && response.status() === 200
  );
  await page.goto(`arende/${errandNumber}`);
  await errandResponse;
  await dismissCookieConsent();
}

// IAF and VOF never reopen a closed errand, whatever the runtime flags say.
test('erbjuder inte att återöppna ett avslutat ärende', async ({ page, dismissCookieConsent }) => {
  await installIafApiMock(page, {
    errandStatus: 'SOLVED',
    featureFlags: [
      { name: 'isSupportManagement', enabled: true },
      { name: 'useUiPhases', enabled: true },
      { name: 'reopenSupportErrandLimit', enabled: true, value: '60' },
    ],
  });

  await visitErrand(page, dismissCookieConsent);

  // The closed summary is where the button would sit, so it shows the sidebar rendered the closed errand.
  const sidebar = page.locator('[data-cy="manage-sidebar"]');
  await expect(sidebar).toContainText('avslutade ärendet.');
  await expect(page.getByRole('button', { name: 'Återöppna ärende' })).toHaveCount(0);
});
