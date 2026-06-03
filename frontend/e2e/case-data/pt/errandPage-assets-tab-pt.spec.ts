import { ErrandPhase } from '@casedata/interfaces/errand-phase';

import { expect,test } from '../../fixtures/base.fixture';
import { mockAdmins } from '../fixtures/mockAdmins';
import { mockAsset } from '../fixtures/mockAsset';
import { mockAttachmentsPT } from '../fixtures/mockAttachments';
import { mockConversationMessages, mockConversations } from '../fixtures/mockConversations';
import { mockAssetEmpty, mockDraftAsset, mockDraftAssetEmpty } from '../fixtures/mockFTAsset';
import { mockHistory } from '../fixtures/mockHistory';
import { mockMe } from '../fixtures/mockMe';
import { mockMessages } from '../fixtures/mockMessages';
import { mockPersonId } from '../fixtures/mockPersonId';
import { mockPTErrand_base } from '../fixtures/mockPtErrand';
import { mockRelations, mockResolvedRelations } from '../fixtures/mockRelations';

const tableHeaderColumns: Record<number, string> = {
  0: 'Typ',
  1: 'Kortnummer',
  2: 'Status',
  3: 'Ärendenummer',
  4: 'Beslutad',
  5: 'Giltighetstid',
};

test.describe('Errand page assets tab', () => {
  test.beforeEach(async ({ page, mockRoute, dismissCookieConsent }) => {
    await mockRoute('**/schemas/*/latest', { data: { id: 'mock-schema-id', value: {} }, message: 'success' });
    await mockRoute('**/schemas/*/ui-schema', { data: { id: 'mock-ui-schema-id', value: {} }, message: 'success' });
    await mockRoute('**/users/admins', mockAdmins);
    await mockRoute('**/me', mockMe);
    await mockRoute('**/featureflags', []);
    await mockRoute('**/personid', mockPersonId, { method: 'POST' });
    await page.route(/\/errand\/\d*/, async (route) => {
      if (route.request().method() !== 'GET') {
        await route.fallback();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockPTErrand_base),
      });
    });
    await page.route(/\/errand\/\d+\/attachments$/, async (route) => {
      if (route.request().method() !== 'GET') {
        await route.fallback();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockAttachmentsPT),
      });
    });
    await mockRoute('**/errands/*', { data: 'ok', message: 'ok' }, { method: 'PATCH' });
    await mockRoute('**/errand/errandNumber/*', mockPTErrand_base);
    await mockRoute('**/stakeholders/personNumber', mockPTErrand_base.data.stakeholders, { method: 'POST' });
    await mockRoute('**/assets?partyId=aaaaaaa-bbbb-aaaa-bbbb-aaaabbbbcccc&type=PARKINGPERMIT', mockAsset);
    await mockRoute(
      '**/assets?municipalityId=2281&partyId=aaaaaaa-bbbb-aaaa-bbbb-aaaabbbbcccc&assetId=PRH-2022-000019&type=FTErrandAssets',
      {}
    );

    await mockRoute('**/messages/*', mockMessages);
    await mockRoute('**/messages', mockMessages, { method: 'POST' });
    await mockRoute('**/errands/*/history', mockHistory);

    await mockRoute('**/contracts/2024-01026', mockPTErrand_base);

    await page.route(/\/errand\/\d+\/messages$/, async (route) => {
      if (route.request().method() !== 'GET') {
        await route.fallback();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockMessages),
      });
    });

    await mockRoute('**/sourcerelations/**/**', mockRelations);
    await mockRoute('**/targetrelations/**/**', mockRelations);
    await mockRoute('**/namespace/errands/**/communication/conversations', mockConversations);
    await mockRoute('**/errands/**/communication/conversations/*/messages', mockConversationMessages);
    await mockRoute('**/errands/**/extraparameters', {}, { method: 'PATCH' });

    await page.goto(`arende/${mockPTErrand_base.data.errandNumber}`);
    await page.waitForResponse((resp) => resp.url().includes('/errand/errandNumber/') && resp.status() === 200);
    await dismissCookieConsent();
    const assetsTab = page.locator('.sk-tabs-list button').nth(4);
    await expect(assetsTab).toHaveText(`Tillstånd & tjänster (${mockAsset.data.length})`);
    await assetsTab.click({ force: true });
  });

  test('shows the correct table headers and assets', async ({ page }) => {
    await expect(page.locator('[data-cy="assets-table"]')).toBeVisible();
    await expect(page.locator('.sk-table-sortbutton').filter({ hasText: tableHeaderColumns[0] })).toBeVisible();
    await expect(page.locator('.sk-table-sortbutton').filter({ hasText: tableHeaderColumns[1] })).toBeVisible();
    await expect(page.locator('.sk-table-sortbutton').filter({ hasText: tableHeaderColumns[2] })).toBeVisible();
    await expect(page.locator('.sk-table-sortbutton').filter({ hasText: tableHeaderColumns[3] })).toBeVisible();
    await expect(page.locator('.sk-table-sortbutton').filter({ hasText: tableHeaderColumns[4] })).toBeVisible();
    await expect(page.locator('.sk-table-sortbutton').filter({ hasText: tableHeaderColumns[5] })).toBeVisible();

    await expect(page.locator('[data-cy="table-column-type"]').locator('strong')).toContainText('P-tillstånd');
    await expect(page.locator('[data-cy="table-column-assetId"]').locator('span')).toContainText('133773');
    await expect(page.locator('[data-cy="table-column-status"]').locator('span')).toContainText('Aktivt');
    await expect(page.locator('[data-cy="table-column-errandNumber"]').locator('span')).toContainText(
      'PRH-2023-000283'
    );
    await expect(page.locator('[data-cy="table-column-issued"]').locator('span')).toContainText('2023-01-01');
    const validToCol = page.locator('[data-cy="table-column-validTo"]');
    await expect(validToCol).toContainText('2023-01-01');
    await expect(validToCol).toContainText('2023');
  });
});

