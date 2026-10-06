import type { Page, Route } from '@playwright/test';

import lexDecisionRequest from '../../src/supportmanagement/investigation/avvikelse/schemas/beslut-sol-lss.schema-request.json';
import managerRequest from '../../src/supportmanagement/investigation/avvikelse/schemas/utredning-enhetschef.schema-request.json';
import lexRequest from '../../src/supportmanagement/investigation/avvikelse/schemas/utredning-sol-lss.schema-request.json';
import type { UnitFollowUpSnapshot } from '../../src/supportmanagement/investigation/avvikelse/follow-up/unit-follow-up-service';
import { mockAdmins } from '../case-data/fixtures/mockAdmins';
import { mockMe } from '../case-data/fixtures/mockMe';
import { expect, test } from '../fixtures/base.fixture';
import { mockStatusGroupCounts } from '../utils/status-group-counts';
import { defaultInvestigationProfile } from './fixtures/investigation-flow.mock';

/**
 * Verksamhetsuppföljning - Enheter: a sidebar entry of the avvikelse investigation swaps the errand table
 * for the errands and measures of the units the user reaches. The BFF reads them; the browser names,
 * filters and sorts what it is given.
 */
test.skip(
  !['IAF', 'VOF'].includes(process.env.NEXT_PUBLIC_APPLICATION ?? ''),
  'Verksamhetsuppföljningen körs med IAF/VOF-profilen.'
);

const application = process.env.NEXT_PUBLIC_APPLICATION;

const emptyErrandPage = {
  content: [],
  pageable: { pageNumber: 0, pageSize: 12, offset: 0, paged: true, unpaged: false },
  totalPages: 0,
  totalElements: 0,
  size: 12,
  number: 0,
  first: true,
  last: true,
  numberOfElements: 0,
  empty: true,
};

const unit = (name: string) => [
  { id: 'vof', classification: 'LOCATION', displayName: application },
  { id: name, classification: 'LOCATION', displayName: name },
];
const deviation = { id: 'deviation', classification: 'REPORT_TYPE', displayName: 'Avvikelse' };
const misconduct = { id: 'abuse', classification: 'REPORT_TYPE', displayName: 'Missförhållande' };
const hsl = { id: 'hsl', classification: 'PROVISION', displayName: 'HSL' };
const sol = { id: 'sol', classification: 'PROVISION', displayName: 'SoL' };

const snapshot: UnitFollowUpSnapshot = {
  errands: [
    {
      id: 'e8',
      errandNumber: `${application}-2026-0008`,
      status: 'INQUIRY',
      created: '2026-05-03T09:00:00.000+02:00',
      labels: [deviation, hsl, ...unit('Granlunda 1')],
      investigation: { riskValueHsl: 3, causeAreas: ['communication_information'] },
      measures: [],
    },
    {
      id: 'e11',
      errandNumber: `${application}-2026-0011`,
      status: 'INQUIRY',
      created: '2026-05-24T10:00:00.000+02:00',
      labels: [misconduct, sol, ...unit('Granlunda 2')],
      investigation: {
        riskValueSolLss: 9,
        causeAreas: ['procedures_routines_guidelines'],
        ivoNotification: 'yes',
        decidedMisconductDegree: 'serious_misconduct',
      },
      measures: [
        {
          id: 'm1',
          type: 'EDUCATION',
          addedByUser: 'kctest',
          accept: 'TRUE',
          plannedStart: '2026-02-01',
          executed: '2026-03-02',
          result: 'COMPLETED',
          description: 'Utbilda personalen i bemötande',
          goal: 'Inga fler klagomål',
          resultText: 'Utbildningen genomfördes.',
        },
        { id: 'm2', type: 'DISCIPLINARY', addedByUser: 'kctest', accept: 'TRUE' },
      ],
    },
    {
      id: 'e10',
      errandNumber: `${application}-2026-0010`,
      status: 'SOLVED',
      created: '2026-05-17T08:00:00.000+02:00',
      labels: [deviation, hsl, ...unit('Granlunda 1')],
      investigation: { riskValueHsl: 6, causeAreas: ['procedures_routines_guidelines'], ivoNotification: 'no' },
      measures: [{ id: 'm3', type: 'EDUCATION', accept: 'TRUE', executed: '2026-04-05', result: 'NOT_COMPLETED' }],
    },
  ],
  measureTypes: [
    { name: 'EDUCATION', displayName: 'Utbildning' },
    { name: 'DISCIPLINARY', displayName: 'Disciplinåtgärd' },
  ],
  truncated: false,
};

