/// <reference types="cypress" />

import { onlyOn } from '@cypress/skip-test';
import { mockAttachmentsPT } from 'cypress/e2e/case-data/fixtures/mockAttachments';
import { mockHistory } from 'cypress/e2e/case-data/fixtures/mockHistory';
import { mockPersonId } from 'cypress/e2e/case-data/fixtures/mockPersonId';
import { ErrandPhase } from '@casedata/interfaces/errand-phase';
import { mockAdmins } from '../fixtures/mockAdmins';
import { mockDraftAsset, mockDraftAssetEmpty } from '../fixtures/mockDraftAsset';
import { mockConversationMessages, mockConversations } from '../fixtures/mockConversations';
import { mockMe } from '../fixtures/mockMe';
import { mockMessages } from '../fixtures/mockMessages';
import { mockPTErrand_base } from '../fixtures/mockPtErrand';
import { mockRelations } from '../fixtures/mockRelations';

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

const setupCommonIntercepts = () => {
  cy.intercept('GET', '**/schemas/*/latest', {
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
              {
                const: '',
                title: 'Välj restyp',
              },
              {
                const: 'privat_fritid',
                title: 'Privatresor/fritidsresor',
              },
              {
                const: 'rekreation_fritid',
                title: 'Rekreationsresor/fritidsresor',
              },
              {
                const: 'arbetsresor',
                title: 'Arbetsresor',
              },
              {
                const: 'utbildningsresor',
                title: 'Utbildningsresor',
              },
              {
                const: 'gymnasieresor',
                title: 'Gymnasieresor',
              },
            ],
            not: {
              const: '',
            },
            errorMessage: {
              not: 'Vänligen ange restyp',
            },
          },
          transportMode: {
            type: 'array',
            title: 'Färdsätt',
            uniqueItems: true,
            items: {
              type: 'string',
              oneOf: [
                {
                  const: 'vanligt_sate_personbil',
                  title: 'Vanligt säte i personbil',
                },
                {
                  const: 'fordon_hogt_insteg',
                  title: 'Fordon med högt insteg',
                },
                {
                  const: 'rullstolsplats',
                  title: 'Rullstolsplats',
                },
                {
                  const: 'rullstolsplats_stor',
                  title: 'Rullstolsplats, stor',
                },
                {
                  const: 'tag',
                  title: 'Tåg',
                },
                {
                  const: 'buss',
                  title: 'Buss',
                },
                {
                  const: 'flyg',
                  title: 'Flyg',
                },
                {
                  const: 'bat',
                  title: 'Båt',
                },
                {
                  const: 'personbilstaxi',
                  title: 'Personbilstaxi',
                },
                {
                  const: 'rullstolstaxi',
                  title: 'Rullstolstaxi',
                },
              ],
            },
          },
          isWinterService: {
            type: 'string',
            title: 'Gäller insatsen vinterfärdtjänst?',
            default: 'nej',
            oneOf: [
              {
                const: 'nej',
                title: 'Nej',
              },
              {
                const: 'ja',
                title: 'Ja',
              },
            ],
            widget: 'RadiobuttonWidget',
          },
          validityType: {
            type: 'string',
            title: 'Giltighet',
            description: 'Välj om insatsen är tillsvidare eller tidsbegränsad.',
            default: 'tillsvidare',
            oneOf: [
              {
                const: 'tillsvidare',
                title: 'Tillsvidare',
              },
              {
                const: 'tidsbegränsat',
                title: 'Tidsbegränsat',
              },
            ],
            widget: 'RadiobuttonWidget',
          },
          validFrom: {
            type: 'string',
            format: 'date',
            title: 'Startdatum',
          },
          validTo: {
            type: ['string', 'null'],
            format: 'date',
            title: 'Slutdatum',
          },
          mobilityAids: {
            type: 'array',
            title: 'Förflyttningshjälpmedel',
            uniqueItems: true,
            items: {
              type: 'string',
              oneOf: [
                {
                  const: 'rollator',
                  title: 'Rollator',
                },
                {
                  const: 'krycka_kapp_stavar',
                  title: 'Krycka, käpp, stavar',
                },
                {
                  const: 'hopfallbar_rullstol',
                  title: 'Hopfällbar rullstol',
                },
                {
                  const: 'komfortrullstol',
                  title: 'Komfortrullstol eller motsvarande',
                },
                {
                  const: 'elrullstol',
                  title: 'Elrullstol',
                },
                {
                  const: 'elscooter_elmoped',
                  title: 'Elscooter/elmoped',
                },
                {
                  const: 'ledarhund',
                  title: 'Ledarhund',
                },
                {
                  const: 'vagn',
                  title: 'Vagn',
                },
                {
                  const: 'syrgas',
                  title: 'Syrgas',
                },
                {
                  const: 'balteskudde',
                  title: 'Bälteskudde',
                },
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
                {
                  const: 'ledsagare',
                  title: 'Ledsagare',
                },
                {
                  const: 'hamta_lamnas',
                  title: 'Hämta/lämnas i bostaden av chauffören',
                },
                {
                  const: 'framsate',
                  title: 'Framsätesplacering',
                },
                {
                  const: 'baksate',
                  title: 'Baksätesplacering (H/V/Båda)',
                },
                {
                  const: 'hela_baksatet',
                  title: 'Tillgång till hela baksätet',
                },
                {
                  const: 'begransad_samakning',
                  title: 'Begränsad samåkning',
                },
                {
                  const: 'ensamakning',
                  title: 'Ensamåkning',
                },
                {
                  const: 'omvagsbegransning',
                  title: 'Begränsning i omväg',
                },
                {
                  const: 'egna_barn',
                  title: 'Medföljande egna barn',
                },
                {
                  const: 'barhjalp',
                  title: 'Bärhjälp',
                },
                {
                  const: 'litet_djur',
                  title: 'Litet djur',
                },
                {
                  const: 'begransat_antal_resor',
                  title: 'Begränsat antal resor',
                },
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
              properties: {
                validityType: {
                  const: 'tidsbegränsat',
                },
              },
              required: ['validityType'],
            },
            then: {
              required: ['validTo'],
              properties: {
                validTo: {
                  type: 'string',
                  format: 'date',
                  readOnly: false,
                },
              },
            },
          },
          {
            if: {
              properties: {
                validityType: {
                  const: 'tillsvidare',
                },
              },
              required: ['validityType'],
            },
            then: {
              properties: {
                validTo: {
                  type: ['string', 'null'],
                  readOnly: true,
                },
              },
            },
          },
        ],
      },
      version: '1.0',
    },
    message: 'success',
  }).as('getSchema');
  cy.intercept('GET', '**/schemas/*/ui-schema', {
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
              'ui:options': {
                layout: 'paired',
                className: 'w-full max-w-[48rem]',
              },
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
              'ui:options': {
                inline: true,
                className: 'w-full',
              },
            },
            validityType: {
              'ui:widget': 'RadiobuttonWidget',
              'ui:options': {
                inline: true,
                className: 'w-full',
                hideDescription: true,
              },
            },
            validFrom: {
              'ui:title': 'Välj period insatsen gäller, startdatum',
              'ui:widget': 'date',
              'ui:options': {
                layout: 'paired',
                className: 'w-full max-w-[48rem]',
              },
            },
            validTo: {
              'ui:title': 'Välj period insatsen gäller, slutdatum',
              'ui:widget': 'date',
              'ui:options': {
                layout: 'paired',
                className: 'w-full max-w-[48rem]',
              },
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
  }).as('getUiSchema');
  cy.intercept('GET', '**/users/admins', mockAdmins);
  cy.intercept('GET', '**/me', mockMe);
  cy.intercept('GET', '**/featureflags', []);
  cy.intercept('POST', '**/personid', mockPersonId);
  cy.intercept('GET', '**/messages/*', mockMessages);
  cy.intercept('POST', '**/messages', mockMessages);
  cy.intercept('GET', '**/errands/*/history', mockHistory).as('getHistory');
  // cy.intercept('GET', /\/errand\/\d{0,4}/, mockFTErrand).as('getErrandById');
  cy.intercept('GET', /\/errand\/\d+\/attachments$/, mockAttachmentsPT).as('getErrandAttachments');
  cy.intercept('GET', /\/errand\/\d+\/messages$/, mockMessages);
  cy.intercept('GET', '**/sourcerelations/**/**', mockRelations).as('getSourceRelations');
  cy.intercept('GET', '**/targetrelations/**/**', mockRelations).as('getTargetRelations');
  cy.intercept('GET', '**/namespace/errands/**/communication/conversations', mockConversations).as('getConversations');
  cy.intercept('GET', '**/errands/**/communication/conversations/*/messages', mockConversationMessages).as(
    'getConversationMessages'
  );
  cy.intercept('PATCH', '**/errands/**/extraparameters', {});
  cy.intercept('PATCH', '**/errands/*', { data: 'ok', message: 'ok' }).as('patchErrand');
};

