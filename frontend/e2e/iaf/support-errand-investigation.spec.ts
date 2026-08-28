import type { Page } from '@playwright/test';

import { expect, test } from '../fixtures/base.fixture';
import {
  allExistingInvestigationDocuments,
  defaultInvestigationProfile,
  errandNumber,
  existingManagerDocument,
  iafLabelFixture,
  installIafApiMock,
  investigationKeys,
  katlaSchemaId,
  type MockLabel,
} from './fixtures/investigation-flow.mock';

const managerKey = 'utredning-enhetschef';
const solLssKey = 'utredning-sol-lss';
const managerProbabilityGroup = `#${managerKey}_riskAssessmentHsl_probability`;
const classificationFieldSelector = '[data-cy="schema-external-field-errandClassification"]';

test.skip(
  !['IAF', 'VOF'].includes(process.env.NEXT_PUBLIC_APPLICATION ?? ''),
  'Det riktiga utredningsflödet körs med IAF/VOF-profilen.'
);

async function visitErrand(page: Page, dismissCookieConsent: () => Promise<void>) {
  const errandResponse = page.waitForResponse(
    (response) => response.url().includes(`/supporterrands/errandnumber/${errandNumber}`) && response.status() === 200
  );
  await page.goto(`arende/${errandNumber}`);
  await errandResponse;
  await dismissCookieConsent();
}

async function openInvestigation(page: Page) {
  await page.getByRole('tab', { name: 'Utredning', exact: true }).click();
  await expect(page.locator('[data-cy="support-investigation-tab"]')).toBeVisible();
}