const jsonRoute = (page: Page, pattern: string | RegExp, body: unknown) =>
  page.route(pattern, (route: Route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
  );

const latestSchema = (page: Page, request: { name: string; version: string; value: unknown }) =>
  jsonRoute(page, `**/2281/schemas/${request.name}/latest`, {
    data: { id: `2281_${request.name}_${request.version}`, name: request.name, version: request.version, value: request.value },
    message: 'success',
  });

async function installFollowUp(page: Page) {
  const reads: URL[] = [];
  await page.context().addCookies([{ name: 'connect.sid', value: 'test-session', domain: 'localhost', path: '/' }]);
  await jsonRoute(page, '**/administrators', mockAdmins);
  await jsonRoute(page, '**/me', mockMe);
  await jsonRoute(page, '**/featureflags', [
    { name: 'isSupportManagement', enabled: true },
    { name: 'useInvestigation', enabled: true },
    { name: 'useAvvikelseInvestigation', enabled: true },
  ]);
  await jsonRoute(page, '**/users/admins', { data: [] });
  await jsonRoute(page, '**/supportnotifications/2281', []);
  await jsonRoute(page, '**/supportmanagement/investigation-profile', defaultInvestigationProfile());
  await mockStatusGroupCounts(page, 0);
  await jsonRoute(page, '**/supportmetadata/2281', {
    categories: [],
    types: [],
    statuses: [
      { name: 'INQUIRY', displayName: 'Pågående' },
      { name: 'SOLVED', displayName: 'Avslutat' },
    ],
    labels: { labelStructure: [] },
  });
  await jsonRoute(page, /\/supporterrands\/2281\?/, emptyErrandPage);
  await latestSchema(page, { name: managerRequest.name, version: managerRequest.version, value: managerRequest.value });
  await latestSchema(page, { name: lexRequest.name, version: lexRequest.version, value: lexRequest.value });
  await latestSchema(page, { name: lexDecisionRequest.name, version: lexDecisionRequest.version, value: lexDecisionRequest.value });
  await page.route('**/supportfollowup/2281/units?**', async (route) => {
    reads.push(new URL(route.request().url()));
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(snapshot) });
  });
  return reads;
}

async function openFollowUp(page: Page, dismissCookieConsent: () => Promise<void>) {
  await page.goto('oversikt/');
  await dismissCookieConsent();
  await page.locator('[data-cy="follow-up-button"]').click();
  await expect(page.locator('[data-cy="unit-follow-up"]').getByRole('heading', { level: 1 })).toHaveText('Enheter');
}

const errandRows = (page: Page) => page.locator('[data-cy="follow-up-errands-table"] tbody tr');
const summary = (page: Page) => page.locator('[data-cy="follow-up-summary"]');