onlyOn(Cypress.env('application_name') === 'PT', () => {
  describe('Errand page assets tab', () => {
    const visitInsatserTab = (draftAssetFixture = mockDraftAsset) => {
      cy.intercept('GET', '**/asset-drafts**', draftAssetFixture).as('getDraftAssets');
      cy.visit(`/arende/${mockFTErrand.data.errandNumber}`);
      cy.wait('@getErrand');
      cy.get('.sk-cookie-consent-btn-wrapper').contains('Godkänn alla').click();
      cy.get('.sk-tabs-list button').contains('Insatser').click({ force: true });
    };

    beforeEach(() => {
      setupCommonIntercepts();
      cy.intercept('GET', '**/errand/errandNumber/*', mockFTErrand).as('getErrand');
      cy.intercept('POST', '**/stakeholders/personNumber', mockFTErrand.data.stakeholders);
      cy.intercept('GET', '**/assets?partyId=aaaaaaa-bbbb-aaaa-bbbb-aaaabbbbcccc&type=PARKINGPERMIT', {
        data: [],
        message: 'success',
      });
    });

    it('displays the Insatser tab with heading and description', () => {
      visitInsatserTab();
      cy.get('[data-cy="services-tab"]').should('exist');
      cy.get('[data-cy="services-tab"] h2').should('have.text', 'Insatser');
      cy.get('[data-cy="services-tab"] p').should('contain.text', 'färdtjänstbeslutet');
    });

    it('shows the add form when errand is not locked', () => {
      visitInsatserTab();
      cy.get('[data-cy="services-form"]').should('exist');
    });

    it('lists existing draft services', () => {
      visitInsatserTab(mockDraftAsset);
      cy.wait('@getDraftAssets');
      cy.get('[data-cy="service-item"]').should('have.length', 1);
    });

    it('shows edit and remove buttons on draft services', () => {
      visitInsatserTab(mockDraftAsset);
      cy.wait('@getDraftAssets');
      cy.get('[data-cy="service-item"]')
        .first()
        .within(() => {
          cy.get('[data-cy="edit-service-button"]').should('exist').and('contain.text', 'Redigera insats');
          cy.get('[data-cy="remove-service-button"]').should('exist').and('contain.text', 'Ta bort insats');
        });
    });

    it('shows empty list when no draft services exist', () => {
      visitInsatserTab(mockDraftAssetEmpty);
      cy.wait('@getDraftAssets');
      cy.get('[data-cy="service-item"]').should('not.exist');
    });

    it('opens edit modal when clicking edit button', () => {
      visitInsatserTab(mockDraftAsset);
      cy.wait('@getDraftAssets');
      cy.get('[data-cy="edit-service-button"]').first().click();
      cy.get('.sk-modal-dialog-header-title').should('exist').and('contain.text', 'Redigera insats');
    });

    it('calls the draft asset endpoint when removing a service', () => {
      cy.intercept('PATCH', '**/asset-drafts/*', { data: 'ok', message: 'ok' }).as('patchDraftAsset');
      visitInsatserTab(mockDraftAsset);
      cy.wait('@getDraftAssets');
      cy.get('[data-cy="remove-service-button"]').first().click();
      cy.wait('@patchDraftAsset');
    });

    it('calls the draft asset endpoint when editing a service', () => {
      cy.intercept('PATCH', '**/asset-drafts/*', { data: 'ok', message: 'ok' }).as('patchDraftAsset');
      visitInsatserTab(mockDraftAsset);
      cy.wait('@getDraftAssets');
      cy.get('[data-cy="edit-service-button"]').first().click();
      cy.get('.sk-modal').should('exist');
      cy.get("[data-cy='schema-submit-button']").contains('Spara').should('exist').click();
      cy.wait('@patchDraftAsset');
    });

    it('creates a new draft asset via the draft endpoint', () => {
      cy.intercept('POST', '**/asset-drafts**', { data: 'ok', message: 'ok' }).as('createDraftAsset');
      visitInsatserTab(mockDraftAssetEmpty);
      cy.wait('@getDraftAssets');
      cy.get('[data-cy="services-form"]').should('exist');
      cy.get('select#root_type').select('privat_fritid');
      cy.get('input#root_validFrom').type('2023-01-01');
      cy.get("[data-cy='schema-submit-button']").contains('Lägg till').should('exist').click();
      cy.wait('@createDraftAsset');
    });

    describe('when errand is locked', () => {
      beforeEach(() => {
        setupCommonIntercepts();
        cy.intercept('GET', /\/errand\/\d+\/messages$/, mockMessages).as('getMessages');
        cy.intercept('GET', '**/errand/errandNumber/*', mockFTErrandLocked).as('getErrand');
      });

      it('hides the add form', () => {
        visitInsatserTab(mockDraftAsset);
        cy.get('[data-cy="services-form"]').should('not.exist');
      });

      it('hides edit and remove buttons on services', () => {
        visitInsatserTab(mockDraftAsset);
        cy.wait('@getDraftAssets');
        cy.get('[data-cy="edit-service-button"]').should('not.exist');
        cy.get('[data-cy="remove-service-button"]').should('not.exist');
      });
    });
  });
});