const mockFTErrand = {
  data: {
    ...mockPTErrand_base.data,
    caseType: 'PARATRANSIT_NOTIFICATION',
    phase: ErrandPhase.utredning,
    extraParameters: [
      ...mockPTErrand_base.data.extraParameters,
      { key: 'process.displayPhase', values: ['Utredning'] },
    ],
  },
  message: 'success',
};

const mockFTErrandLocked = {
  data: {
    ...mockFTErrand.data,
    status: {
      statusType: 'Beslutad',
      description: 'Ärendet är beslutat',
      created: '2025-01-01T00:00:00.000+01:00',
    },
  },
  message: 'success',
};

const mockSchema = {
  data: {
    created: '2026-01-28T09:31:47.183+01:00',
    description: 'A JSON-schema that defines services for paratransit errands (FT)',
    id: '2281_fterrandassets_1.0',
    lastUsedForValidation: '2026-03-22T17:30:48.59234+01:00',
    name: 'fterrandassets',
    validationUsageCount: 130,
    value: {
      $id: 'https://example.com/schemas/FTErrandAssets.json',
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      title: 'FTErrandAssets',
      type: 'object',
      additionalProperties: false,
      required: ['type', 'validFrom', 'validityType', 'transportMode', 'isWinterService'],
      properties: {
        type: {
          type: 'string',
          title: 'Restyp',
          default: '',
          oneOf: [
            { const: '', title: 'Välj restyp' },
            { const: 'privat_fritid', title: 'Privatresor/fritidsresor' },
            { const: 'rekreation_fritid', title: 'Rekreationsresor/fritidsresor' },
            { const: 'arbetsresor', title: 'Arbetsresor' },
            { const: 'utbildningsresor', title: 'Utbildningsresor' },
            { const: 'gymnasieresor', title: 'Gymnasieresor' },
          ],
          not: { const: '' },
          errorMessage: { not: 'Vänligen ange restyp' },
        },
        transportMode: {
          type: 'array',
          title: 'Färdsätt',
          uniqueItems: true,
          items: {
            type: 'string',
            oneOf: [
              { const: 'vanligt_sate_personbil', title: 'Vanligt säte i personbil' },
              { const: 'fordon_hogt_insteg', title: 'Fordon med högt insteg' },
              { const: 'rullstolsplats', title: 'Rullstolsplats' },
              { const: 'rullstolsplats_stor', title: 'Rullstolsplats, stor' },
              { const: 'tag', title: 'Tåg' },
              { const: 'buss', title: 'Buss' },
              { const: 'flyg', title: 'Flyg' },
              { const: 'bat', title: 'Båt' },
              { const: 'personbilstaxi', title: 'Personbilstaxi' },
              { const: 'rullstolstaxi', title: 'Rullstolstaxi' },
            ],
          },
        },
        isWinterService: {
          type: 'string',
          title: 'Gäller insatsen vinterfärdtjänst?',
          default: 'nej',
          oneOf: [
            { const: 'nej', title: 'Nej' },
            { const: 'ja', title: 'Ja' },
          ],
          widget: 'RadiobuttonWidget',
        },
        validityType: {
          type: 'string',
          title: 'Giltighet',
          description: 'Välj om insatsen är tillsvidare eller tidsbegränsad.',
          default: 'tillsvidare',
          oneOf: [
            { const: 'tillsvidare', title: 'Tillsvidare' },
            { const: 'tidsbegränsat', title: 'Tidsbegränsat' },
          ],
          widget: 'RadiobuttonWidget',
        },
        validFrom: { type: 'string', format: 'date', title: 'Startdatum' },
        validTo: { type: ['string', 'null'], format: 'date', title: 'Slutdatum' },
        mobilityAids: {
          type: 'array',
          title: 'Förflyttningshjälpmedel',
          uniqueItems: true,
          items: {
            type: 'string',
            oneOf: [
              { const: 'rollator', title: 'Rollator' },
              { const: 'krycka_kapp_stavar', title: 'Krycka, käpp, stavar' },
              { const: 'hopfallbar_rullstol', title: 'Hopfällbar rullstol' },
              { const: 'komfortrullstol', title: 'Komfortrullstol eller motsvarande' },
              { const: 'elrullstol', title: 'Elrullstol' },
              { const: 'elscooter_elmoped', title: 'Elscooter/elmoped' },
              { const: 'ledarhund', title: 'Ledarhund' },
              { const: 'vagn', title: 'Vagn' },
              { const: 'syrgas', title: 'Syrgas' },
              { const: 'balteskudde', title: 'Bälteskudde' },
            ],
          },
        },
        additionalAids: {
          type: 'array',
          title: 'Tillägg',
          uniqueItems: true,
          items: {
            type: 'string',
            oneOf: [
              { const: 'ledsagare', title: 'Ledsagare' },
              { const: 'hamta_lamnas', title: 'Hämta/lämnas i bostaden av chauffören' },
              { const: 'framsate', title: 'Framsätesplacering' },
              { const: 'baksate', title: 'Baksätesplacering (H/V/Båda)' },
              { const: 'hela_baksatet', title: 'Tillgång till hela baksätet' },
              { const: 'begransad_samakning', title: 'Begränsad samåkning' },
              { const: 'ensamakning', title: 'Ensamåkning' },
              { const: 'omvagsbegransning', title: 'Begränsning i omväg' },
              { const: 'egna_barn', title: 'Medföljande egna barn' },
              { const: 'barhjalp', title: 'Bärhjälp' },
              { const: 'litet_djur', title: 'Litet djur' },
              { const: 'begransat_antal_resor', title: 'Begränsat antal resor' },
            ],
          },
        },
        notes: {
          type: 'string',
          title: 'Kommentar',
          description: 'Fria kommentarer kopplade till insatsen.',
          widget: 'TextareaWidget',
        },
      },
      allOf: [
        {
          if: {
            properties: { validityType: { const: 'tidsbegränsat' } },
            required: ['validityType'],
          },
          then: {
            required: ['validTo'],
            properties: { validTo: { type: 'string', format: 'date', readOnly: false } },
          },
        },
        {
          if: {
            properties: { validityType: { const: 'tillsvidare' } },
            required: ['validityType'],
          },
          then: {
            properties: { validTo: { type: ['string', 'null'], readOnly: true } },
          },
        },
      ],
    },
    version: '1.0',
  },
  message: 'success',
};

