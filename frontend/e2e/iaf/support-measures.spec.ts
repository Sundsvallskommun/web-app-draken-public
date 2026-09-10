import type { Measure } from '../../../src/common/data-contracts/supportmanagement/data-contracts';
import type { MeasureDecisionInput } from '../../../src/supportmanagement/measures/measure-decision';
import type {
  MeasureChanges,
  MeasuresSnapshot,
  NewMeasure,
} from '../../../src/supportmanagement/measures/support-measure-service';
import type { Page } from '@playwright/test';

import { expect, test } from '../fixtures/base.fixture';
import { errandNumber, installIafApiMock } from './fixtures/investigation-flow.mock';

test.skip(!['IAF', 'VOF'].includes(process.env.NEXT_PUBLIC_APPLICATION ?? ''), 'Körs med IAF/VOF-profilen.');

const firstTypeId = 'dd000000-0000-4000-8000-000000000100';
const secondTypeId = 'dd000000-0000-4000-8000-000000000101';
const oldTypeId = 'dd000000-0000-4000-8000-000000000102';

async function installMeasures(
  page: Page,
  {
    enabled = true,
    canEdit = true,
    failWrite = false,
    denyRead = false,
    noCreationRoles = false,
    singleCreationRole = false,
    registrationStatus = 'ready',
    reloadDelayMs = 0,
    foreignMeasure = false,
    existingDecision,
  }: {
    enabled?: boolean;
    canEdit?: boolean;
    failWrite?: boolean;
    denyRead?: boolean;
    noCreationRoles?: boolean;
    singleCreationRole?: boolean;
    registrationStatus?: MeasuresSnapshot['registration']['status'];
    /** Delays every read after the first, to observe what the tab shows while it reloads. */
    reloadDelayMs?: number;
    /** The existing measure was registered by another user. */
    foreignMeasure?: boolean;
    existingDecision?: Measure['accept'];
  } = {}
) {
  const trace = await installIafApiMock(page, {
    canEdit,
    featureFlags: [
      { name: 'isSupportManagement', enabled: true },
      { name: 'useMeasures', enabled },
      { name: 'useInvestigation', enabled: false },
    ],
  });
  const writes: Array<{ method: string; data: unknown; version?: string }> = [];
  let reads = 0;
  let errandVersion = 7;
  const measures: Measure[] = [
    {
      id: 'existing',
      measureTypeId: oldTypeId,
      type: 'OLD',
      version: 3,
      goal: 'Befintligt mål',
      description: 'Befintlig beskrivning',
      plannedStart: '2026-09-08T00:00:00Z',
      plannedComplete: '2026-09-10T00:00:00Z',
      addedByRole: 'MANAGER',
      addedByUser: foreignMeasure ? 'someone.else' : 'iaf.test',
      accept: existingDecision,
      acceptMotivation:
        existingDecision === 'REWORK'
          ? 'Genomför endast dokumentationsdelen, övrigt ingår i ordinarie arbete.'
          : undefined,
      created: '2026-09-09T13:39:54+02:00',
    },
  ];
  const metadata: MeasuresSnapshot['metadata'] = {
    roles: [
      { id: 'role-manager', name: 'MANAGER', displayName: 'Enhetschef' },
      { id: 'role-nurse', name: 'NURSE', displayName: 'HSL' },
    ],
    measureTypes: [
      {
        id: secondTypeId,
        name: 'SECOND',
        displayName: 'Handledning',
        measureGroups: ['Förebyggande', 'SHARED'],
        sortOrder: 2,
      },
      {
        id: firstTypeId,
        name: 'FIRST',
        displayName: 'Utbildning',
        measureGroups: ['Förebyggande', 'SHARED'],
        sortOrder: 1,
      },
      {
        id: oldTypeId,
        name: 'OLD',
        displayName: 'Tidigare åtgärdstyp',
        measureGroups: ['Förebyggande', 'SHARED'],
        deprecated: true,
      },
    ],
  };
  const creationRoles =
    noCreationRoles || registrationStatus !== 'ready'
      ? []
      : singleCreationRole
      ? metadata.roles.slice(0, 1)
      : metadata.roles;
  const registration: MeasuresSnapshot['registration'] = {
    status: registrationStatus,
    roleTypes:
      registrationStatus === 'ready'
        ? [
            { roleName: 'MANAGER', measureTypeIds: [firstTypeId, secondTypeId], decides: true },
            { roleName: 'NURSE', measureTypeIds: [firstTypeId], decides: false },
          ]
        : [],
  };
  await page.route(/\/supporterrands\/[^/]+\/[^/]+\/measures(?:\/[^/]+(?:\/decision)?)?$/, async (route) => {
    const request = route.request();
    if (request.method() === 'GET') {
      reads++;
      if (reads > 1 && reloadDelayMs > 0) await new Promise((resolve) => setTimeout(resolve, reloadDelayMs));
      await route.fulfill(
        denyRead
          ? { status: 403, json: { message: 'Denied' } }
          : { json: { measures, errandVersion, metadata, creationRoles, registration } }
      );
      return;
    }
    writes.push({ method: request.method(), data: request.postDataJSON(), version: request.headers()['if-match'] });
    if (failWrite) {
      await route.fulfill({ status: 412, json: { message: 'Stale version' } });
      return;
    }
    if (new URL(request.url()).pathname.endsWith('/decision')) {
      const decision: MeasureDecisionInput = request.postDataJSON();
      measures[0] = { ...measures[0], ...decision, version: (measures[0].version ?? 0) + 1 };
      errandVersion++;
      await route.fulfill({ status: 204 });
      return;
    }
    if (request.method() === 'POST') {
      const body: NewMeasure = request.postDataJSON();
      measures.push({
        ...body,
        id: 'new-measure',
        type: metadata.measureTypes.find((type) => type.id === body.measureTypeId)?.name,
        addedByUser: 'authenticated-user',
        accept: body.addedByRole === 'MANAGER' ? 'TRUE' : undefined,
        version: 0,
      });
      errandVersion++;
      await route.fulfill({ status: 204 });
      return;
    }
    const body: MeasureChanges = request.postDataJSON();
    measures[0] = {
      ...measures[0],
      ...body,
      type: metadata.measureTypes.find((type) => type.id === (body.measureTypeId ?? measures[0].measureTypeId))?.name,
      version: (measures[0].version ?? 0) + 1,
    };
    errandVersion++;
    await route.fulfill({ status: 204 });
  });
  return { writes, trace, reads: () => reads };
}

