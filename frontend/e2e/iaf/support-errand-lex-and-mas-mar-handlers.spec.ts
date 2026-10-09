import type { Page } from '@playwright/test';

import { expect, test } from '../fixtures/base.fixture';
import { errandNumber, existingManagerDocument, installIafApiMock } from './fixtures/investigation-flow.mock';

test.skip(!['IAF', 'VOF'].includes(process.env.NEXT_PUBLIC_APPLICATION ?? ''), 'Körs med IAF/VOF-profilen.');

/**
 * Two more handlers in the sidebar. MAS/MAR record themselves, or a colleague, in an errand parameter beside the
 * assignee, on every errand they reach. And once the unit manager's investigation is saved as completed with a
 * suspected misconduct, LEX-ansvarig is among the handlers - giving the errand to one is the handover to LEX, not
 * an assignment. Who is offered is the BFF's to decide; here the client is held to what it does with the answer.
 */
const viewer = { name: 'iaf.test', displayName: 'Iaf Testare', guid: 'iaf-guid' };
const placeManager = { name: 'nora.chef', displayName: 'Nora Chef', guid: 'nora-guid', roleKeys: ['enhetschef'] };
const lexManager = { name: 'lena.lex', displayName: 'Lena LEX', guid: 'lena-guid', roleKeys: ['lex-ansvarig'] };
const masMar = { name: 'mia.mas', displayName: 'Mia MAS', guid: 'mia-guid', roleKeys: ['mas-mar'] };

async function installErrand(
  page: Page,
  {
    signedInAs = 'mas-mar',
    managerValue = {},
    offersLex = false,
    parameters,
  }: {
    signedInAs?: 'mas-mar' | 'enhetschef';
    managerValue?: Record<string, unknown>;
    offersLex?: boolean;
    parameters?: Array<{ key: string; values: string[]; version?: number }>;
  } = {}
) {
  const manager = existingManagerDocument();
  // A draft whose HSL risk is 2 × 3 = 6, above the threshold of 4.
  manager.value = { ...manager.value, ...managerValue };
  // The unit manager holds the errand; MAS/MAR answers for its HSL side without being its handler.
  const assignee = signedInAs === 'enhetschef' ? viewer : placeManager;
  return installIafApiMock(page, {
    activePhaseName: 'INVESTIGATION',
    assignedUserId: assignee.name,
    roleKeys: [signedInAs],
    administrators: [{ ...viewer, roleKeys: [signedInAs] }, placeManager, lexManager, masMar],
    assignableHandlers: {
      handlers: [
        { ...assignee, roleKeys: ['UNIT_MANAGER'] },
        ...(offersLex ? [{ ...lexManager, handoverStep: 'assign-lex' }] : []),
      ],
      roles: [
        { key: 'UNIT_MANAGER', label: 'Enhetschef' },
        ...(offersLex ? [{ key: 'lex-ansvarig', label: 'LEX-ansvarig' }] : []),
      ],
    },
    parameters,
    featureFlags: [
      { name: 'isSupportManagement', enabled: true },
      { name: 'useUiPhases', enabled: true },
      { name: 'useMeasures', enabled: false },
      { name: 'useInvestigation', enabled: true },
      // A served flag list switches off every flag it leaves out, the capability included.
      { name: 'useAvvikelseInvestigation', enabled: true },
    ],
    documents: { 'utredning-enhetschef': manager },
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

const handlerSelect = (page: Page) => page.locator('[data-cy="admin-input"]');
const masMarSelect = (page: Page) => page.locator('[data-cy="mas-mar-input"]');
const saveButton = (page: Page) => page.locator('[data-cy="save-button"]');

test('MAS/MAR records the MAS/MAR handler in a parameter on an errand someone else handles', async ({
  page,
  dismissCookieConsent,
}) => {
  const trace = await installErrand(page);
  await visitErrand(page, dismissCookieConsent);

  // The errand is the unit manager's, and MAS/MAR need not be its handler to say who answers for the HSL side.
  await expect(handlerSelect(page)).toHaveValue('Nora Chef');
  await expect(masMarSelect(page)).toBeEnabled();
  // Only the MAS/MAR handlers of the directory are on offer, the signed-in one among them.
  await expect(masMarSelect(page).locator('option:not([value=""])')).toHaveText(['Iaf Testare', 'Mia MAS']);
  await masMarSelect(page).selectOption('mia.mas');
  await expect(saveButton(page)).toBeEnabled();
  await saveButton(page).click();

  // A new parameter is written on there being none; nothing assigns the errand.
  await expect
    .poll(() => trace.parameterPuts)
    .toEqual([{ key: 'masMarHandler', values: ['mia.mas'], ifNoneMatch: '*' }]);
  expect(trace.handovers).toEqual([]);
  await expect(masMarSelect(page)).toHaveValue('mia.mas');
  await expect(handlerSelect(page)).toHaveValue('Nora Chef');
});

test('a recorded MAS/MAR handler is shown, and a change is written on that parameter’s own version', async ({
  page,
  dismissCookieConsent,
}) => {
  const trace = await installErrand(page, {
    parameters: [{ key: 'masMarHandler', values: ['someone.gone'], version: 3 }],
  });
  await visitErrand(page, dismissCookieConsent);

  // One who no longer holds the role is still shown rather than silently dropped.
  await expect(masMarSelect(page)).toHaveValue('someone.gone');
  await masMarSelect(page).selectOption('mia.mas');
  await saveButton(page).click();

  await expect.poll(() => trace.parameterPuts).toEqual([{ key: 'masMarHandler', values: ['mia.mas'], ifMatch: '"3"' }]);
});

test('nobody but MAS/MAR is shown the MAS/MAR select', async ({ page, dismissCookieConsent }) => {
  await installErrand(page, { signedInAs: 'enhetschef' });
  await visitErrand(page, dismissCookieConsent);

  await expect(handlerSelect(page)).toBeEnabled();
  await expect(masMarSelect(page)).toHaveCount(0);
});

for (const [situation, managerValue] of [
  ['the investigation is completed', { completed: 'yes' }],
  ['the HSL risk is below 4', { riskAssessmentHsl: { probability: 1, severity: 3, calculatedRiskValue: 3 } }],
] as const) {
  test(`MAS/MAR is shown the MAS/MAR select when ${situation} too`, async ({ page, dismissCookieConsent }) => {
    await installErrand(page, { managerValue });
    await visitErrand(page, dismissCookieConsent);

    // Which errands MAS/MAR reach is AccessMapper's to say; on each of them they may record who answers for it.
    await expect(masMarSelect(page)).toBeEnabled();
  });
}

test('giving the errand to LEX-ansvarig is the handover to LEX', async ({ page, dismissCookieConsent }) => {
  const trace = await installErrand(page, {
    signedInAs: 'enhetschef',
    offersLex: true,
    managerValue: { completed: 'yes', suspectedMisconduct: 'yes' },
  });
  await visitErrand(page, dismissCookieConsent);

  await expect(handlerSelect(page).locator('optgroup[label="LEX-ansvarig"] option')).toHaveText(['Lena LEX']);
  await handlerSelect(page).selectOption({ label: 'Lena LEX' });
  await saveButton(page).click();

  // The named step rather than an assignment, and the page leaves the errand it can no longer reach.
  await expect(page).toHaveURL(/\/oversikt/u);
  expect(trace.handovers).toEqual([
    { step: 'assign-lex', expectedVersion: expect.any(Number), assignedUserId: 'lena.lex' },
  ]);
  expect(trace.parameterPuts).toEqual([]);
});