const mockUiSchema = {
  data: {
    id: 'mock-ui-schema-id',
    value: {
      data: {
        created: '2026-01-28T09:33:27.911+01:00',
        description: 'A UI-schema that defines the rendering of the fterrandassets service form',
        id: 'f8522173-b7fc-4cfa-82eb-2b8bebdb2a3f',
        value: {
          'ui:order': [
            'type',
            'transportMode',
            'additionalAids',
            'mobilityAids',
            'isWinterService',
            'validityType',
            'validFrom',
            'validTo',
            'notes',
          ],
          type: {
            'ui:widget': 'select',
            'ui:emptyValue': '',
            'ui:options': { layout: 'paired', className: 'w-full max-w-[48rem]' },
          },
          transportMode: {
            'ui:widget': 'ComboboxWidget',
            'ui:options': {
              layout: 'paired',
              multiple: true,
              className: 'w-full max-w-[48rem]',
              placeholder: 'Välj färdsätt',
            },
          },
          additionalAids: {
            'ui:widget': 'ComboboxWidget',
            'ui:options': {
              layout: 'paired',
              multiple: true,
              className: 'w-full max-w-[48rem]',
              placeholder: 'Välj tillägg',
            },
          },
          mobilityAids: {
            'ui:widget': 'ComboboxWidget',
            'ui:options': {
              layout: 'paired',
              multiple: true,
              className: 'w-full max-w-[48rem]',
              placeholder: 'Välj förflyttningshjälpmedel',
            },
          },
          isWinterService: {
            'ui:widget': 'RadiobuttonWidget',
            'ui:options': { inline: true, className: 'w-full' },
          },
          validityType: {
            'ui:widget': 'RadiobuttonWidget',
            'ui:options': { inline: true, className: 'w-full', hideDescription: true },
          },
          validFrom: {
            'ui:title': 'Välj period insatsen gäller, startdatum',
            'ui:widget': 'date',
            'ui:options': { layout: 'paired', className: 'w-full max-w-[48rem]' },
          },
          validTo: {
            'ui:title': 'Välj period insatsen gäller, slutdatum',
            'ui:widget': 'date',
            'ui:options': { layout: 'paired', className: 'w-full max-w-[48rem]' },
          },
          notes: {
            'ui:widget': 'TexteditorWidget',
            'ui:options': {
              disableToolbar: false,
              hideLabel: true,
              hideDescription: true,
              className: 'w-full max-w-[96rem] min-h-[22rem]',
            },
          },
        },
      },
      message: 'success',
    },
  },
  message: 'success',
};

