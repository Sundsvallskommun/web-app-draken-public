import type { Page } from '@playwright/test';

import { expect, test } from '../fixtures/base.fixture';
import {
  allExistingInvestigationDocuments,
  errandNumber,
  installIafApiMock,
  withHighHslRisk,
} from './fixtures/investigation-flow.mock';

test.skip(!['IAF', 'VOF'].includes(process.env.NEXT_PUBLIC_APPLICATION ?? ''), 'Körs med IAF/VOF-profilen.');

/**
 * MAS/MAR's Händelseanalys HSL is kept out of a unit manager's and head of operations' sight until the errand
 * carries a high HSL risk - in Utredning and in Ärendeuppgifter alike. Only what is drawn changes: the access
 * the mock grants stays the same throughout.
 */
const hslKey = 'utredning-hsl';
const hslText = 'SKA BARA VISAS FÖR DEN SOM SER HÄNDELSEANALYS HSL';

async function installErrand(page: Page, { roleKeys, highHslRisk }: { roleKeys: string[]; highHslRisk: boolean }) {
  const documents = allExistingInvestigationDocuments();
  documents[hslKey].value.assignment = `<p>${hslText}</p>`;
  return installIafApiMock(page, { roleKeys, documents, ...(highHslRisk ? withHighHslRisk() : {}) });
}

async function visitErrand(page: Page, dismissCookieConsent: () => Promise<void>) {
  const errandResponse = page.waitForResponse(
    (response) => response.url().includes(`/supporterrands/errandnumber/${errandNumber}`) && response.status() === 200
  );
  await page.goto(`arende/${errandNumber}`);
  await errandResponse;
  await dismissCookieConsent();
}

const investigationTabs = (page: Page) => page.locator('[data-cy="support-investigation-tab"]');

async function openInvestigation(page: Page) {
  await page.getByRole('tab', { name: 'Utredning', exact: true }).click();
  await expect(investigationTabs(page).getByRole('tab', { name: 'Utredning enhetschef', exact: true })).toBeVisible();
}

for (const roleKey of ['enhetschef', 'verksamhetschef']) {
  test(`${roleKey} is not shown Händelseanalys HSL while the errand has no high HSL risk`, async ({
    page,
    dismissCookieConsent,
  }) => {
    const trace = await installErrand(page, { roleKeys: [roleKey], highHslRisk: false });
    await visitErrand(page, dismissCookieConsent);
    await openInvestigation(page);

    await expect(investigationTabs(page).getByRole('tab', { name: 'Händelseanalys HSL', exact: true })).toHaveCount(0);
    // Nor does Ärendeuppgifter show the document's own JSON in its place.
    await page.getByRole('tab', { name: 'Ärendeuppgifter', exact: true }).click();
    const details = page.getByRole('heading', { name: 'Ärendeuppgifter', exact: true }).locator('..');
    await expect(details.getByRole('textbox', { name: 'Händelse från Katla', exact: true })).toBeVisible();
    await expect(details).not.toContainText(hslText);
    // A concealed document is not even read.
    expect(trace.documentGets).not.toContain(hslKey);
  });

  test(`${roleKey} is shown Händelseanalys HSL once the errand carries a high HSL risk`, async ({
    page,
    dismissCookieConsent,
  }) => {
    await installErrand(page, { roleKeys: [roleKey], highHslRisk: true });
    await visitErrand(page, dismissCookieConsent);
    await openInvestigation(page);

    await expect(investigationTabs(page).getByRole('tab', { name: 'Händelseanalys HSL', exact: true })).toBeVisible();
  });
}

test('MAS/MAR is shown Händelseanalys HSL whatever the risk', async ({ page, dismissCookieConsent }) => {
  await installErrand(page, { roleKeys: ['mas-mar'], highHslRisk: false });
  await visitErrand(page, dismissCookieConsent);
  await openInvestigation(page);

  await expect(investigationTabs(page).getByRole('tab', { name: 'Händelseanalys HSL', exact: true })).toBeVisible();
});
