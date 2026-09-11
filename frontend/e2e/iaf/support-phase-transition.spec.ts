import type { Measure } from '../../src/common/data-contracts/supportmanagement/data-contracts';
import type { MeasuresSnapshot } from '../../src/supportmanagement/measures/support-measure-service';
import type { Page } from '@playwright/test';

import { expect, test } from '../fixtures/base.fixture';
import {
  errandNumber,
  installIafApiMock,
  workflowTransitionId,
  type WorkflowPhaseName,
} from './fixtures/investigation-flow.mock';

test.skip(!['IAF', 'VOF'].includes(process.env.NEXT_PUBLIC_APPLICATION ?? ''), 'Körs med IAF/VOF-profilen.');

const existingMeasure: Measure = {
  id: 'existing',
  measureTypeId: 'dd000000-0000-4000-8000-000000000100',
  type: 'TRAINING',
  version: 1,
  goal: 'Säkrare arbetssätt',
  description: 'Gemensam utbildning',
  addedByRole: 'MANAGER',
  addedByUser: 'iaf.test',
  created: '2026-09-09T13:39:54+02:00',
};

/**
 * The errand sits in `activePhase` and the measures endpoint answers with `measures`, or refuses
 * when `denyRead` is set. The measures feature is on unless `measuresEnabled` says otherwise, and
 * the phase strip is always on: it is what the spec is about.
 */
async function installPhases(
  page: Page,
  {
    activePhase = 'INVESTIGATION',
    measures = [],
    measuresEnabled = true,
    denyRead = false,
  }: { activePhase?: WorkflowPhaseName; measures?: Measure[]; measuresEnabled?: boolean; denyRead?: boolean } = {}
) {
  const trace = await installIafApiMock(page, {
    activePhaseName: activePhase,
    featureFlags: [
      { name: 'isSupportManagement', enabled: true },
      { name: 'useUiPhases', enabled: true },
      { name: 'useMeasures', enabled: measuresEnabled },
      { name: 'useInvestigation', enabled: false },
    ],
  });
  let reads = 0;
  const snapshot: MeasuresSnapshot = {
    measures,
    errandVersion: 7,
    metadata: { measureTypes: [], roles: [] },
    creationRoles: [],
    registration: { status: 'unconfigured', roleTypes: [] },
  };
  await page.route(/\/supporterrands\/[^/]+\/[^/]+\/measures$/, async (route) => {
    if (route.request().method() !== 'GET') {
      await route.fallback();
      return;
    }
    reads++;
    await route.fulfill(denyRead ? { status: 403, json: { message: 'Denied' } } : { json: snapshot });
  });
  return { trace, reads: () => reads };
}

const nextPhaseButton = (page: Page) => page.getByRole('button', { name: 'Nästa fas', exact: true });
const confirmation = (page: Page) => page.getByRole('dialog').filter({ hasText: 'Gå till beslutsfasen?' });
/** The strip names three phases around the active one, so the names on show say where the errand is. */
const phaseStrip = (page: Page) => page.locator('[data-cy="phase-strip"]');

async function visitErrand(page: Page, dismissCookieConsent: () => Promise<void>) {
  const errandResponse = page.waitForResponse(
    (response) => response.url().includes(`/supporterrands/errandnumber/${errandNumber}`) && response.status() === 200
  );
  await page.goto(`arende/${errandNumber}`);
  await errandResponse;
  await dismissCookieConsent();
  await expect(nextPhaseButton(page)).toBeEnabled();
}

test('asks before entering the decision phase without measures, and Nej leaves the phase alone', async ({
  page,
  dismissCookieConsent,
}) => {
  const state = await installPhases(page);
  await visitErrand(page, dismissCookieConsent);
  await expect(phaseStrip(page)).toContainText('Utredning');
  await expect(phaseStrip(page)).not.toContainText('Uppföljning');

  await nextPhaseButton(page).click();
  await expect(confirmation(page)).toBeVisible();
  await expect(confirmation(page)).toContainText(
    'Vill du verkligen gå till beslutsfasen utan att ha skapat några åtgärder?'
  );
  await confirmation(page).getByRole('button', { name: 'Nej', exact: true }).click();

  await expect(confirmation(page)).toHaveCount(0);
  expect(state.trace.phasePatches).toEqual([]);
  expect(state.reads()).toBe(1);
  await expect(phaseStrip(page)).not.toContainText('Uppföljning');
  await expect(nextPhaseButton(page)).toBeEnabled();
});

test('Ja moves the errand into the decision phase through the named transition', async ({
  page,
  dismissCookieConsent,
}) => {
  const state = await installPhases(page);
  await visitErrand(page, dismissCookieConsent);

  await nextPhaseButton(page).click();
  await confirmation(page).getByRole('button', { name: 'Ja, byt fas', exact: true }).click();

  await expect(confirmation(page)).toHaveCount(0);
  await expect(phaseStrip(page)).toContainText('Uppföljning');
  expect(state.trace.phasePatches).toEqual([{ transitionId: workflowTransitionId('DECISION'), expectedVersion: 7 }]);
});

test('moves straight into the decision phase when a measure is registered', async ({ page, dismissCookieConsent }) => {
  const state = await installPhases(page, { measures: [existingMeasure] });
  await visitErrand(page, dismissCookieConsent);

  await nextPhaseButton(page).click();

  await expect(phaseStrip(page)).toContainText('Uppföljning');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(state.reads()).toBe(1);
  expect(state.trace.phasePatches).toEqual([{ transitionId: workflowTransitionId('DECISION'), expectedVersion: 7 }]);
});

test('does not read measures for a transition into any other phase', async ({ page, dismissCookieConsent }) => {
  const state = await installPhases(page, { activePhase: 'REVIEW' });
  await visitErrand(page, dismissCookieConsent);

  await nextPhaseButton(page).click();

  await expect(phaseStrip(page)).toContainText('Beslut');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(state.reads()).toBe(0);
  expect(state.trace.phasePatches).toEqual([
    { transitionId: workflowTransitionId('INVESTIGATION'), expectedVersion: 7 },
  ]);
});

test('does not read measures when the measures feature is off', async ({ page, dismissCookieConsent }) => {
  const state = await installPhases(page, { measuresEnabled: false });
  await visitErrand(page, dismissCookieConsent);

  await nextPhaseButton(page).click();

  await expect(phaseStrip(page)).toContainText('Uppföljning');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(state.reads()).toBe(0);
  expect(state.trace.phasePatches).toEqual([{ transitionId: workflowTransitionId('DECISION'), expectedVersion: 7 }]);
});

test('keeps the phase and says so when the measures cannot be read', async ({ page, dismissCookieConsent }) => {
  const state = await installPhases(page, { denyRead: true });
  await visitErrand(page, dismissCookieConsent);

  await nextPhaseButton(page).click();

  await expect(page.getByText('Ärendets åtgärder kunde inte kontrolleras. Fasen ändrades inte.')).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(state.trace.phasePatches).toEqual([]);
  await expect(phaseStrip(page)).not.toContainText('Uppföljning');
  await expect(nextPhaseButton(page)).toBeEnabled();
});
