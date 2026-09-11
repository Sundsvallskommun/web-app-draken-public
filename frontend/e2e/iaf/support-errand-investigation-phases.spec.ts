import type { Page } from '@playwright/test';

import { expect, test } from '../fixtures/base.fixture';
import { errandNumber, installIafApiMock, investigationPhases } from './fixtures/investigation-flow.mock';

test.skip(
  !['IAF', 'VOF'].includes(process.env.NEXT_PUBLIC_APPLICATION ?? ''),
  'Det riktiga utredningsflödet körs med IAF/VOF-profilen.'
);

const investigationTab = (page: Page) => page.getByRole('tab', { name: 'Utredning', exact: true });
const decisionTab = (page: Page) => page.getByRole('tab', { name: 'Beslut', exact: true });

async function visitErrand(page: Page, dismissCookieConsent: () => Promise<void>) {
  const errandResponse = page.waitForResponse(
    (response) => response.url().includes(`/supporterrands/errandnumber/${errandNumber}`) && response.status() === 200
  );
  await page.goto(`arende/${errandNumber}`);
  await errandResponse;
  await dismissCookieConsent();
  await expect(page.getByRole('tab', { name: 'Grundinformation', exact: true })).toBeVisible();
}

/**
 * The tabs follow the workflow: the investigations are written while the errand is being
 * investigated and the decision once it has moved on to being decided, so neither tab is reachable
 * before the errand is there. The default deviation is under HSL, so the IVO decision is the one
 * that applies to it.
 */
test.describe('Utrednings- och beslutsflikarna följer ärendets fas', () => {
  test('varken utredning eller beslut visas innan ärendet är i utredningsfasen', async ({
    page,
    dismissCookieConsent,
  }) => {
    await installIafApiMock(page, {
      documents: {},
      metadataPhases: investigationPhases,
      activePhaseId: 'phase-received',
    });

    await visitErrand(page, dismissCookieConsent);

    await expect(investigationTab(page)).toHaveCount(0);
    await expect(decisionTab(page)).toHaveCount(0);
  });

  test('utredningen visas i utredningsfasen, beslutet först i beslutsfasen', async ({ page, dismissCookieConsent }) => {
    await installIafApiMock(page, {
      documents: {},
      metadataPhases: investigationPhases,
      activePhaseId: 'phase-investigation',
    });

    await visitErrand(page, dismissCookieConsent);

    await investigationTab(page).click();
    await expect(page.locator('[data-cy="support-investigation-tab"]')).toBeVisible();
    await expect(decisionTab(page)).toHaveCount(0);
  });

  test('beslutsfliken visas när ärendet nått beslutsfasen, och utredningen finns kvar', async ({
    page,
    dismissCookieConsent,
  }) => {
    await installIafApiMock(page, {
      documents: {},
      metadataPhases: investigationPhases,
      activePhaseId: 'phase-decision',
    });

    await visitErrand(page, dismissCookieConsent);

    await expect(investigationTab(page)).toHaveCount(1);
    await decisionTab(page).click();
    await expect(page.locator('[data-cy="support-decision-tab"]')).toBeVisible();
  });

  // A namespace that runs no workflow has no phase to wait for, and keeps the tabs it always had.
  test('utan fasmodell är flikarna kvar som förut', async ({ page, dismissCookieConsent }) => {
    await installIafApiMock(page, { documents: {} });

    await visitErrand(page, dismissCookieConsent);

    await expect(investigationTab(page)).toHaveCount(1);
    await expect(decisionTab(page)).toHaveCount(1);
  });
});