/** Next.js' route announcer is also role="alert", so alerts are read inside the tab panel only. */
const measuresAlert = (page: Page) => page.getByRole('tabpanel', { name: 'Åtgärder' }).getByRole('alert');
/** Editing happens in a modal; the page form is reserved for new measures. */
const editDialog = (page: Page) => page.getByRole('dialog', { name: 'Redigera åtgärd' });

async function openMeasures(page: Page, dismissCookieConsent: () => Promise<void>) {
  await page.goto('arende/' + errandNumber);
  await dismissCookieConsent();
  await page.getByRole('tab', { name: 'Åtgärder', exact: true }).click();
  await expect(page.getByText('Befintligt mål', { exact: true })).toBeVisible();
}

test('hides measures and makes no measure requests when the master flag is off', async ({
  page,
  dismissCookieConsent,
}) => {
  const state = await installMeasures(page, { enabled: false });
  await page.goto('arende/' + errandNumber);
  await dismissCookieConsent();
  await expect(page.getByRole('tab', { name: 'Grundinformation', exact: true })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Åtgärder', exact: true })).toHaveCount(0);
  expect(state.reads()).toBe(0);
});

test('creates a measure for an explicitly selected granted role independently of investigation', async ({
  page,
  dismissCookieConsent,
}) => {
  const state = await installMeasures(page);
  await openMeasures(page, dismissCookieConsent);
  await expect(page.getByRole('tab', { name: 'Utredning', exact: true })).toHaveCount(0);
  const roles = page.getByLabel('Registrera åtgärden för rollen (Obligatoriskt)', { exact: true });
  await expect(roles).toHaveValue('');
  await expect(roles.locator('option')).toHaveText(['Välj registreringsroll', 'Enhetschef', 'HSL']);
  const types = page.getByLabel('Åtgärd (Obligatoriskt)', { exact: true });
  await expect(types).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Lägg till åtgärd', exact: true })).toBeDisabled();
  await roles.selectOption('NURSE');
  await expect(page.getByRole('button', { name: 'Lägg till förslag till åtgärd', exact: true })).toBeVisible();
  await expect(page.locator('[data-cy="measure-proposal-notice"]')).toBeVisible();
  await expect(types).toBeEnabled();
  await expect(types.locator('option')).toHaveText(['Välj typ av åtgärd', 'Utbildning']);
  await types.selectOption(firstTypeId);
  // A proposing role cannot report executed measures, so only the planned option exists and it is preselected.
  await expect(page.getByLabel('Genomförd åtgärd', { exact: true })).toHaveCount(0);
  await expect(page.getByLabel('Planerad åtgärd', { exact: true })).toBeChecked();
  await expect(page.locator('[data-cy="measure-planned-only"]')).toBeVisible();
  await page.getByLabel('När ska åtgärden påbörjas? (Obligatoriskt)', { exact: true }).fill('2026-09-08');
  await page.getByLabel('När ska åtgärden vara klar? (Obligatoriskt)', { exact: true }).fill('2026-09-10');
  await page.getByLabel('Beskrivning av åtgärd (Obligatoriskt)', { exact: true }).fill('Gemensam utbildning');
  await page.getByLabel('Vad är målet med åtgärden? (Obligatoriskt)', { exact: true }).fill('Säkrare arbetssätt');
  await page.getByRole('button', { name: 'Lägg till förslag till åtgärd', exact: true }).click();
  await expect(page.getByText('Säkrare arbetssätt', { exact: true })).toBeVisible();
  expect(state.writes).toEqual([
    {
      method: 'POST',
      version: undefined,
      data: {
        measureTypeId: firstTypeId,
        addedByRole: 'NURSE',
        description: 'Gemensam utbildning',
        goal: 'Säkrare arbetssätt',
        plannedStart: expect.stringMatching(/^2026-09-08T00:00:00[+-]\d{2}:\d{2}$/),
        plannedComplete: expect.stringMatching(/^2026-09-10T00:00:00[+-]\d{2}:\d{2}$/),
      },
    },
  ]);
  const created = page
    .getByRole('list', { name: 'Registrerade åtgärder' })
    .getByRole('listitem')
    .filter({ has: page.getByRole('heading', { name: 'Utbildning', exact: true }) });
  await expect(created).toContainText('Skapad av authenticated-user (HSL)');
  await expect(created.getByText('Förslag', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Vad är målet med åtgärden? (Obligatoriskt)', { exact: true })).toHaveValue('');
  expect(state.trace.puts).toEqual([]);
  expect(state.trace.errandPatches).toEqual([]);
});

test('keeps existing measures editable when creation roles are unavailable', async ({ page, dismissCookieConsent }) => {
  const state = await installMeasures(page, { noCreationRoles: true });
  await openMeasures(page, dismissCookieConsent);
  await expect(
    page.getByText(
      'Du har ingen registreringsroll för åtgärder i den här verksamheten. Kontakta administratören om du behöver kunna lägga till åtgärder.'
    )
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Lägg till åtgärd', exact: true })).toHaveCount(0);
  await expect(page.getByRole('list', { name: 'Registrerade åtgärder' })).toContainText('(Enhetschef)');
  await expect(page.getByRole('button', { name: /^Redigera åtgärd/ })).toBeVisible();
  expect(state.writes).toEqual([]);
});

test('changes type using sorted metadata UUIDs and the measure ETag', async ({ page, dismissCookieConsent }) => {
  const state = await installMeasures(page);
  await openMeasures(page, dismissCookieConsent);
  await page.getByRole('button', { name: /^Redigera åtgärd/ }).click();
  const dialog = editDialog(page);
  await expect(dialog.getByRole('heading', { name: 'Redigera åtgärd', exact: true })).toBeVisible();
  await expect(dialog).toContainText('Åtgärden är registrerad för rollen Enhetschef');
  const types = dialog.getByLabel('Åtgärd (Obligatoriskt)', { exact: true });
  await expect(types.locator('option')).toHaveText([
    'Välj typ av åtgärd',
    'Utbildning',
    'Handledning',
    'Tidigare åtgärdstyp (utgången)',
  ]);
  await types.selectOption(firstTypeId);
  await dialog.getByRole('button', { name: 'Spara ändringar', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Utbildning', exact: true })).toBeVisible();
  expect(state.writes).toEqual([{ method: 'PATCH', version: '"3"', data: { measureTypeId: firstTypeId } }]);
  expect(state.trace.puts).toEqual([]);
  expect(state.trace.errandPatches).toEqual([]);
});

test('edits historic measures narrowly and uses the refreshed measure version for a second edit', async ({
  page,
  dismissCookieConsent,
}) => {
  const state = await installMeasures(page);
  await openMeasures(page, dismissCookieConsent);
  await page.getByRole('button', { name: /^Redigera åtgärd/ }).click();
  await expect(editDialog(page).getByLabel('Åtgärd (Obligatoriskt)', { exact: true })).toHaveValue(oldTypeId);
  await editDialog(page).getByLabel('Vad är målet med åtgärden? (Obligatoriskt)', { exact: true }).fill('Ändrat mål');
  await editDialog(page).getByRole('button', { name: 'Spara ändringar', exact: true }).click();
  await expect(page.getByText('Ändrat mål', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: /^Redigera åtgärd/ }).click();
  await editDialog(page).getByLabel('Vad är målet med åtgärden? (Obligatoriskt)', { exact: true }).fill('Nästa mål');
  await editDialog(page).getByRole('button', { name: 'Spara ändringar', exact: true }).click();
  await expect(page.getByText('Nästa mål', { exact: true })).toBeVisible();
  expect(state.writes).toEqual([
    { method: 'PATCH', version: '"3"', data: { goal: 'Ändrat mål' } },
    { method: 'PATCH', version: '"4"', data: { goal: 'Nästa mål' } },
  ]);
});

test('keeps the draft and reports a version conflict', async ({ page, dismissCookieConsent }) => {
  await installMeasures(page, { failWrite: true });
  await openMeasures(page, dismissCookieConsent);
  await page.getByRole('button', { name: /^Redigera åtgärd/ }).click();
  const dialog = editDialog(page);
  await dialog.getByLabel('Vad är målet med åtgärden? (Obligatoriskt)', { exact: true }).fill('Mitt osparade mål');
  await dialog.getByRole('button', { name: 'Spara ändringar', exact: true }).click();
  const alert = dialog.getByRole('alert');
  await expect(alert).toContainText('Åtgärden kunde inte sparas');
  await expect(alert).toContainText('uppdaterats av någon annan');
  await expect(alert).toBeFocused();
  await expect(dialog.getByLabel('Vad är målet med åtgärden? (Obligatoriskt)', { exact: true })).toHaveValue(
    'Mitt osparade mål'
  );
});

test('offers editing only for measures the current user registered', async ({ page, dismissCookieConsent }) => {
  await installMeasures(page, { foreignMeasure: true });
  await openMeasures(page, dismissCookieConsent);
  const cards = page.getByRole('list', { name: 'Registrerade åtgärder' }).getByRole('listitem');
  await expect(cards.first()).toContainText('Skapad av someone.else');
  await expect(page.getByRole('button', { name: /^Redigera åtgärd/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^Ta bort/ })).toHaveCount(0);
});

test('shows a read view without edit permission', async ({ page, dismissCookieConsent }) => {
  await installMeasures(page, { canEdit: false });
  await openMeasures(page, dismissCookieConsent);
  await expect(page.getByRole('button', { name: 'Lägg till åtgärd' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^Redigera åtgärd/ })).toHaveCount(0);
});

test('reports denied access instead of a falsely empty list', async ({ page, dismissCookieConsent }) => {
  await installMeasures(page, { denyRead: true });
  await page.goto('arende/' + errandNumber);
  await dismissCookieConsent();
  await page.getByRole('tab', { name: 'Åtgärder', exact: true }).click();
  await expect(measuresAlert(page)).toContainText('saknar behörighet att läsa åtgärder');
  await expect(page.getByText('Det finns inga åtgärder registrerade.')).toHaveCount(0);
});

test('changing registration role resets the type while preserving the draft text', async ({
  page,
  dismissCookieConsent,
}) => {
  await installMeasures(page);
  await openMeasures(page, dismissCookieConsent);
  const role = page.getByLabel('Registrera åtgärden för rollen (Obligatoriskt)', { exact: true });
  const type = page.getByLabel('Åtgärd (Obligatoriskt)', { exact: true });
  await role.selectOption('MANAGER');
  await type.selectOption(secondTypeId);
  await page.getByLabel('Beskrivning av åtgärd (Obligatoriskt)', { exact: true }).fill('Mitt utkast');
  await role.selectOption('NURSE');
  await expect(type).toHaveValue('');
  await expect(type.locator('option')).toHaveText(['Välj typ av åtgärd', 'Utbildning']);
  await expect(page.getByLabel('Beskrivning av åtgärd (Obligatoriskt)', { exact: true })).toHaveValue('Mitt utkast');
});

test('skips the role step and registers for the only granted role', async ({ page, dismissCookieConsent }) => {
  const state = await installMeasures(page, { singleCreationRole: true, reloadDelayMs: 800 });
  await openMeasures(page, dismissCookieConsent);
  await expect(page.getByLabel('Registrera åtgärden för rollen (Obligatoriskt)', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: '1. Välj registreringsroll' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: /Beskriv åtgärden/ })).toHaveCount(0);
  await expect(page.locator('[data-cy="measure-registration-role"]')).toHaveText(
    'Åtgärden registreras för rollen Enhetschef. Rollen kan inte ändras i efterhand.'
  );
  await expect(page.locator('[data-cy="measure-proposal-notice"]')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Lägg till åtgärd', exact: true })).toBeVisible();
  const types = page.getByLabel('Åtgärd (Obligatoriskt)', { exact: true });
  await expect(types).toBeEnabled();
  await expect(types.locator('option')).toHaveText(['Välj typ av åtgärd', 'Utbildning', 'Handledning']);
  await types.selectOption(secondTypeId);
  await page.getByLabel('Genomförd åtgärd', { exact: true }).check();
  await page.getByLabel('När genomfördes åtgärden? (Obligatoriskt)', { exact: true }).fill('2026-09-08');
  await page.getByLabel('Ansvarig för åtgärden', { exact: true }).fill(' Anna Andersson ');
  await page.getByLabel('Beskrivning av åtgärd (Obligatoriskt)', { exact: true }).fill('Handledning i teamet');
  await page.getByLabel('Vad är målet med åtgärden? (Obligatoriskt)', { exact: true }).fill('Tydligare rutiner');
  await page.getByRole('button', { name: 'Lägg till åtgärd', exact: true }).click();
  // The reload is still pending here (delayed read): the tab marks itself busy but keeps its content on screen.
  const busy = page.locator('[data-cy="support-measures-tab"] [aria-busy="true"]');
  await expect(busy).toBeVisible();
  expect(await page.getByLabel('Åtgärder laddas').count()).toBe(0);
  await expect(busy.getByRole('form', { name: 'Lägg till åtgärder' })).toBeVisible();
  await expect(busy).toHaveCount(0);
  await expect(page.getByText('Tydligare rutiner', { exact: true })).toBeVisible();
  await expect(page.getByText('Anna Andersson', { exact: true })).toBeVisible();
  expect(state.writes).toHaveLength(1);
  expect(state.writes[0].data).toMatchObject({
    measureTypeId: secondTypeId,
    addedByRole: 'MANAGER',
    responsibleUser: 'Anna Andersson',
  });
});

test('lists validation errors in an alert that links to the fields', async ({ page, dismissCookieConsent }) => {
  await installMeasures(page, { singleCreationRole: true });
  await openMeasures(page, dismissCookieConsent);
  await page.getByLabel('Beskrivning av åtgärd (Obligatoriskt)', { exact: true }).fill('Bara en beskrivning');
  await page.getByRole('button', { name: 'Lägg till åtgärd', exact: true }).click();
  const alert = measuresAlert(page);
  await expect(alert).toContainText('Kontrollera uppgifterna innan du sparar');
  await expect(alert).toBeFocused();
  await alert.getByRole('link', { name: 'Välj typ av åtgärd.' }).click();
  await expect(page.getByLabel('Åtgärd (Obligatoriskt)', { exact: true })).toBeFocused();
});

test('rejects an executed date in the future before saving', async ({ page, dismissCookieConsent }) => {
  const state = await installMeasures(page, { singleCreationRole: true });
  await openMeasures(page, dismissCookieConsent);
  await page.getByLabel('Åtgärd (Obligatoriskt)', { exact: true }).selectOption(firstTypeId);
  await page.getByLabel('Genomförd åtgärd', { exact: true }).check();
  const executed = page.getByLabel('När genomfördes åtgärden? (Obligatoriskt)', { exact: true });
  await expect(executed).toHaveAttribute('max', /^\d{4}-\d{2}-\d{2}$/);
  await executed.fill('2099-01-01');
  await page.getByLabel('Beskrivning av åtgärd (Obligatoriskt)', { exact: true }).fill('x');
  await page.getByLabel('Vad är målet med åtgärden? (Obligatoriskt)', { exact: true }).fill('y');
  await page.getByRole('button', { name: 'Lägg till åtgärd', exact: true }).click();
  await expect(measuresAlert(page)).toContainText('Genomfört datum kan inte ligga i framtiden.');
  expect(state.writes).toEqual([]);
});

test('filters the list by status, decision, role, type and text', async ({ page, dismissCookieConsent }) => {
  await installMeasures(page, { singleCreationRole: true, existingDecision: 'REWORK' });
  await openMeasures(page, dismissCookieConsent);
  // Add a second, executed measure so the filters have something to separate.
  await page.getByLabel('Åtgärd (Obligatoriskt)', { exact: true }).selectOption(firstTypeId);
  await page.getByLabel('Genomförd åtgärd', { exact: true }).check();
  await page.getByLabel('När genomfördes åtgärden? (Obligatoriskt)', { exact: true }).fill('2026-09-08');
  await page.getByLabel('Beskrivning av åtgärd (Obligatoriskt)', { exact: true }).fill('Genomgång av rutin');
  await page.getByLabel('Vad är målet med åtgärden? (Obligatoriskt)', { exact: true }).fill('Alla känner rutinen');
  await page.getByRole('button', { name: 'Lägg till åtgärd', exact: true }).click();
  const cards = page.getByRole('list', { name: 'Registrerade åtgärder' }).getByRole('listitem');
  await expect(cards).toHaveCount(2);
  const filters = page.getByRole('group', { name: 'Filtrera åtgärder' });
  const summary = page.locator('[data-cy="measure-filter-summary"]');
  await expect(summary).toHaveText('2 åtgärder.');

  await filters.getByLabel('Status', { exact: true }).selectOption('executed');
  await expect(cards).toHaveCount(1);
  await expect(cards.first().getByRole('heading', { name: 'Utbildning', exact: true })).toBeVisible();
  await expect(summary).toHaveText('Visar 1 av 2 åtgärder.');

  await filters.getByRole('button', { name: 'Rensa filter', exact: true }).click();
  await expect(cards).toHaveCount(2);
  await filters.getByLabel('Beslut', { exact: true }).selectOption('rework');
  await expect(cards.first().getByRole('heading', { name: 'Tidigare åtgärdstyp', exact: true })).toBeVisible();
  await expect(cards).toHaveCount(1);

  await filters.getByLabel('Sök', { exact: true }).fill('rutin');
  await expect(page.getByText('Inga åtgärder matchar filtret.')).toBeVisible();
  await filters.getByLabel('Beslut', { exact: true }).selectOption('');
  await expect(cards).toHaveCount(1);
  await expect(filters.getByLabel('Registrerad i rollen', { exact: true }).locator('option')).toHaveText([
    'Alla',
    'Enhetschef',
  ]);
});

test('asks before clearing a draft and keeps it when the user declines', async ({ page, dismissCookieConsent }) => {
  await installMeasures(page, { singleCreationRole: true });
  await openMeasures(page, dismissCookieConsent);
  const description = page.getByLabel('Beskrivning av åtgärd (Obligatoriskt)', { exact: true });
  await description.fill('Mitt utkast');
  await page.getByRole('button', { name: 'Rensa formuläret', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('Rensa formuläret?');
  await dialog.getByRole('button', { name: 'Nej, behåll', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(description).toHaveValue('Mitt utkast');
  await page.getByRole('button', { name: 'Rensa formuläret', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Ja, rensa', exact: true }).click();
  await expect(page.getByLabel('Beskrivning av åtgärd (Obligatoriskt)', { exact: true })).toHaveValue('');
});

test('clears an untouched form without asking', async ({ page, dismissCookieConsent }) => {
  await installMeasures(page, { singleCreationRole: true });
  await openMeasures(page, dismissCookieConsent);
  await page.getByRole('button', { name: 'Rensa formuläret', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: /Tillagda åtgärder/ })).toBeFocused();
});

test('shows each measure as a card with status, goal, date and creator with role', async ({
  page,
  dismissCookieConsent,
}) => {
  await installMeasures(page, { existingDecision: 'REWORK' });
  await openMeasures(page, dismissCookieConsent);
  const card = page.getByRole('list', { name: 'Registrerade åtgärder' }).getByRole('listitem');
  await expect(card).toHaveCount(1);
  await expect(card.getByRole('heading', { name: 'Tidigare åtgärdstyp', exact: true })).toBeVisible();
  await expect(card.getByText('Planerad', { exact: true })).toBeVisible();
  await expect(card.getByText('Delvis godkänd', { exact: true })).toBeVisible();
  await expect(card).toContainText('Befintlig beskrivning');
  await expect(card).toContainText('Mål: Befintligt mål');
  await expect(card).toContainText('Planerat datum: 2026-09-08 – 2026-09-10');
  await expect(card).toContainText('Skapad av iaf.test (Enhetschef) • 2026-09-09 13:39:54');
  await expect(card.getByRole('heading', { name: 'Detta ska justeras', exact: true })).toBeVisible();
  await expect(card).toContainText('Genomför endast dokumentationsdelen, övrigt ingår i ordinarie arbete.');
  await expect(card.getByRole('button', { name: /^Redigera åtgärd/ })).toBeVisible();
});

test('edits in a modal while the page form stays reserved for new measures', async ({ page, dismissCookieConsent }) => {
  await installMeasures(page);
  await openMeasures(page, dismissCookieConsent);
  await page.getByRole('button', { name: /^Redigera åtgärd/ }).click();
  const dialog = editDialog(page);
  await expect(dialog.getByRole('heading', { name: 'Redigera åtgärd', exact: true })).toBeVisible();
  await expect(page.getByRole('form', { name: 'Lägg till åtgärder' })).toHaveCount(1);
  await dialog.getByLabel('Vad är målet med åtgärden? (Obligatoriskt)', { exact: true }).fill('Påbörjad ändring');
  await dialog.getByRole('button', { name: 'Stäng', exact: true }).click();
  await page
    .getByRole('dialog')
    .filter({ hasText: 'Avbryt redigering?' })
    .getByRole('button', { name: 'Nej, behåll', exact: true })
    .click();
  await expect(dialog.getByLabel('Vad är målet med åtgärden? (Obligatoriskt)', { exact: true })).toHaveValue(
    'Påbörjad ändring'
  );
  await dialog.getByRole('button', { name: 'Avbryt redigering', exact: true }).click();
  await page
    .getByRole('dialog')
    .filter({ hasText: 'Avbryt redigering?' })
    .getByRole('button', { name: 'Ja, avbryt', exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByText('Befintligt mål', { exact: true })).toBeVisible();
});

for (const registrationStatus of ['unconfigured', 'invalid'] as const) {
  test(`keeps history available and explains ${registrationStatus} registration`, async ({
    page,
    dismissCookieConsent,
  }) => {
    const state = await installMeasures(page, { registrationStatus });
    await openMeasures(page, dismissCookieConsent);
    await expect(
      page.getByText(
        registrationStatus === 'unconfigured'
          ? 'Registrering av åtgärder är inte konfigurerad för den här verksamheten. Kontakta administratören. Du kan fortfarande läsa befintliga åtgärder.'
          : 'Inställningarna för åtgärdernas roller och typer behöver ses över. Kontakta administratören. Du kan fortfarande läsa befintliga åtgärder.'
      )
    ).toBeVisible();
    await page.getByRole('button', { name: /^Redigera åtgärd/ }).click();
    await editDialog(page).getByLabel('Vad är målet med åtgärden? (Obligatoriskt)').fill('Uppdaterat historiskt mål');
    await editDialog(page).getByRole('button', { name: 'Spara ändringar', exact: true }).click();
    expect(state.writes).toHaveLength(1);
    expect(state.writes[0].data).toEqual({ goal: 'Uppdaterat historiskt mål' });
  });
}

const decisionDialog = (page: Page) => page.getByRole('dialog', { name: 'Bedöm åtgärdsförslag' });

test('a manager can partially approve another author’s proposal without editing the original', async ({
  page,
  dismissCookieConsent,
}) => {
  const state = await installMeasures(page, { foreignMeasure: true });
  await openMeasures(page, dismissCookieConsent);
  await expect(page.getByRole('button', { name: /^Redigera åtgärd/ })).toHaveCount(0);
  await page.getByRole('button', { name: /^Bedöm förslag/ }).click();
  const dialog = decisionDialog(page);
  await expect(dialog).toContainText('Befintlig beskrivning');
  await expect(dialog).toContainText('Befintligt mål');
  await dialog.getByRole('radio', { name: 'Godkänn delvis', exact: true }).check();
  await dialog.getByRole('button', { name: 'Spara beslut', exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText('Skriv en kommentar till beslutet.');
  await expect(dialog.getByRole('alert')).toBeFocused();
  expect(state.writes).toEqual([]);
  const comment = 'Genomför endast dokumentationsdelen. Övriga delar finns redan i ordinarie arbete.';
  await dialog.getByLabel('Beslutskommentar (Obligatoriskt)', { exact: true }).fill(comment);
  await dialog.getByRole('button', { name: 'Spara beslut', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  const card = page.getByRole('list', { name: 'Registrerade åtgärder' }).getByRole('listitem');
  await expect(card.getByText('Delvis godkänd', { exact: true })).toBeVisible();
  await expect(card).toContainText(comment);
  await expect(card).toContainText('Befintlig beskrivning');
  await expect(card).toContainText('Befintligt mål');
  await expect(card).toContainText('Skapad av someone.else (Enhetschef)');
  await expect(card.getByRole('button', { name: /^Bedöm förslag/ })).toHaveCount(0);
  expect(state.writes).toEqual([
    { method: 'PATCH', version: '"3"', data: { accept: 'REWORK', acceptMotivation: comment } },
  ]);
  expect(state.trace.errandPatches).toEqual([]);
});

test('a decision conflict preserves the comment and does not retry', async ({ page, dismissCookieConsent }) => {
  const state = await installMeasures(page, { foreignMeasure: true, failWrite: true });
  await openMeasures(page, dismissCookieConsent);
  await page.getByRole('button', { name: /^Bedöm förslag/ }).click();
  const dialog = decisionDialog(page);
  await dialog.getByRole('radio', { name: 'Avslå', exact: true }).check();
  const comment = dialog.getByLabel('Beslutskommentar (Obligatoriskt)', { exact: true });
  await comment.fill('Förslaget ersätts av en redan beslutad åtgärd.');
  await dialog.getByRole('button', { name: 'Spara beslut', exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText('ladda om åtgärderna');
  await expect(comment).toHaveValue('Förslaget ersätts av en redan beslutad åtgärd.');
  expect(state.writes).toHaveLength(1);
});

test('does not offer decisions without a granted deciding role', async ({ page, dismissCookieConsent }) => {
  await installMeasures(page, { noCreationRoles: true });
  await openMeasures(page, dismissCookieConsent);
  await expect(page.getByRole('button', { name: /^Bedöm förslag/ })).toHaveCount(0);
});

test('partial approval locks the original content but lets its author report execution', async ({
  page,
  dismissCookieConsent,
}) => {
  const state = await installMeasures(page, { existingDecision: 'REWORK' });
  await openMeasures(page, dismissCookieConsent);
  await expect(page.getByRole('button', { name: /^Bedöm förslag/ })).toHaveCount(0);
  await page.getByRole('button', { name: /^Redigera åtgärd/ }).click();
  const dialog = editDialog(page);
  await expect(dialog.getByLabel('Åtgärd (Obligatoriskt)', { exact: true })).toBeDisabled();
  await expect(dialog.getByLabel('Beskrivning av åtgärd (Obligatoriskt)', { exact: true })).toHaveAttribute(
    'readonly',
    ''
  );
  await expect(dialog.getByLabel('Vad är målet med åtgärden? (Obligatoriskt)', { exact: true })).toHaveAttribute(
    'readonly',
    ''
  );
  await expect(dialog).toContainText('Genomför endast dokumentationsdelen');
  await dialog.getByLabel('Genomförd åtgärd', { exact: true }).check();
  await dialog.getByLabel('När genomfördes åtgärden? (Obligatoriskt)', { exact: true }).fill('2026-09-09');
  await dialog.getByRole('button', { name: 'Spara ändringar', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(
    page.getByRole('list', { name: 'Registrerade åtgärder' }).getByText('Genomförd', { exact: true })
  ).toBeVisible();
  expect(state.writes).toEqual([
    { method: 'PATCH', version: '"3"', data: { executed: expect.stringMatching(/^2026-09-09T00:00:00/) } },
  ]);
});
