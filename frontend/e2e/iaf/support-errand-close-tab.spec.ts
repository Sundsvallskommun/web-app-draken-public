import type { Page } from '@playwright/test';

import { expect, test } from '../fixtures/base.fixture';
import { errandNumber, installIafApiMock, type WorkflowPhaseName } from './fixtures/investigation-flow.mock';

test.skip(!['IAF', 'VOF'].includes(process.env.NEXT_PUBLIC_APPLICATION ?? ''), 'Körs med IAF/VOF-profilen.');

/**
 * A closed errand is done with, so the tab it was opened in closes - in a workflow too, whether the errand is
 * closed from its last phase with the phase button or earlier with Avsluta ärendet. The browser would refuse a
 * script closing a tab it did not open, so `window.close` is recorded rather than run.
 */
async function installErrandIn(page: Page, phase: WorkflowPhaseName, status: string) {
  await page.addInitScript(() => {
    (window as unknown as { closeCalls: number }).closeCalls = 0;
    window.close = () => {
      (window as unknown as { closeCalls: number }).closeCalls += 1;
    };
  });
  await installIafApiMock(page, {
    activePhaseName: phase,
    errandStatus: status,
    assignedUserId: 'iaf.test',
    featureFlags: [
      { name: 'isSupportManagement', enabled: true },
      { name: 'useUiPhases', enabled: true },
      { name: 'useMeasures', enabled: false },
      { name: 'useInvestigation', enabled: false },
    ],
  });
}

async function visitErrand(page: Page, dismissCookieConsent: () => Promise<void>) {
  const errandResponse = page.waitForResponse(
    (response) => response.url().includes(`/supporterrands/errandnumber/${errandNumber}`) && response.status() === 200
  );
  await page.goto(`arende/${errandNumber}`);
  await errandResponse;
  await dismissCookieConsent();
}

const closeCalls = (page: Page) => page.evaluate(() => (window as unknown as { closeCalls: number }).closeCalls);

const statusWrite = (page: Page) =>
  page.waitForRequest((request) => request.method() === 'PATCH' && request.url().endsWith('/status'));

test('closing the errand from its last phase closes the tab', async ({ page, dismissCookieConsent }) => {
  await installErrandIn(page, 'FOLLOW_UP', 'FOLLOW_UP');
  await visitErrand(page, dismissCookieConsent);

  // In the last phase the phase button closes the errand, and Avsluta ärendet is not offered beside it.
  const phaseButton = page.locator('[data-cy="next-phase-button"]');
  await expect(phaseButton).toHaveText('Avsluta ärendet');
  await expect(page.locator('[data-cy="solved-button"]')).toHaveCount(0);
  const written = statusWrite(page);
  await phaseButton.click();

  expect((await written).postDataJSON()).toMatchObject({ status: 'SOLVED' });
  await expect(page.getByText('Ärendet avslutades')).toBeVisible();
  await expect.poll(() => closeCalls(page), { timeout: 5000 }).toBe(1);
});

test('closing the errand before its last phase closes the tab', async ({ page, dismissCookieConsent }) => {
  await installErrandIn(page, 'INVESTIGATION', 'INQUIRY');
  await visitErrand(page, dismissCookieConsent);

  const written = statusWrite(page);
  await page.locator('[data-cy="solved-button"]').click();

  expect((await written).postDataJSON()).toMatchObject({ status: 'SOLVED' });
  await expect.poll(() => closeCalls(page), { timeout: 5000 }).toBe(1);
});

/**
 * A reported misconduct goes to LEX, is decided and is followed up before it closes. The close offered before the
 * last phase is not there for it - the close from the follow-up is - while a deviation keeps it as before.
 */
for (const [eventType, offered] of [
  ['MISSFORHALLANDE', false],
  ['AVVIKELSE', true],
] as const) {
  test(`${offered ? 'offers' : 'offers no'} early close on a ${eventType.toLowerCase()} in the investigation`, async ({
    page,
    dismissCookieConsent,
  }) => {
    await installIafApiMock(page, { eventType, activePhaseName: 'INVESTIGATION', assignedUserId: 'iaf.test' });
    await visitErrand(page, dismissCookieConsent);

    await expect(page.locator('[data-cy="manage-sidebar"]')).toBeVisible();
    await expect(page.locator('[data-cy="solved-button"]')).toHaveCount(offered ? 1 : 0);
  });
}
