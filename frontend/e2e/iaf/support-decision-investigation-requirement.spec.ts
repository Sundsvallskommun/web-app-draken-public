import type { Page } from '@playwright/test';

import { expect, test } from '../fixtures/base.fixture';
import {
  errandNumber,
  existingManagerDocument,
  installIafApiMock,
  type IafApiScenario,
} from './fixtures/investigation-flow.mock';

test.skip(!['IAF', 'VOF'].includes(process.env.NEXT_PUBLIC_APPLICATION ?? ''), 'Körs med IAF/VOF-profilen.');

/**
 * The errand is being investigated and the investigation is on. Measures are off, so the move to the
 * decision asks nothing about them and the phase button is the only thing between the errand and the
 * decision. Signed in as the handler, so the sidebar is the handler's to use.
 */
async function installInvestigatedErrand(
  page: Page,
  {
    eventType = 'AVVIKELSE',
    managerValue = {},
    lexValue,
    roleKeys,
    activePhaseName = 'INVESTIGATION',
    useMeasures = false,
    ...scenario
  }: {
    eventType?: 'AVVIKELSE' | 'MISSFORHALLANDE';
    managerValue?: Record<string, unknown>;
    lexValue?: Record<string, unknown>;
    roleKeys?: string[];
    activePhaseName?: IafApiScenario['activePhaseName'];
    useMeasures?: boolean;
  } & Pick<IafApiScenario, 'administrators' | 'assignedBy' | 'measuresCloseRefusal'>
) {
  const manager = existingManagerDocument();
  manager.value = { ...manager.value, ...managerValue };
  return installIafApiMock(page, {
    ...scenario,
    activePhaseName,
    assignedUserId: 'iaf.test',
    eventType,
    roleKeys,
    featureFlags: [
      { name: 'isSupportManagement', enabled: true },
      { name: 'useUiPhases', enabled: true },
      { name: 'useMeasures', enabled: useMeasures },
      { name: 'useInvestigation', enabled: true },
      // A served flag list switches off every flag it leaves out, the capability included.
      { name: 'useAvvikelseInvestigation', enabled: true },
    ],
    documents: {
      'utredning-enhetschef': manager,
      ...(lexValue
        ? {
            'utredning-sol-lss': {
              ...manager,
              key: 'utredning-sol-lss',
              schemaId: '2281_utredning-sol-lss_1.4',
              value: lexValue,
            },
          }
        : {}),
    },
  });
}

const nextPhaseButton = (page: Page) => page.locator('[data-cy="next-phase-button"]');
const requirementDialog = (page: Page) => page.locator('[data-cy="investigation-completion-requirement"]');

async function visitErrand(page: Page, dismissCookieConsent: () => Promise<void>) {
  const errandResponse = page.waitForResponse(
    (response) => response.url().includes(`/supporterrands/errandnumber/${errandNumber}`) && response.status() === 200
  );
  await page.goto(`arende/${errandNumber}`);
  await errandResponse;
  await dismissCookieConsent();
  await expect(nextPhaseButton(page)).toBeEnabled();
}

test("an unfinished unit manager's investigation holds the errand in Utredning and says which one to finish", async ({
  page,
  dismissCookieConsent,
}) => {
  const trace = await installInvestigatedErrand(page, { managerValue: { completed: 'no' } });
  await visitErrand(page, dismissCookieConsent);

  await expect(nextPhaseButton(page)).toHaveText('Utredningen är inte klar');
  await nextPhaseButton(page).click();
  await expect(requirementDialog(page)).toContainText(
    'Utredning enhetschef måste vara markerad som klar och sparad innan ärendet kan skickas till beslut.'
  );
  await requirementDialog(page).getByRole('button', { name: 'Stäng', exact: true }).click();

  await expect(requirementDialog(page)).toHaveCount(0);
  expect(trace.phasePatches).toEqual([]);
});

test("a completed unit manager's investigation sends the errand to the decision", async ({
  page,
  dismissCookieConsent,
}) => {
  const trace = await installInvestigatedErrand(page, { managerValue: { completed: 'yes' } });
  await visitErrand(page, dismissCookieConsent);

  await expect(nextPhaseButton(page)).toHaveText('Redo för beslut');
  await nextPhaseButton(page).click();

  await expect.poll(() => trace.phasePatches.length).toBe(1);
  await expect(requirementDialog(page)).toHaveCount(0);
});

test("a reported misconduct waits for the lex Sarah investigation, not the unit manager's", async ({
  page,
  dismissCookieConsent,
}) => {
  const trace = await installInvestigatedErrand(page, {
    eventType: 'MISSFORHALLANDE',
    managerValue: { completed: 'yes' },
    lexValue: { completed: 'no' },
  });
  await visitErrand(page, dismissCookieConsent);

  await expect(nextPhaseButton(page)).toHaveText('Utredningen är inte klar');
  await nextPhaseButton(page).click();
  await expect(requirementDialog(page)).toContainText('beslutas på Utredning Lex Sarah');
  expect(trace.phasePatches).toEqual([]);
});

test('a LEX investigator hands the errand to a LEX manager rather than sending it to the decision', async ({
  page,
  dismissCookieConsent,
}) => {
  const trace = await installInvestigatedErrand(page, {
    eventType: 'MISSFORHALLANDE',
    managerValue: { completed: 'yes' },
    // A finished investigation does not let the investigator through either.
    lexValue: { completed: 'yes' },
    roleKeys: ['lex-utredare'],
  });
  await visitErrand(page, dismissCookieConsent);

  await expect(nextPhaseButton(page)).toHaveText('Tilldela LEX-ansvarig');
  await nextPhaseButton(page).click();
  const dialog = page.locator('[data-cy="handler-assignment-modal"]');
  await expect(dialog).toContainText('Som LEX-utredare skickar du inte ärendet till beslut.');
  expect(trace.phasePatches).toEqual([]);
});