test.describe('Verksamhetsuppföljning - Enheter', () => {
  test.afterEach(async ({ page }) => {
    await page.unrouteAll({ behavior: 'ignoreErrors' });
  });

  test('visar de senaste tolv månadernas ärenden, nyaste först, med utredningarnas värden', async ({
    page,
    dismissCookieConsent,
  }) => {
    const reads = await installFollowUp(page);
    await openFollowUp(page, dismissCookieConsent);

    await expect(page.locator('[data-cy="follow-up-period"]')).toContainText('Visar de senaste 12 månaderna');
    expect(reads.length).toBeGreaterThanOrEqual(1);
    expect(reads[0].searchParams.get('from')).toMatch(/^\d{4}-\d{2}-\d{2}$/u);
    expect(reads[0].searchParams.get('to')).toMatch(/^\d{4}-\d{2}-\d{2}$/u);

    await expect(summary(page)).toHaveText('Visar 3 ärenden');
    await expect(errandRows(page)).toHaveCount(3);
    const first = errandRows(page).first();
    await expect(first).toContainText('Granlunda 2');
    await expect(first).toContainText('Missförhållande');
    // Titles come from the current schema, not the stored code.
    await expect(first).toContainText('Processer, rutiner, arbetssätt, riktlinjer');
    await expect(first).toContainText('2026-05-24');
    await expect(first).toContainText('9');
    await expect(first).toContainText('Allvarligt missförhållande');
    await expect(first).toContainText('2 stycken');
    await expect(errandRows(page).nth(1)).toContainText('2026-05-17');
  });

  test('filtrerar på rapporttyp, riskvärde och enhet, och Rensa alla visar allt igen', async ({
    page,
    dismissCookieConsent,
  }) => {
    await installFollowUp(page);
    await openFollowUp(page, dismissCookieConsent);

    await page.locator('[data-cy="follow-up-filter-report-type"]').click();
    // The checkbox's drawn box sits over the input and takes the pointer; a user clicks that box.
    await page.locator('[data-cy="follow-up-filter-report-type-abuse"]').check({ force: true });
    await page.keyboard.press('Escape');
    await expect(summary(page)).toHaveText('Visar 1 ärende');
    await expect(errandRows(page)).toHaveCount(1);

    await page.locator('[data-cy="follow-up-filter-clear"]').click();
    await expect(summary(page)).toHaveText('Visar 3 ärenden');

    // The risk values offered are the ones probability times severity can give.
    const riskHsl = page.locator('[data-cy="follow-up-filter-risk-hsl"]');
    await expect(riskHsl.locator('option')).toHaveCount(10);
    await riskHsl.selectOption('6');
    await expect(errandRows(page)).toHaveCount(1);
    await expect(errandRows(page).first()).toContainText('2026-05-17');
    await page.locator('[data-cy="follow-up-filter-clear"]').click();

    await page.getByRole('textbox', { name: 'Sök enhet' }).fill('granlunda 1');
    await expect(errandRows(page)).toHaveCount(2);
  });

  test('listar ärendenas åtgärder med status och effekt, och fäller ut en åtgärd', async ({
    page,
    dismissCookieConsent,
  }) => {
    await installFollowUp(page);
    await openFollowUp(page, dismissCookieConsent);

    await page.locator('[data-cy="follow-up-tab-measures"]').click();
    await expect(summary(page)).toHaveText('Visar 3 åtgärder');
    const table = page.locator('[data-cy="follow-up-measures-table"]');
    // Sorted on type: Disciplinåtgärd before Utbildning.
    await expect(table.locator('tbody tr').first()).toContainText('Disciplinåtgärd');
    await expect(table.locator('tbody tr').first()).toContainText('Planerad');

    await page.locator('[data-cy="follow-up-filter-effect"]').click();
    // The checkbox's drawn box sits over the input and takes the pointer; a user clicks that box.
    await page.locator('[data-cy="follow-up-filter-effect-yes"]').check({ force: true });
    await page.keyboard.press('Escape');
    await expect(summary(page)).toHaveText('Visar 1 åtgärd');
    const executed = table.locator('tbody tr').first();
    await expect(executed).toContainText('Utbildning');
    await expect(executed).toContainText('Genomförd');
    await expect(executed).toContainText('2026-02-01');
    await expect(executed).toContainText('2026-03-02');
    await expect(executed.getByRole('link', { name: `${application}-2026-0011` })).toHaveAttribute('target', '_blank');

    await executed.getByRole('button', { name: /Visa åtgärden/u }).click();
    await expect(page.locator('[data-cy="follow-up-measure-details-e11:m1"]')).toContainText('Utbildningen genomfördes.');
  });
});
