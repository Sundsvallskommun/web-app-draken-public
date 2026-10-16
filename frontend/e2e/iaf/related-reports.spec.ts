import type { Page } from '@playwright/test';

import { expect, test } from '../fixtures/base.fixture';
import { errandId, errandNumber, installIafApiMock } from './fixtures/investigation-flow.mock';

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

const brukare = { partyId: 'brukare-party-id', firstName: 'Britt', lastName: 'Brukare' };

/** The brukare's errands as the BFF answers them: this report among them, the BFF having kept the drake's own. */
const brukareStatuses = (currentErrandNumber: string) => [
  { caseId: 'other-report-id', errandNumber: 'VOF-2026-0042', namespace: 'HEALTHCAREDEVIATIONVOF', status: 'Pågående' },
  {
    caseId: errandId,
    errandNumber: currentErrandNumber,
    namespace: 'HEALTHCAREDEVIATIONVOF',
    status: 'Pågående',
  },
];

test('names the relations module Relaterade rapporter', async ({ page, dismissCookieConsent }) => {
  await installIafApiMock(page, { featureFlags: relatedReportsFlags });
  await openBasics(page, dismissCookieConsent);

  await expect(relationsModule(page)).toContainText('Relaterade rapporter');
  await expect(relationsModule(page)).not.toContainText('Kopplade ärenden');
});

// D2: the module only shows that there are other reports on the same brukare. Nothing is searched, linked or unlinked.
test("lists the brukare's other reports, read-only, under one heading", async ({ page, dismissCookieConsent }) => {
  await installIafApiMock(page, { featureFlags: relatedReportsFlags, brukare });
  const requests: string[] = [];
  page.on('request', (request) => requests.push(`${request.method()} ${new URL(request.url()).pathname}`));
  await page.route(`**/party/${brukare.partyId}/statuses`, (route) =>
    route.fulfill({ json: { data: brukareStatuses(errandNumber), message: 'success' } })
  );
  await openBasics(page, dismissCookieConsent);

  await relationsModule(page).getByRole('button').first().click();
  await expect(
    relationsModule(page).getByRole('heading', { level: 2, name: 'Relaterade rapporter till brukaren' })
  ).toBeVisible();
  const table = relationsModule(page).locator('[data-cy="related-reports-table"]');
  await expect(table).toContainText('VOF-2026-0042');
  // The report being read is not one of its own related reports.
  await expect(table).not.toContainText(errandNumber);

  await expect(relationsModule(page).getByRole('searchbox')).toHaveCount(0);
  await expect(relationsModule(page).getByRole('button', { name: /Koppla|Bryt koppling/u })).toHaveCount(0);
  await expect(relationsModule(page)).not.toContainText('Kopplingar skapade till detta ärende');
  expect(
    requests.filter((request) =>
      /\/errands\/statuses\/|\/resolvedrelations\/|^(POST|DELETE) .*\/relations/u.test(request)
    )
  ).toEqual([]);
});

// The test environment's CaseStatus cannot see VOF's reports, so there the deployment shows examples in their place.
test('shows example reports, with their subcategory, where the deployment mocks them', async ({
  page,
  dismissCookieConsent,
}) => {
  await installIafApiMock(page, {
    featureFlags: [...relatedReportsFlags, { name: 'useRelatedReportsMock', enabled: true }],
    brukare,
  });
  const statusRequests: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/statuses')) statusRequests.push(request.url());
  });
  await openBasics(page, dismissCookieConsent);

  await relationsModule(page).getByRole('button').first().click();
  const table = relationsModule(page).locator('[data-cy="related-reports-table"]');
  await expect(table.locator('thead th')).toHaveText(['Status', 'Ärendetyp', 'Underkategori', 'Ärendenummer']);
  await expect(table.locator('tbody tr')).toHaveText([
    /Handläggning pågår\s*Fall\s*Fall vid patientens egna aktiviteter\s*MOCK-0001/u,
    /Avslutat\s*Fall utan skada\s*MOCK-0002/u,
    /Inskickat\s*Fall\s*Fall med personal - Hjälpmedel\s*MOCK-0003/u,
  ]);
  expect(statusRequests).toEqual([]);
});