// The investigator hands the errand back to the LEX manager who gave it to them, not to whoever sorts first.
test("a LEX investigator's handover offers first the LEX manager who gave them the errand", async ({
  page,
  dismissCookieConsent,
}) => {
  const trace = await installInvestigatedErrand(page, {
    eventType: 'MISSFORHALLANDE',
    managerValue: { completed: 'yes' },
    lexValue: { completed: 'yes' },
    roleKeys: ['lex-utredare'],
    administrators: [
      { name: 'iaf.test', displayName: 'Testare Iaf', guid: 'guid-investigator', roleKeys: ['lex-utredare'] },
      { name: 'lex.first', displayName: 'Anna Ahlberg', guid: 'guid-first', roleKeys: ['lex-ansvarig'] },
      { name: 'lex.giver', displayName: 'Örjan Östberg', guid: 'guid-giver', roleKeys: ['lex-ansvarig'] },
    ],
    // The history names the account as Support Management recorded it, which need not match its case.
    assignedBy: 'LEX.GIVER',
  });
  await visitErrand(page, dismissCookieConsent);

  await nextPhaseButton(page).click();
  const dialog = page.locator('[data-cy="handler-assignment-modal"]');
  await expect(dialog.getByRole('combobox')).toHaveValue('lex.giver');
  await dialog.locator('[data-cy="handler-assignment-confirm"]').click();

  await expect.poll(() => trace.adminPatches).toEqual(['lex.giver']);
  expect(trace.phasePatches).toEqual([]);
});

test('a LEX manager sends the finished lex Sarah investigation to the decision', async ({
  page,
  dismissCookieConsent,
}) => {
  const trace = await installInvestigatedErrand(page, {
    eventType: 'MISSFORHALLANDE',
    managerValue: { completed: 'yes' },
    lexValue: { completed: 'yes' },
    roleKeys: ['lex-ansvarig'],
  });
  await visitErrand(page, dismissCookieConsent);

  await expect(nextPhaseButton(page)).toHaveText('Redo för beslut');
  await nextPhaseButton(page).click();
  await expect.poll(() => trace.phasePatches.length).toBe(1);
});

/** The follow-up is the unit's: LEX hands the decided errand back to its manager, who starts it. */
test('a LEX manager is held back from starting the follow-up and told to hand the errand back', async ({
  page,
  dismissCookieConsent,
}) => {
  const trace = await installInvestigatedErrand(page, {
    eventType: 'MISSFORHALLANDE',
    activePhaseName: 'DECISION',
    roleKeys: ['lex-ansvarig'],
  });
  await visitErrand(page, dismissCookieConsent);

  await expect(nextPhaseButton(page)).toHaveText('Uppföljningen görs av enheten');
  await nextPhaseButton(page).click();
  const dialog = page.locator('[data-cy="lex-follow-up-requirement"]');
  await expect(dialog).toContainText('Återlämna det till chefen med Återlämna till chef längst ned i beslutet');
  await dialog.getByRole('button', { name: 'Stäng', exact: true }).last().click();

  await expect(dialog).toHaveCount(0);
  expect(trace.phasePatches).toEqual([]);
});

test('the unit manager starts the follow-up', async ({ page, dismissCookieConsent }) => {
  const trace = await installInvestigatedErrand(page, { activePhaseName: 'DECISION', roleKeys: ['enhetschef'] });
  await visitErrand(page, dismissCookieConsent);

  await expect(nextPhaseButton(page)).toHaveText('Inled uppföljning');
  await nextPhaseButton(page).click();
  await expect.poll(() => trace.phasePatches.length).toBe(1);
});

/** The errand is closed once every measure is reported in the follow-up, and the button says what is missing until then. */
test('closing waits for the measures and says what is missing', async ({ page, dismissCookieConsent }) => {
  const refusal = 'Ärendet kan inte avslutas förrän alla åtgärder är hanterade: 1 åtgärd är inte uppföljd.';
  await installInvestigatedErrand(page, {
    activePhaseName: 'FOLLOW_UP',
    roleKeys: ['enhetschef'],
    useMeasures: true,
    measuresCloseRefusal: refusal,
  });
  const errandResponse = page.waitForResponse(
    (response) => response.url().includes(`/supporterrands/errandnumber/${errandNumber}`) && response.status() === 200
  );
  await page.goto(`arende/${errandNumber}`);
  await errandResponse;
  await dismissCookieConsent();

  await expect(nextPhaseButton(page)).toHaveText('Avsluta ärendet');
  await expect(page.locator('[data-cy="measures-close-refusal"]')).toHaveText(refusal);
  await expect(nextPhaseButton(page)).toBeDisabled();
});

test('closing is offered once every measure is handled', async ({ page, dismissCookieConsent }) => {
  await installInvestigatedErrand(page, { activePhaseName: 'FOLLOW_UP', roleKeys: ['enhetschef'], useMeasures: true });
  await visitErrand(page, dismissCookieConsent);

  await expect(nextPhaseButton(page)).toHaveText('Avsluta ärendet');
  await expect(page.locator('[data-cy="measures-close-refusal"]')).toHaveCount(0);
});