type MockRoute = (pattern: string | RegExp, response: unknown, options?: { method?: string }) => Promise<void>;

const setupCommonIntercepts = async (page: import('@playwright/test').Page, mockRoute: MockRoute) => {
  await mockRoute('**/schemas/*/latest', mockSchema);
  await mockRoute('**/schemas/*/ui-schema', mockUiSchema);
  await mockRoute('**/users/admins', mockAdmins);
  await mockRoute('**/me', mockMe);
  await mockRoute('**/featureflags', []);
  await mockRoute('**/personid', mockPersonId, { method: 'POST' });
  await mockRoute('**/messages/*', mockMessages);
  await mockRoute('**/messages', mockMessages, { method: 'POST' });
  await mockRoute('**/errands/*/history', mockHistory);
  await page.route(/\/errand\/\d+\/attachments$/, async (route) => {
    if (route.request().method() !== 'GET') {
      await route.fallback();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockAttachmentsPT),
    });
  });
  await page.route(/\/errand\/\d+\/messages$/, async (route) => {
    if (route.request().method() !== 'GET') {
      await route.fallback();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockMessages),
    });
  });
  await mockRoute('**/sourcerelations/**/**', mockRelations);
  await mockRoute('**/targetrelations/**/**', mockRelations);
  await mockRoute('**/resolvedrelations/**/**', mockResolvedRelations);
  await mockRoute('**/relations/referredfrom/**', mockRelations);
  await mockRoute('**/namespace/errands/**/communication/conversations', mockConversations);
  await mockRoute('**/errands/**/communication/conversations/*/messages', mockConversationMessages);
  await mockRoute('**/render/pdf', {}, { method: 'POST' });
  await mockRoute('**/errands/**/extraparameters', {}, { method: 'PATCH' });
  await mockRoute('**/errands/*', { data: 'ok', message: 'ok' }, { method: 'PATCH' });
};

