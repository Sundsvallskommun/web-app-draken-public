import type { Page } from '@playwright/test';

import { expect, test } from '../fixtures/base.fixture';
import { errandNumber, existingManagerDocument, installIafApiMock } from './fixtures/investigation-flow.mock';

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
  }: {
    eventType?: 'AVVIKELSE' | 'MISSFORHALLANDE';
    managerValue?: Record<string, unknown>;
    lexValue?: Record<string, unknown>;
    roleKeys?: string[];
  }
) {
  const manager = existingManagerDocument();
  manager.value = { ...manager.value, ...managerValue };
  return installIafApiMock(page, {
    activePhaseName: 'INVESTIGATION',
    assignedUserId: 'iaf.test',
    eventType,
    roleKeys,
    featureFlags: [
      { name: 'isSupportManagement', enabled: true },
      { name: 'useUiPhases', enabled: true },
      { name: 'useMeasures', enabled: false },
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