test.describe('IAF/VOF:s riktiga utredningsflöde', () => {
  test('hämtar inte den auth-skyddade profilen på login-sidan', async ({ page }) => {
    const trace = await installIafApiMock(page);

    await page.goto('login');

    await expect(page.locator('[data-cy="loginButton"]')).toBeVisible();
    expect(trace.profileGets).toBe(0);
  });

  test('visar klassificeringen endast i utredningen när utredningsfeaturen äger den', async ({
    page,
    dismissCookieConsent,
  }) => {
    await installIafApiMock(page, {
      documents: { [managerKey]: existingManagerDocument() },
      featureFlags: [
        { name: 'isSupportManagement', enabled: true },
        { name: 'useDetailsTab', enabled: true },
        { name: 'useTwoLevelCategorization', enabled: true },
        { name: 'useThreeLevelCategorization', enabled: true },
        { name: 'useInvestigation', enabled: true },
        { name: 'useAvvikelseInvestigation', enabled: true },
      ],
    });

    await visitErrand(page, dismissCookieConsent);
    await page.getByRole('tab', { name: 'Grundinformation', exact: true }).click();

    const basics = page.locator('[role="tabpanel"]:visible');
    await expect(basics.locator('[data-cy="category-input"]')).toHaveCount(0);
    await expect(basics.locator('[data-cy="type-input"]')).toHaveCount(0);
    await expect(basics.locator('[data-cy="avvikelse-label-categorization"]')).toHaveCount(0);

    await openInvestigation(page);
    await expect(page.locator(classificationFieldSelector)).toHaveCount(1);
  });

  test('renderar exakt de dokument som den aktuella appens profil tillåter', async ({ page, dismissCookieConsent }) => {
    const profile = defaultInvestigationProfile();
    const managerDocument = profile.documents.find(({ key }) => key === managerKey)!;
    const solLssDocument = profile.documents.find(({ key }) => key === solLssKey)!;
    profile.documents = [
      { ...solLssDocument, tabLabel: 'Först: SoL/LSS' },
      { ...managerDocument, tabLabel: 'Sedan: enhetschef' },
    ];
    const trace = await installIafApiMock(page, { investigationProfile: profile });

    await visitErrand(page, dismissCookieConsent);
    await openInvestigation(page);

    const investigation = page.locator('[data-cy="support-investigation-tab"]');
    await expect(investigation.getByRole('tab')).toHaveCount(2);
    await expect(investigation.getByRole('tab').nth(0)).toHaveText('Först: SoL/LSS');
    await expect(investigation.getByRole('tab').nth(1)).toHaveText('Sedan: enhetschef');
    await expect(investigation.getByRole('tab', { name: 'Utredning HSL', exact: true })).toHaveCount(0);
    await expect.poll(() => [...new Set(trace.documentGets)].sort()).toEqual([managerKey, solLssKey].sort());
  });

  test('håller dokumentnyckeln skild från schemanamnet', async ({ page, dismissCookieConsent }) => {
    const profile = defaultInvestigationProfile();
    profile.documents = [
      {
        key: 'manager-investigation',
        schemaName: 'utredning-enhetschef',
        tabLabel: 'Profilstyrd utredning',
        ownerLabel: 'Testroll',
        permissions: { canRead: true, canWrite: true },
      },
    ];
    const trace = await installIafApiMock(page, {
      documents: {},
      investigationProfile: profile,
    });

    await visitErrand(page, dismissCookieConsent);
    await openInvestigation(page);

    const investigation = page.locator('[data-cy="support-investigation-tab"]');
    await expect(investigation.getByRole('tab')).toHaveCount(1);
    await expect(investigation.getByRole('tab', { name: 'Profilstyrd utredning', exact: true })).toBeVisible();
    await expect(page.locator('[data-cy="investigation-document-manager-investigation"]')).toContainText(
      'Ansvarig roll: Testroll'
    );
    await expect.poll(() => [...new Set(trace.documentGets)]).toEqual(['manager-investigation']);
    await expect.poll(() => [...new Set(trace.latestSchemaNames)]).toEqual(['utredning-enhetschef']);
  });

  test('filtrerar en profilkonfigurerad dokumentnyckel från Ärendeuppgifter', async ({
    page,
    dismissCookieConsent,
  }) => {
    const profile = defaultInvestigationProfile();
    profile.documents = [
      {
        key: 'manager-investigation',
        schemaName: 'utredning-enhetschef',
        tabLabel: 'Profilstyrd utredning',
        ownerLabel: 'Testroll',
        permissions: { canRead: true, canWrite: true },
      },
    ];
    const existing = existingManagerDocument();
    existing.key = 'manager-investigation';
    existing.value.investigationText = '<p>SKA ENDAST VISAS UNDER PROFILENS UTREDNING</p>';
    await installIafApiMock(page, {
      documents: { 'manager-investigation': existing },
      investigationProfile: profile,
    });

    await visitErrand(page, dismissCookieConsent);
    await page.getByRole('tab', { name: 'Ärendeuppgifter', exact: true }).click();

    const details = page.getByRole('heading', { name: 'Ärendeuppgifter', exact: true }).locator('..');
    await expect(details.getByRole('textbox', { name: 'Händelse från Katla', exact: true })).toHaveValue(
      'Katla från web-app-katla-sm'
    );
    await expect(details).not.toContainText('SKA ENDAST VISAS UNDER PROFILENS UTREDNING');
  });

  test('behåller kategoriseringen i Grundinformation när IAF/VOF:s ägardokument saknas', async ({
    page,
    dismissCookieConsent,
  }) => {
    const profile = defaultInvestigationProfile();
    profile.documents = profile.documents.filter(({ schemaName }) => schemaName === 'utredning-enhetschef');
    const trace = await installIafApiMock(page, {
      documents: { [managerKey]: existingManagerDocument() },
      investigationProfile: profile,
    });

    await visitErrand(page, dismissCookieConsent);
    await expect(page.locator('[data-cy="avvikelse-label-categorization"]')).toBeVisible();
    await page
      .locator('[data-cy="label-classification-type"]')
      .selectOption(iafLabelFixture.classification.medication.resourcePath);
    await page
      .locator('[data-cy="label-classification-subtype"]')
      .selectOption(iafLabelFixture.classification.incorrectAdministration.resourcePath);
    await page
      .locator('[data-cy="manage-sidebar"] [data-cy="save-button"]')
      .filter({ hasText: 'Spara ärende' })
      .click();
    await expect.poll(() => trace.errandPatches.length).toBe(1);
    expect(trace.errandPatches[0]).toEqual(
      expect.objectContaining({
        classification: {
          category: iafLabelFixture.classification.hslOwner.resourcePath,
          type: iafLabelFixture.classification.medication.resourcePath,
        },
      })
    );

    await openInvestigation(page);
    await expect(page.locator(classificationFieldSelector)).toHaveCount(0);
    await page.locator(managerProbabilityGroup).getByLabel(/^1 –/u).check();
    await page.getByRole('button', { name: 'Spara utredning', exact: true }).click();

    await expect.poll(() => trace.puts.length).toBe(1);
    expect(trace.classificationPatches).toHaveLength(0);
  });

  test('faller säkert tillbaka när profilen gäller en annan app', async ({ page, dismissCookieConsent }) => {
    const existing = existingManagerDocument();
    existing.value.investigationText = '<p>BEFINTLIG UTREDNING SKA VARA SYNLIG</p>';
    const trace = await installIafApiMock(page, {
      documents: { [managerKey]: existing },
      investigationProfileResponse: {
        application: 'KC',
        state: 'inactive',
        registration: { mode: 'enabled' },
        documents: [],
      },
    });

    await visitErrand(page, dismissCookieConsent);

    await expect(page.locator('[data-cy="investigation-profile-error"]')).toBeVisible();
    // Gated on the capability flag, not on the profile: the tab stays and explains itself,
    // while the notice above the tab strip is what warns from any other tab.
    await expect(page.getByRole('tab', { name: 'Utredning', exact: true })).toHaveCount(1);
    await expect(page.locator('[data-cy="avvikelse-label-categorization"]')).toBeVisible();
    await expect(page.locator('[data-cy="label-classification-type"]')).toBeDisabled();

    await page.getByRole('tab', { name: 'Ärendeuppgifter', exact: true }).click();
    await expect(page.getByText('BEFINTLIG UTREDNING SKA VARA SYNLIG', { exact: false })).toBeVisible();
    expect(trace.profileGets).toBe(1);
  });

  test('låter orelaterade ärendefält sparas när klassificeringsägarskapet är otillgängligt', async ({
    page,
    dismissCookieConsent,
  }) => {
    const profile = defaultInvestigationProfile();
    profile.state = 'unavailable';
    const trace = await installIafApiMock(page, { investigationProfile: profile });

    await visitErrand(page, dismissCookieConsent);

    await expect(page.locator('[data-cy="investigation-profile-unavailable"]')).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Utredning', exact: true })).toHaveCount(1);
    await expect(page.locator('[data-cy="label-classification-type"]')).toBeDisabled();

    await page.locator('[data-cy="channel-input"]').selectOption('PHONE');
    await page
      .locator('[data-cy="manage-sidebar"] [data-cy="save-button"]')
      .filter({ hasText: 'Spara ärende' })
      .click();

    await expect.poll(() => trace.errandPatches.length).toBe(1);
    expect(trace.errandPatches[0]).toEqual(expect.objectContaining({ channel: 'PHONE' }));
    expect(trace.errandPatches[0]).not.toHaveProperty('classification');
    expect(trace.errandPatches[0]).not.toHaveProperty('labels');

    // Asserted last on purpose: opening Utredning hides Grundinformation, and the steps
    // above operate on it.
    await page.getByRole('tab', { name: 'Utredning', exact: true }).click();
    await expect(page.locator('[data-cy="investigation-tab-unavailable"]')).toBeVisible();
  });

  test('låter orelaterade ärendefält sparas när profilhämtningen misslyckas', async ({
    page,
    dismissCookieConsent,
  }) => {
    const trace = await installIafApiMock(page, { investigationProfileStatus: 500 });

    await visitErrand(page, dismissCookieConsent);

    await expect(page.locator('[data-cy="investigation-profile-error"]')).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Utredning', exact: true })).toHaveCount(1);
    await expect(page.locator('[data-cy="label-classification-type"]')).toBeDisabled();

    await page.locator('[data-cy="channel-input"]').selectOption('PHONE');
    await page
      .locator('[data-cy="manage-sidebar"] [data-cy="save-button"]')
      .filter({ hasText: 'Spara ärende' })
      .click();

    await expect.poll(() => trace.errandPatches.length).toBe(1);
    expect(trace.errandPatches[0]).toEqual(expect.objectContaining({ channel: 'PHONE' }));
    expect(trace.errandPatches[0]).not.toHaveProperty('classification');
    expect(trace.errandPatches[0]).not.toHaveProperty('labels');
  });

  test('behandlar en tom inaktiv profil som ett explicit legacyflöde', async ({ page, dismissCookieConsent }) => {
    const profile = defaultInvestigationProfile();
    profile.state = 'inactive';
    profile.documents = [];
    await installIafApiMock(page, { investigationProfile: profile });

    await visitErrand(page, dismissCookieConsent);

    await expect(page.getByRole('tab', { name: 'Utredning', exact: true })).toHaveCount(1);
    await expect(page.locator('[data-cy="investigation-profile-error"]')).toHaveCount(0);
    await expect(page.locator('[data-cy="investigation-profile-unavailable"]')).toHaveCount(0);
    await expect(page.locator('[data-cy="avvikelse-label-categorization"]')).toBeVisible();

    // Asserted last: opening Utredning hides Grundinformation's categorization control.
    await page.getByRole('tab', { name: 'Utredning', exact: true }).click();
    await expect(page.locator('[data-cy="investigation-tab-not-configured"]')).toBeVisible();
  });

  for (const ownerCase of [
    { eventType: 'AVVIKELSE', ownerKey: 'manager-investigation' },
    { eventType: 'MISSFORHALLANDE', ownerKey: 'misconduct-investigation' },
  ] as const) {
    test(`löser IAF/VOF-regelns ägardokument via profilnycklar för ${ownerCase.eventType}`, async ({
      page,
      dismissCookieConsent,
    }) => {
      const profile = defaultInvestigationProfile();
      profile.documents = [
        {
          key: 'manager-investigation',
          schemaName: 'utredning-enhetschef',
          tabLabel: 'Chefens utredning',
          ownerLabel: 'Enhetschef',
          permissions: { canRead: true, canWrite: true },
        },
        {
          key: 'misconduct-investigation',
          schemaName: 'utredning-sol-lss',
          tabLabel: 'Missförhållandeutredning',
          ownerLabel: 'LEX-utredare',
          permissions: { canRead: true, canWrite: true },
        },
      ];
      const sourceDocuments = allExistingInvestigationDocuments();
      const trace = await installIafApiMock(page, {
        documents: {
          'manager-investigation': {
            ...sourceDocuments['utredning-enhetschef'],
            key: 'manager-investigation',
          },
          'misconduct-investigation': {
            ...sourceDocuments['utredning-sol-lss'],
            key: 'misconduct-investigation',
          },
        },
        eventType: ownerCase.eventType,
        investigationProfile: profile,
      });

      await visitErrand(page, dismissCookieConsent);
      await openInvestigation(page);

      for (const { key } of profile.documents) {
        await expect(
          page.locator(`[data-cy="investigation-document-${key}"]`).locator(classificationFieldSelector)
        ).toHaveCount(key === ownerCase.ownerKey ? 1 : 0);
      }

      if (ownerCase.eventType === 'MISSFORHALLANDE') {
        await page.getByRole('tab', { name: 'Missförhållandeutredning', exact: true }).click();
      }
      const ownerDocument = page.locator(`[data-cy="investigation-document-${ownerCase.ownerKey}"]`);
      const ownerClassification = ownerDocument.locator(classificationFieldSelector);
      if (ownerCase.eventType === 'MISSFORHALLANDE') {
        await ownerClassification
          .locator('[data-cy="label-classification-type"]')
          .selectOption(iafLabelFixture.classification.executionDeficiency.resourcePath);
        await ownerClassification
          .locator('[data-cy="label-classification-subtype"]')
          .selectOption(iafLabelFixture.classification.supportNotProvided.resourcePath);
      } else {
        await ownerClassification
          .locator('[data-cy="label-classification-type"]')
          .selectOption(iafLabelFixture.classification.medication.resourcePath);
        await ownerClassification
          .locator('[data-cy="label-classification-subtype"]')
          .selectOption(iafLabelFixture.classification.incorrectAdministration.resourcePath);
      }
      await ownerDocument.getByRole('button', { name: 'Spara utredning', exact: true }).click();

      await expect.poll(() => trace.classificationPatches.length).toBe(1);
      expect(trace.puts).toHaveLength(0);
      expect(trace.classificationPatches[0].body).toEqual(
        expect.objectContaining({
          documentKey: ownerCase.ownerKey,
          documentETag:
            ownerCase.eventType === 'MISSFORHALLANDE'
              ? sourceDocuments['utredning-sol-lss'].etag
              : sourceDocuments['utredning-enhetschef'].etag,
        })
      );
    });
  }

  test('visar tre dokumentflikar och låser ett befintligt dokument till dess exakta schemaversion', async ({
    page,
    dismissCookieConsent,
  }) => {
    const existing = existingManagerDocument();
    const trace = await installIafApiMock(page, { documents: { [managerKey]: existing } });

    await visitErrand(page, dismissCookieConsent);
    await openInvestigation(page);

    const investigation = page.locator('[data-cy="support-investigation-tab"]');
    await expect(investigation.getByRole('tab')).toHaveCount(3);
    await expect(investigation.getByRole('tab', { name: 'Utredning enhetschef', exact: true })).toBeVisible();
    await expect(investigation.getByRole('tab', { name: 'Utredning SoL/LSS', exact: true })).toBeVisible();
    await expect(investigation.getByRole('tab', { name: 'Utredning HSL', exact: true })).toBeVisible();

    const managerDocument = page.locator(`[data-cy="investigation-document-${managerKey}"]`);
    await expect(managerDocument).toContainText(`Schema: ${existing.schemaId}`);
    const classificationField = managerDocument.locator(classificationFieldSelector);
    await expect(classificationField).toBeVisible();
    await expect(classificationField.getByRole('heading', { name: 'Kategorisering', exact: true })).toBeVisible();
    await expect(classificationField.getByRole('combobox', { name: 'Avvikelsetyp (obligatoriskt)' })).toHaveValue(
      iafLabelFixture.classification.rehab.resourcePath
    );
    await expect(classificationField.getByRole('combobox', { name: 'Underkategori (obligatorisk)' })).toHaveValue(
      iafLabelFixture.classification.missedAssessment.resourcePath
    );
    const schemaFieldOrder = await managerDocument
      .locator(`#${managerKey}_legalBases-group, ${classificationFieldSelector}`)
      .evaluateAll((elements) => elements.map((element) => element.getAttribute('data-cy') ?? element.id));
    expect(schemaFieldOrder).toEqual([`${managerKey}_legalBases-group`, 'schema-external-field-errandClassification']);
    await expect(page.getByRole('textbox', { name: 'Utredningstext', exact: true })).toContainText(
      'Enhetschefens samlade utredning.'
    );

    await investigation.getByRole('tab', { name: 'Utredning SoL/LSS', exact: true }).click();
    await expect(page.locator('[data-cy="investigation-document-utredning-sol-lss"]')).toBeVisible();
    await investigation.getByRole('tab', { name: 'Utredning HSL', exact: true }).click();
    await expect(page.locator('[data-cy="investigation-document-utredning-hsl"]')).toBeVisible();

    await expect.poll(() => [...new Set(trace.documentGets)]).toEqual(investigationKeys);
    await expect
      .poll(() => [...new Set(trace.latestSchemaNames)].sort())
      .toEqual(['utredning-hsl', 'utredning-sol-lss'].sort());
    expect(trace.latestSchemaNames).not.toContain(managerKey);
    expect(trace.exactSchemaIds).toContain(existing.schemaId);
  });

  test('visar ett uttryckligt fel när ett utredningsschema inte kan laddas', async ({ page, dismissCookieConsent }) => {
    await installIafApiMock(page, {
      documents: { [managerKey]: existingManagerDocument() },
      schemaFailureFor: managerKey,
    });

    await visitErrand(page, dismissCookieConsent);
    await openInvestigation(page);

    await expect(page.locator('[data-cy="investigation-document-notice"]')).toContainText(
      'Utredningen kunde inte laddas'
    );
    await expect(page.locator(classificationFieldSelector)).toHaveCount(0);
    await expect(page.locator(`[data-cy="investigation-document-${managerKey}"]`)).toHaveCount(0);
  });

  test('behåller utredningen som ensam ägare när ett nytt schema saknar klassificeringsdeklarationen', async ({
    page,
    dismissCookieConsent,
  }) => {
    await installIafApiMock(page, {
      documents: allExistingInvestigationDocuments(),
      classificationDeclarationMissingFor: managerKey,
    });

    await visitErrand(page, dismissCookieConsent);
    await openInvestigation(page);

    const managerDocument = page.locator(`[data-cy="investigation-document-${managerKey}"]`);
    await expect(managerDocument.locator(classificationFieldSelector)).toBeVisible();
    await expect(managerDocument.locator('[data-cy="investigation-classification-schema-warning"]')).toContainText(
      'Draken använder den centrala utredningsplaceringen'
    );
    await expect(page.getByRole('heading', { name: 'Kategorisering', exact: true })).toHaveCount(1);
  });

  test('normaliserar en felplacerad klassificeringsslot till den kanoniska sektionen', async ({
    page,
    dismissCookieConsent,
  }) => {
    await installIafApiMock(page, {
      documents: allExistingInvestigationDocuments(),
      classificationSlotMisplacedFor: managerKey,
    });

    await visitErrand(page, dismissCookieConsent);
    await openInvestigation(page);

    const managerDocument = page.locator(`[data-cy="investigation-document-${managerKey}"]`);
    const classificationField = managerDocument.locator(classificationFieldSelector);
    await expect(classificationField).toHaveCount(1);
    const schemaFieldOrder = await managerDocument
      .locator(`#${managerKey}_legalBases-group, ${classificationFieldSelector}`)
      .evaluateAll((elements) => elements.map((element) => element.getAttribute('data-cy') ?? element.id));
    expect(schemaFieldOrder).toEqual([`${managerKey}_legalBases-group`, 'schema-external-field-errandClassification']);
  });

  test('filtrerar schemafältets klassificering efter valda lagrum', async ({ page, dismissCookieConsent }) => {
    await installIafApiMock(page, { documents: { [managerKey]: existingManagerDocument() } });

    await visitErrand(page, dismissCookieConsent);
    await openInvestigation(page);

    const managerDocument = page.locator(`[data-cy="investigation-document-${managerKey}"]`);
    const legalBases = managerDocument.locator(`#${managerKey}_legalBases-group`);
    const hsl = legalBases.getByLabel(/^HSL –/u);
    const sol = legalBases.getByLabel(/^SoL –/u);
    const hslLabel = legalBases.getByText(/^HSL –/u);
    const solLabel = legalBases.getByText(/^SoL –/u);
    const typeSelect = managerDocument.locator('[data-cy="label-classification-type"]');

    await expect(
      typeSelect.locator('option').filter({ hasText: iafLabelFixture.classification.rehab.displayName })
    ).toHaveCount(1);
    await expect(
      typeSelect.locator('option').filter({ hasText: iafLabelFixture.classification.legalCertainty.displayName })
    ).toHaveCount(1);

    await solLabel.click();
    await expect(sol).not.toBeChecked();
    await expect(
      typeSelect.locator('option').filter({ hasText: iafLabelFixture.classification.rehab.displayName })
    ).toHaveCount(1);
    await expect(
      typeSelect.locator('option').filter({ hasText: iafLabelFixture.classification.legalCertainty.displayName })
    ).toHaveCount(0);

    await solLabel.click();
    await expect(sol).toBeChecked();
    await hslLabel.click();
    await expect(hsl).not.toBeChecked();
    await expect(
      typeSelect.locator('option').filter({ hasText: iafLabelFixture.classification.rehab.displayName })
    ).toHaveCount(0);
    await expect(
      typeSelect.locator('option').filter({ hasText: iafLabelFixture.classification.legalCertainty.displayName })
    ).toHaveCount(1);
    await expect(typeSelect).toHaveValue('');
  });

  test('följer Adminpanels avstängda utredningsflagga deterministiskt', async ({ page, dismissCookieConsent }) => {
    const trace = await installIafApiMock(page, {
      documents: { [managerKey]: existingManagerDocument() },
      featureFlags: [
        { name: 'isSupportManagement', enabled: true },
        { name: 'useDetailsTab', enabled: true },
        { name: 'useThreeLevelCategorization', enabled: true },
        { name: 'useInvestigation', enabled: false },
        { name: 'useAvvikelseInvestigation', enabled: true },
      ],
    });

    await visitErrand(page, dismissCookieConsent);

    await expect(page.getByRole('tab', { name: 'Utredning', exact: true })).toHaveCount(0);
    await expect(page.getByRole('tab', { name: 'Ärendeuppgifter', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Kategorisering', exact: true })).toBeVisible();

    await page
      .locator('[data-cy="label-classification-type"]')
      .selectOption(iafLabelFixture.classification.medication.resourcePath);
    await page
      .locator('[data-cy="label-classification-subtype"]')
      .selectOption(iafLabelFixture.classification.incorrectAdministration.resourcePath);
    const sidebarSaveButton = page
      .locator('[data-cy="manage-sidebar"] [data-cy="save-button"]')
      .filter({ hasText: 'Spara ärende' });
    await expect(sidebarSaveButton).toBeEnabled();
    await sidebarSaveButton.click();

    await expect.poll(() => trace.errandPatches.length).toBe(1);
    expect(trace.profileGets).toBe(1);
    expect(trace.errandPatches[0]).toEqual(
      expect.objectContaining({
        classification: {
          category: iafLabelFixture.classification.hslOwner.resourcePath,
          type: iafLabelFixture.classification.medication.resourcePath,
        },
      })
    );
  });

  // The complement of the test above, and the case a new drake hits: the master switch is on, but
  // no capability claims the investigation. The tab must disappear *and* Grundinformation must fall
  // back to the ordinary three-level control - not to the avvikelse one, and not to nothing.
  test('lämnar kategoriseringen orörd när ingen utredningskapabilitet är påslagen', async ({
    page,
    dismissCookieConsent,
  }) => {
    await installIafApiMock(page, {
      documents: { [managerKey]: existingManagerDocument() },
      featureFlags: [
        { name: 'isSupportManagement', enabled: true },
        { name: 'useDetailsTab', enabled: true },
        { name: 'useThreeLevelCategorization', enabled: true },
        { name: 'useInvestigation', enabled: true },
        { name: 'useAvvikelseInvestigation', enabled: false },
      ],
    });

    await visitErrand(page, dismissCookieConsent);

    await expect(page.getByRole('tab', { name: 'Utredning', exact: true })).toHaveCount(0);
    await expect(page.locator('[data-cy="avvikelse-label-categorization"]')).toHaveCount(0);
    await expect(page.locator('[data-cy="labelCategory-input"]')).toBeVisible();
  });

  // The seam's payoff: a second implementation, selected by its own capability, rendering in the
  // real bundle. Grundinformation must keep the ordinary control, because the AOT variant brings no
  // label tree of its own - the avvikelse vocabulary must not follow the tab around.
  test('renderar en annan utredningsvariant när dess kapabilitet är påslagen', async ({
    page,
    dismissCookieConsent,
  }) => {
    await installIafApiMock(page, {
      documents: { [managerKey]: existingManagerDocument() },
      featureFlags: [
        { name: 'isSupportManagement', enabled: true },
        { name: 'useDetailsTab', enabled: true },
        { name: 'useThreeLevelCategorization', enabled: true },
        { name: 'useInvestigation', enabled: true },
        { name: 'useAvvikelseInvestigation', enabled: false },
        { name: 'useAotInvestigation', enabled: true },
      ],
    });

    await visitErrand(page, dismissCookieConsent);

    // Grundinformation first: opening the Utredning tab hides this panel.
    await expect(page.locator('[data-cy="avvikelse-label-categorization"]')).toHaveCount(0);
    await expect(page.locator('[data-cy="labelCategory-input"]')).toBeVisible();

    const investigationTab = page.getByRole('tab', { name: 'Utredning', exact: true });
    await expect(investigationTab).toHaveCount(1);
    await investigationTab.click();

    await expect(page.locator('[data-cy="aot-investigation-tab"]')).toBeVisible();
    await expect(page.locator('[data-cy="investigation-document-notice"]')).toHaveCount(0);
  });

  test('sparar endast aktiv dokumentnyckel med schemaId och If-Match', async ({ page, dismissCookieConsent }) => {
    const existing = existingManagerDocument();
    const trace = await installIafApiMock(page, { documents: { [managerKey]: existing } });

    await visitErrand(page, dismissCookieConsent);
    await openInvestigation(page);

    const probabilityOne = page.locator(managerProbabilityGroup).getByLabel(/^1 –/u);
    await probabilityOne.check();
    await expect(probabilityOne).toBeChecked();

    const saveButton = page.getByRole('button', { name: 'Spara utredning', exact: true });
    await expect(saveButton).toBeEnabled();
    await saveButton.click();
    await expect(page.locator('[data-cy="investigation-document-notice"]')).toContainText('Utredningen har sparats.');

    await expect.poll(() => trace.puts.length).toBe(1);
    const put = trace.puts[0];
    expect(put.key).toBe(managerKey);
    expect(put.headers['if-match']).toBe(existing.etag);
    expect(put.body).toEqual({
      schemaId: existing.schemaId,
      value: expect.objectContaining({
        riskAssessmentHsl: expect.objectContaining({ probability: 1, calculatedRiskValue: 3 }),
      }),
    });
    expect(Object.keys(put.body as Record<string, unknown>).sort()).toEqual(['schemaId', 'value']);
    expect(trace.classificationPatches).toHaveLength(0);
  });

  test('sparar en utredningsändring utan att skriva om en äldre okänd klassificering', async ({
    page,
    dismissCookieConsent,
  }) => {
    const existing = existingManagerDocument();
    const legacyCategoryPath = 'CATEGORY/HSL/RETIRED_CATEGORY';
    const legacyTypePath = `${legacyCategoryPath}/RETIRED_TYPE`;
    const legacyLabels: MockLabel[] = [
      {
        id: 'legacy-category-id',
        classification: 'CATEGORY',
        displayName: 'Äldre avvikelsetyp',
        resourceName: 'RETIRED_CATEGORY',
        resourcePath: legacyCategoryPath,
      },
      {
        id: 'legacy-type-id',
        classification: 'TYPE',
        displayName: 'Äldre underkategori',
        resourceName: 'RETIRED_TYPE',
        resourcePath: legacyTypePath,
      },
    ];
    const trace = await installIafApiMock(page, {
      documents: { [managerKey]: existing },
      classification: {
        category: iafLabelFixture.classification.hslOwner.resourcePath,
        type: legacyCategoryPath,
      },
      labels: legacyLabels,
    });

    await visitErrand(page, dismissCookieConsent);
    await openInvestigation(page);

    await page.locator(managerProbabilityGroup).getByLabel(/^1 –/u).check();
    await page.getByRole('button', { name: 'Spara utredning', exact: true }).click();

    await expect(page.locator('[data-cy="investigation-document-notice"]')).toContainText('Utredningen har sparats.');
    await expect.poll(() => trace.puts.length).toBe(1);
    expect(trace.classificationPatches).toHaveLength(0);
  });

  test('sparar en utredningsändring utan att skriva om en pensionerad underkategori', async ({
    page,
    dismissCookieConsent,
  }) => {
    const retiredTypePath = `${iafLabelFixture.classification.rehab.resourcePath}/RETIRED_TYPE`;
    const labelsWithRetiredType: MockLabel[] = [
      {
        id: iafLabelFixture.provision.hsl.id,
        classification: 'PROVISION',
        displayName: 'HSL',
        resourceName: 'HSL',
        resourcePath: iafLabelFixture.provision.hsl.resourcePath,
      },
      {
        id: iafLabelFixture.reportType.deviation.id,
        classification: 'REPORT_TYPE',
        displayName: 'Avvikelse',
        resourceName: 'DEVIATION',
        resourcePath: iafLabelFixture.reportType.deviation.resourcePath,
      },
      {
        id: iafLabelFixture.classification.hslOwner.id,
        classification: 'PROVISION_CATEGORY',
        displayName: 'HSL',
        resourceName: 'HSL',
        resourcePath: iafLabelFixture.classification.hslOwner.resourcePath,
      },
      {
        id: iafLabelFixture.classification.rehab.id,
        classification: 'CATEGORY',
        displayName: iafLabelFixture.classification.rehab.displayName,
        resourceName: 'REHAB',
        resourcePath: iafLabelFixture.classification.rehab.resourcePath,
      },
      {
        id: 'retired-type-id',
        classification: 'TYPE',
        displayName: 'Äldre underkategori',
        resourceName: 'RETIRED_TYPE',
        resourcePath: retiredTypePath,
      },
    ];
    const trace = await installIafApiMock(page, {
      documents: { [managerKey]: existingManagerDocument() },
      labels: labelsWithRetiredType,
    });

    await visitErrand(page, dismissCookieConsent);
    await openInvestigation(page);

    await page.locator(managerProbabilityGroup).getByLabel(/^1 –/u).check();
    await page.getByRole('button', { name: 'Spara utredning', exact: true }).click();

    await expect(page.locator('[data-cy="investigation-document-notice"]')).toContainText('Utredningen har sparats.');
    await expect.poll(() => trace.puts.length).toBe(1);
    expect(trace.classificationPatches).toHaveLength(0);
  });

  test('kräver kategorisering innan ett helt oklassificerat ärendes utredning kan sparas', async ({
    page,
    dismissCookieConsent,
  }) => {
    const trace = await installIafApiMock(page, {
      documents: { [managerKey]: existingManagerDocument() },
      classification: { category: '', type: '' },
      labels: [],
    });

    await visitErrand(page, dismissCookieConsent);
    await openInvestigation(page);

    await page.locator(managerProbabilityGroup).getByLabel(/^1 –/u).check();
    await page.getByRole('button', { name: 'Spara utredning', exact: true }).click();

    await expect(page.locator('[data-cy="investigation-document-notice"]')).toContainText(
      'Välj avvikelsetyp och underkategori innan utredningen sparas.'
    );
    expect(trace.puts).toHaveLength(0);
    expect(trace.classificationPatches).toHaveLength(0);
  });

  test('blockerar dokumentsparning när den befintliga klassificeringen inte hör till valt lagrum', async ({
    page,
    dismissCookieConsent,
  }) => {
    const existing = existingManagerDocument();
    existing.value.legalBases = ['SOL'];
    existing.value.investigationTemplate = 'sol_lss';
    delete existing.value.riskAssessmentHsl;
    const trace = await installIafApiMock(page, { documents: { [managerKey]: existing } });

    await visitErrand(page, dismissCookieConsent);
    await openInvestigation(page);

    await page.locator(`#${managerKey}_riskAssessmentSolLss_probability`).getByLabel(/^1 –/u).check();
    await page.getByRole('button', { name: 'Spara utredning', exact: true }).click();

    await expect(page.locator('[data-cy="investigation-document-notice"]')).toContainText(
      'Den befintliga kategoriseringen stämmer inte med valda lagrum. Välj en giltig avvikelsetyp och underkategori.'
    );
    expect(trace.puts).toHaveLength(0);
    expect(trace.classificationPatches).toHaveLength(0);
  });

  test('blockerar dokumentsparning när en känd kategori saknar obligatorisk underkategori', async ({
    page,
    dismissCookieConsent,
  }) => {
    const labelsWithoutSubtype: MockLabel[] = [
      {
        id: iafLabelFixture.provision.hsl.id,
        classification: 'PROVISION',
        displayName: 'HSL',
        resourceName: 'HSL',
        resourcePath: iafLabelFixture.provision.hsl.resourcePath,
      },
      {
        id: iafLabelFixture.reportType.deviation.id,
        classification: 'REPORT_TYPE',
        displayName: 'Avvikelse',
        resourceName: 'DEVIATION',
        resourcePath: iafLabelFixture.reportType.deviation.resourcePath,
      },
      {
        id: iafLabelFixture.classification.hslOwner.id,
        classification: 'PROVISION_CATEGORY',
        displayName: 'HSL',
        resourceName: 'HSL',
        resourcePath: iafLabelFixture.classification.hslOwner.resourcePath,
      },
      {
        id: iafLabelFixture.classification.rehab.id,
        classification: 'CATEGORY',
        displayName: iafLabelFixture.classification.rehab.displayName,
        resourceName: 'REHAB',
        resourcePath: iafLabelFixture.classification.rehab.resourcePath,
      },
    ];
    const trace = await installIafApiMock(page, {
      documents: { [managerKey]: existingManagerDocument() },
      labels: labelsWithoutSubtype,
    });

    await visitErrand(page, dismissCookieConsent);
    await openInvestigation(page);

    await page.locator(managerProbabilityGroup).getByLabel(/^1 –/u).check();
    await page.getByRole('button', { name: 'Spara utredning', exact: true }).click();

    await expect(page.locator('[data-cy="investigation-document-notice"]')).toContainText(
      'Välj underkategori innan utredningen sparas.'
    );
    expect(trace.puts).toHaveLength(0);
    expect(trace.classificationPatches).toHaveLength(0);
  });

  test('sparar dokumentdata och labelägd klassificering genom separata smala kontrakt', async ({
    page,
    dismissCookieConsent,
  }) => {
    const existing = existingManagerDocument();
    const trace = await installIafApiMock(page, { documents: { [managerKey]: existing } });

    await visitErrand(page, dismissCookieConsent);
    await openInvestigation(page);

    const managerDocument = page.locator(`[data-cy="investigation-document-${managerKey}"]`);
    const sidebarSaveButton = page
      .locator('[data-cy="manage-sidebar"] [data-cy="save-button"]')
      .filter({ hasText: 'Spara ärende' });
    const typeSelect = managerDocument.locator('[data-cy="label-classification-type"]');
    const subtypeSelect = managerDocument.locator('[data-cy="label-classification-subtype"]');
    await expect(sidebarSaveButton).toBeDisabled();
    await typeSelect.selectOption(iafLabelFixture.classification.medication.resourcePath);
    await subtypeSelect.selectOption(iafLabelFixture.classification.incorrectAdministration.resourcePath);
    await expect(sidebarSaveButton).toBeDisabled();
    expect(trace.classificationPatches).toHaveLength(0);
    await page.locator(managerProbabilityGroup).getByLabel(/^1 –/u).check();

    await managerDocument.getByRole('button', { name: 'Spara utredning', exact: true }).click();
    await expect(page.locator('[data-cy="investigation-document-notice"]')).toContainText(
      'Utredningen och ärendets klassificering har sparats.'
    );

    await expect.poll(() => trace.puts.length).toBe(1);
    await expect.poll(() => trace.classificationPatches.length).toBe(1);
    expect(trace.writes).toEqual(['document', 'classification']);

    const putBody = trace.puts[0].body as { schemaId: string; value: Record<string, unknown> };
    expect(putBody.schemaId).toBe(existing.schemaId);
    expect(putBody.value.riskAssessmentHsl).toEqual(
      expect.objectContaining({ probability: 1, calculatedRiskValue: 3 })
    );
    for (const labelOwnedField of [
      'classification',
      'labels',
      'category',
      'type',
      'subType',
      'deviationType',
      'deviationSubtype',
      'errandClassification',
    ]) {
      expect(putBody.value).not.toHaveProperty(labelOwnedField);
    }

    expect(trace.classificationPatches[0].body).toEqual({
      expectedVersion: 8,
      classification: {
        category: iafLabelFixture.classification.hslOwner.resourcePath,
        type: iafLabelFixture.classification.medication.resourcePath,
      },
      categoryLabels: [
        { id: iafLabelFixture.classification.hslOwner.id },
        { id: iafLabelFixture.classification.medication.id },
        { id: iafLabelFixture.classification.incorrectAdministration.id },
      ],
      documentKey: managerKey,
      documentETag: '"8"',
    });
    expect(Object.keys(trace.classificationPatches[0].body as Record<string, unknown>).sort()).toEqual([
      'categoryLabels',
      'classification',
      'documentETag',
      'documentKey',
      'expectedVersion',
    ]);
    await expect(typeSelect).toHaveValue(iafLabelFixture.classification.medication.resourcePath);
    await expect(subtypeSelect).toHaveValue(iafLabelFixture.classification.incorrectAdministration.resourcePath);

    await typeSelect.selectOption(iafLabelFixture.classification.rehab.resourcePath);
    await subtypeSelect.selectOption(iafLabelFixture.classification.missedAssessment.resourcePath);
    await managerDocument.getByRole('button', { name: 'Spara utredning', exact: true }).click();
    await expect(page.locator('[data-cy="investigation-document-notice"]')).toContainText(
      'Ärendets klassificering har sparats.'
    );
    await expect.poll(() => trace.classificationPatches.length).toBe(2);
    expect(trace.puts).toHaveLength(1);
    expect(trace.classificationPatches[1].body).toEqual(
      expect.objectContaining({
        expectedVersion: 9,
        classification: {
          category: iafLabelFixture.classification.hslOwner.resourcePath,
          type: iafLabelFixture.classification.rehab.resourcePath,
        },
      })
    );
  });

  test('sparar klassificering från metadata som endast har resourceName', async ({ page, dismissCookieConsent }) => {
    const existing = existingManagerDocument();
    const trace = await installIafApiMock(page, {
      documents: { [managerKey]: existing },
      omitLabelResourcePaths: true,
    });

    await visitErrand(page, dismissCookieConsent);
    await openInvestigation(page);

    const managerDocument = page.locator(`[data-cy="investigation-document-${managerKey}"]`);
    const typeSelect = managerDocument.locator('[data-cy="label-classification-type"]');
    const subtypeSelect = managerDocument.locator('[data-cy="label-classification-subtype"]');
    await typeSelect.selectOption(iafLabelFixture.classification.medication.id);
    await subtypeSelect.selectOption(iafLabelFixture.classification.incorrectAdministration.id);
    await managerDocument.getByRole('button', { name: 'Spara utredning', exact: true }).click();

    await expect(page.locator('[data-cy="investigation-document-notice"]')).toContainText(
      'Ärendets klassificering har sparats.'
    );
    expect(trace.classificationPatches).toHaveLength(1);
    expect(trace.classificationPatches[0].body).toEqual({
      expectedVersion: 7,
      classification: { category: 'HSL', type: 'MEDICATION' },
      categoryLabels: [
        { id: iafLabelFixture.classification.hslOwner.id },
        { id: iafLabelFixture.classification.medication.id },
        { id: iafLabelFixture.classification.incorrectAdministration.id },
      ],
      documentKey: managerKey,
      documentETag: existing.etag,
    });
  });

  test('återförsöker endast klassificeringen efter en delvis genomförd sparning', async ({
    page,
    dismissCookieConsent,
  }) => {
    const existing = existingManagerDocument();
    const trace = await installIafApiMock(page, {
      documents: { [managerKey]: existing },
      classificationPatchResult: 'server-error-once',
    });

    await visitErrand(page, dismissCookieConsent);
    await openInvestigation(page);

    const managerDocument = page.locator(`[data-cy="investigation-document-${managerKey}"]`);
    await managerDocument
      .locator('[data-cy="label-classification-type"]')
      .selectOption(iafLabelFixture.classification.medication.resourcePath);
    await managerDocument
      .locator('[data-cy="label-classification-subtype"]')
      .selectOption(iafLabelFixture.classification.incorrectAdministration.resourcePath);
    await page.locator(managerProbabilityGroup).getByLabel(/^1 –/u).check();

    const saveButton = managerDocument.getByRole('button', { name: 'Spara utredning', exact: true });
    await saveButton.click();
    await expect(page.locator('[data-cy="investigation-document-notice"]')).toContainText(
      'Utredningen har sparats, men ärendets klassificering kunde inte synkroniseras'
    );
    expect(trace.puts).toHaveLength(1);
    expect(trace.classificationPatches).toHaveLength(1);

    await saveButton.click();
    await expect(page.locator('[data-cy="investigation-document-notice"]')).toContainText(
      'Ärendets klassificering har sparats.'
    );
    expect(trace.puts).toHaveLength(1);
    expect(trace.classificationPatches).toHaveLength(2);
    expect(trace.writes).toEqual(['document', 'classification', 'classification']);
  });

  test('stoppar en klassificeringsuppdatering som bygger på en äldre ärendeversion', async ({
    page,
    dismissCookieConsent,
  }) => {
    const trace = await installIafApiMock(page, {
      documents: { [managerKey]: existingManagerDocument() },
      classificationPatchResult: 'conflict',
    });

    await visitErrand(page, dismissCookieConsent);
    await openInvestigation(page);

    const managerDocument = page.locator(`[data-cy="investigation-document-${managerKey}"]`);
    await managerDocument
      .locator('[data-cy="label-classification-type"]')
      .selectOption(iafLabelFixture.classification.medication.resourcePath);
    await managerDocument
      .locator('[data-cy="label-classification-subtype"]')
      .selectOption(iafLabelFixture.classification.incorrectAdministration.resourcePath);
    await page.locator(managerProbabilityGroup).getByLabel(/^1 –/u).check();
    await managerDocument.getByRole('button', { name: 'Spara utredning', exact: true }).click();

    await expect(page.locator('[data-cy="investigation-document-notice"]')).toContainText(
      'klassificering har ändrats av någon annan'
    );
    expect(trace.puts).toHaveLength(1);
    expect(trace.classificationPatches).toHaveLength(1);
    expect(trace.classificationPatches[0].body).toEqual(expect.objectContaining({ expectedVersion: 8 }));
  });

  test('behåller lokala ändringar när Support Management svarar med versionskonflikt', async ({
    page,
    dismissCookieConsent,
  }) => {
    const existing = existingManagerDocument();
    const trace = await installIafApiMock(page, {
      documents: { [managerKey]: existing },
      putResult: 'conflict',
    });

    await visitErrand(page, dismissCookieConsent);
    await openInvestigation(page);

    const probabilityFour = page.locator(managerProbabilityGroup).getByLabel(/^4 –/u);
    await probabilityFour.check();
    const saveButton = page.getByRole('button', { name: 'Spara utredning', exact: true });
    await saveButton.click();

    await expect(page.locator('[data-cy="investigation-document-notice"]')).toContainText(
      'Utredningen har ändrats av någon annan'
    );
    await expect(probabilityFour).toBeChecked();
    await expect(page.locator(`#${managerKey}_riskAssessmentHsl_calculatedRiskValue`)).toHaveValue('12');
    await expect(saveButton).toBeEnabled();
    expect(trace.puts).toHaveLength(1);
  });

  test('låser SOL/LSS för missförhållande och placerar klassificeringen i SOL/LSS-utredningen', async ({
    page,
    dismissCookieConsent,
  }) => {
    const documents = allExistingInvestigationDocuments();
    const trace = await installIafApiMock(page, {
      eventType: 'MISSFORHALLANDE',
      documents,
    });

    await visitErrand(page, dismissCookieConsent);
    await openInvestigation(page);

    const managerDocument = page.locator(`[data-cy="investigation-document-${managerKey}"]`);
    const managerLegalBases = managerDocument.locator(`#${managerKey}_legalBases-group`);
    const managerHsl = managerLegalBases.getByLabel(/^HSL –/u);
    const managerLss = managerLegalBases.getByLabel(/^LSS –/u);
    const managerSol = managerLegalBases.getByLabel(/^SoL –/u);

    await expect(managerHsl).not.toBeChecked();
    await expect(managerLss).toBeChecked();
    await expect(managerSol).toBeChecked();
    await expect(managerHsl).toBeDisabled();
    await expect(managerLss).toBeDisabled();
    await expect(managerSol).toBeDisabled();
    await expect(managerDocument.locator(classificationFieldSelector)).toHaveCount(0);

    await page.getByRole('tab', { name: 'Utredning SoL/LSS', exact: true }).click();
    const solLssDocument = page.locator(`[data-cy="investigation-document-${solLssKey}"]`);
    const classificationField = solLssDocument.locator(classificationFieldSelector);
    await expect(classificationField).toBeVisible();

    const typeSelect = classificationField.locator('[data-cy="label-classification-type"]');
    const subtypeSelect = classificationField.locator('[data-cy="label-classification-subtype"]');
    await expect(
      typeSelect.locator('option').filter({ hasText: iafLabelFixture.classification.legalCertainty.displayName })
    ).toHaveCount(1);
    await expect(
      typeSelect.locator('option').filter({ hasText: iafLabelFixture.classification.rehab.displayName })
    ).toHaveCount(0);

    await typeSelect.selectOption(iafLabelFixture.classification.executionDeficiency.resourcePath);
    await subtypeSelect.selectOption(iafLabelFixture.classification.supportNotProvided.resourcePath);
    await solLssDocument.getByRole('button', { name: 'Spara utredning', exact: true }).click();
    await expect(page.locator('[data-cy="investigation-document-notice"]')).toContainText(
      /ärendets klassificering har sparats\./iu
    );

    await expect.poll(() => trace.classificationPatches.length).toBe(1);
    expect(trace.classificationPatches[0].body).toEqual({
      expectedVersion: 7,
      classification: {
        category: iafLabelFixture.classification.solLssOwner.resourcePath,
        type: iafLabelFixture.classification.executionDeficiency.resourcePath,
      },
      categoryLabels: [
        { id: iafLabelFixture.classification.solLssOwner.id },
        { id: iafLabelFixture.classification.executionDeficiency.id },
        { id: iafLabelFixture.classification.supportNotProvided.id },
      ],
      documentKey: solLssKey,
      documentETag: documents[solLssKey].etag,
    });
  });

  test('skapar SOL/LSS-dokumentet före klassificeringen när missförhållandet saknar ett dokument', async ({
    page,
    dismissCookieConsent,
  }) => {
    const trace = await installIafApiMock(page, {
      eventType: 'MISSFORHALLANDE',
      documents: {},
    });

    await visitErrand(page, dismissCookieConsent);
    await openInvestigation(page);
    await page.getByRole('tab', { name: 'Utredning SoL/LSS', exact: true }).click();

    const solLssDocument = page.locator(`[data-cy="investigation-document-${solLssKey}"]`);
    const eventTypeCheckbox = solLssDocument.getByRole('checkbox', { name: 'Fysisk eller psykisk kränkning' });
    await solLssDocument.getByText('Fysisk eller psykisk kränkning', { exact: true }).click();
    await expect(eventTypeCheckbox).toBeChecked();
    await solLssDocument
      .locator('[data-cy="label-classification-type"]')
      .selectOption(iafLabelFixture.classification.executionDeficiency.resourcePath);
    await solLssDocument
      .locator('[data-cy="label-classification-subtype"]')
      .selectOption(iafLabelFixture.classification.supportNotProvided.resourcePath);
    await solLssDocument.getByRole('button', { name: 'Spara utredning', exact: true }).click();

    await expect(page.locator('[data-cy="investigation-document-notice"]')).toContainText(
      'Utredningen och ärendets klassificering har sparats.'
    );
    await expect.poll(() => trace.classificationPatches.length).toBe(1);
    expect(trace.writes).toEqual(['document', 'classification']);
    expect(trace.puts).toHaveLength(1);
    expect(trace.puts[0].key).toBe(solLssKey);
    expect(trace.puts[0].headers['if-match']).toBeUndefined();
    expect(trace.puts[0].body).toEqual({
      schemaId: expect.stringContaining(`${solLssKey}_1.1`),
      value: expect.objectContaining({
        legalBases: ['SOL', 'LSS'],
        eventTypes: ['physical_or_psychological_violation'],
      }),
    });
  });

  for (const readonlyCase of [
    { title: 'låst ärende', scenario: { errandStatus: 'SOLVED', canEdit: true } },
    { title: 'saknad skrivbehörighet', scenario: { errandStatus: 'ONGOING', canEdit: false } },
  ] as const) {
    test(`visar utredningen skrivskyddad vid ${readonlyCase.title}`, async ({ page, dismissCookieConsent }) => {
      await installIafApiMock(page, {
        ...readonlyCase.scenario,
        documents: { [managerKey]: existingManagerDocument() },
      });

      await visitErrand(page, dismissCookieConsent);
      await openInvestigation(page);

      const managerDocument = page.locator(`[data-cy="investigation-document-${managerKey}"]`);
      await expect(managerDocument.getByText('Skrivskyddad', { exact: true })).toBeVisible();
      await expect(managerDocument).toContainText('Utredningen kan läsas men inte ändras');
      await expect(managerDocument.locator('[data-cy="schema-submit-button"]')).toHaveCount(0);
      await expect(page.locator(managerProbabilityGroup).getByLabel(/^1 –/u)).toBeDisabled();
    });
  }

  test('behåller Katlas JSON under Ärendeuppgifter men visar inte utredningsdokumenten där', async ({
    page,
    dismissCookieConsent,
  }) => {
    const documents = allExistingInvestigationDocuments();
    documents['utredning-enhetschef'].value.investigationText = '<p>SKA BARA VISAS UNDER UTREDNING ENHETSCHEF</p>';
    documents['utredning-sol-lss'].value.eventDescription = '<p>SKA BARA VISAS UNDER UTREDNING SOL LSS</p>';
    documents['utredning-hsl'].value.assignment = '<p>SKA BARA VISAS UNDER UTREDNING HSL</p>';
    const trace = await installIafApiMock(page, { documents });

    await visitErrand(page, dismissCookieConsent);
    await page.getByRole('tab', { name: 'Ärendeuppgifter', exact: true }).click();

    const details = page.getByRole('heading', { name: 'Ärendeuppgifter', exact: true }).locator('..');
    await expect(details.getByRole('textbox', { name: 'Händelse från Katla', exact: true })).toHaveValue(
      'Katla från web-app-katla-sm'
    );
    await expect(details).not.toContainText('SKA BARA VISAS UNDER UTREDNING ENHETSCHEF');
    await expect(details).not.toContainText('SKA BARA VISAS UNDER UTREDNING SOL LSS');
    await expect(details).not.toContainText('SKA BARA VISAS UNDER UTREDNING HSL');
    expect(trace.exactSchemaIds).toContain(katlaSchemaId);
  });
});