test.describe('Errand page Insatser tab', () => {
  const visitInsatserTab = async (
    page: import('@playwright/test').Page,
    mockRoute: MockRoute,
    dismissCookieConsent: () => Promise<void>,
    draftAssetFixture: unknown = mockDraftAsset
  ) => {
    await mockRoute('**/errand-services**', draftAssetFixture);
    await mockRoute('**/party-services**', mockAssetEmpty);
    await mockRoute('**/asset-drafts**', draftAssetFixture);
    await mockRoute('**/assets?**', mockAssetEmpty);
    await page.goto(`arende/${mockFTErrand.data.errandNumber}`);
    await page.waitForResponse((resp) => resp.url().includes('/errand/errandNumber/') && resp.status() === 200);
    await dismissCookieConsent();
    await page.locator('.sk-tabs-list button').filter({ hasText: 'Insatser' }).click({ force: true });
  };

  test.beforeEach(async ({ page, mockRoute }) => {
    await setupCommonIntercepts(page, mockRoute);
    await mockRoute('**/errand/errandNumber/*', mockFTErrand);
    await mockRoute('**/stakeholders/personNumber', mockFTErrand.data.stakeholders, { method: 'POST' });
    await mockRoute('**/assets?partyId=aaaaaaa-bbbb-aaaa-bbbb-aaaabbbbcccc&type=PARKINGPERMIT', {
      data: [],
      message: 'success',
    });
  });

  test('displays the Insatser tab with heading and description', async ({ page, mockRoute, dismissCookieConsent }) => {
    await visitInsatserTab(page, mockRoute, dismissCookieConsent);
    await expect(page.locator('[data-cy="services-tab"]')).toBeVisible();
    await expect(page.locator('[data-cy="services-tab"] h2')).toHaveText('Insatser');
    await expect(page.locator('[data-cy="services-tab"] p').first()).toContainText('färdtjänstbeslutet');
  });

  test('shows the add form when errand is not locked', async ({ page, mockRoute, dismissCookieConsent }) => {
    await visitInsatserTab(page, mockRoute, dismissCookieConsent);
    await expect(page.locator('[data-cy="services-form"]')).toBeVisible();
  });

  test('lists existing draft services', async ({ page, mockRoute, dismissCookieConsent }) => {
    await visitInsatserTab(page, mockRoute, dismissCookieConsent, mockDraftAsset);
    await expect(page.locator('[data-cy="service-item"]')).toHaveCount(1);
  });

  test('shows edit and remove buttons on draft services', async ({ page, mockRoute, dismissCookieConsent }) => {
    await visitInsatserTab(page, mockRoute, dismissCookieConsent, mockDraftAsset);
    const firstItem = page.locator('[data-cy="service-item"]').first();
    await expect(firstItem.locator('[data-cy="edit-service-button"]')).toContainText('Redigera insats');
    await expect(firstItem.locator('[data-cy="remove-service-button"]')).toContainText('Ta bort insats');
  });

  test('shows empty list when no draft services exist', async ({ page, mockRoute, dismissCookieConsent }) => {
    await visitInsatserTab(page, mockRoute, dismissCookieConsent, mockDraftAssetEmpty);
    await expect(page.locator('[data-cy="service-item"]')).toHaveCount(0);
  });

  test('opens edit modal when clicking edit button', async ({ page, mockRoute, dismissCookieConsent }) => {
    await visitInsatserTab(page, mockRoute, dismissCookieConsent, mockDraftAsset);
    await page.locator('[data-cy="edit-service-button"]').first().click();
    await expect(page.locator('.sk-modal-dialog-header-title')).toContainText('Redigera insats');
  });

  test('calls the draft asset endpoint when removing a service', async ({ page, mockRoute, dismissCookieConsent }) => {
    await mockRoute('**/asset-drafts/*', { data: 'ok', message: 'ok' }, { method: 'DELETE' });
    await visitInsatserTab(page, mockRoute, dismissCookieConsent, mockDraftAsset);
    const deleteRequest = page.waitForRequest(
      (req) => /\/asset-drafts\//.test(req.url()) && req.method() === 'DELETE'
    );
    await page.locator('[data-cy="remove-service-button"]').first().click();
    await deleteRequest;
  });

  test('calls the draft asset endpoint when editing a service', async ({ page, mockRoute, dismissCookieConsent }) => {
    await mockRoute('**/asset-drafts/*', { data: 'ok', message: 'ok' }, { method: 'PATCH' });
    await visitInsatserTab(page, mockRoute, dismissCookieConsent, mockDraftAsset);
    await page.locator('[data-cy="edit-service-button"]').first().click();
    await expect(page.locator('.sk-modal')).toBeVisible();
    const patchRequest = page.waitForRequest(
      (req) => /\/asset-drafts\//.test(req.url()) && req.method() === 'PATCH'
    );
    await page.locator("[data-cy='schema-submit-button']").filter({ hasText: 'Spara' }).click();
    await patchRequest;
  });

  test('creates a new draft asset via the draft endpoint', async ({ page, mockRoute, dismissCookieConsent }) => {
    await mockRoute('**/asset-drafts**', { data: 'ok', message: 'ok' }, { method: 'POST' });
    await visitInsatserTab(page, mockRoute, dismissCookieConsent, mockDraftAssetEmpty);
    await expect(page.locator('[data-cy="services-form"]')).toBeVisible();
    await page.locator('select#root_type').selectOption('privat_fritid');
    await page.locator('input#root_validFrom').fill('2023-01-01');
    await page.locator('[data-cy="service-start-date"]').fill('2023-01-01');
    const postRequest = page.waitForRequest(
      (req) => /\/asset-drafts/.test(req.url()) && req.method() === 'POST'
    );
    await page.locator("[data-cy='schema-submit-button']").filter({ hasText: 'Lägg till' }).click();
    await postRequest;
  });

  test.describe('when errand is locked', () => {
    test.beforeEach(async ({ page, mockRoute }) => {
      await mockRoute('**/errand/errandNumber/*', mockFTErrandLocked);
    });

    test('hides the add form', async ({ page, mockRoute, dismissCookieConsent }) => {
      await visitInsatserTab(page, mockRoute, dismissCookieConsent, mockDraftAsset);
      await expect(page.locator('[data-cy="services-form"]')).toHaveCount(0);
    });

    test('hides edit and remove buttons on services', async ({ page, mockRoute, dismissCookieConsent }) => {
      await visitInsatserTab(page, mockRoute, dismissCookieConsent, mockDraftAsset);
      await expect(page.locator('[data-cy="edit-service-button"]')).toHaveCount(0);
      await expect(page.locator('[data-cy="remove-service-button"]')).toHaveCount(0);
    });
  });
});
