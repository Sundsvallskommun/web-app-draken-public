/// <reference types="cypress" />

import { onlyOn } from '@cypress/skip-test';
import { mockAttachments } from 'cypress/e2e/case-data/fixtures/mockAttachments';
import { mockPersonId } from 'cypress/e2e/case-data/fixtures/mockPersonId';
import { mockPhrases } from 'cypress/e2e/case-data/fixtures/mockPhrases';
import { mockHistory } from 'cypress/e2e/case-data/fixtures/mockHistory';
import { mockMessages } from '../fixtures/mockMessages';
import { mockAdmins } from '../fixtures/mockAdmins';
import { mockMe } from '../fixtures/mockMe';
import { mockPermits } from '../fixtures/mockPermits';
import { mockAsset } from '../fixtures/mockAsset';
import { mockMexErrand_base } from '../fixtures/mockMexErrand';
import { mockPurchaseAgreement } from '../fixtures/mockContract';
import { mockConversations, mockConversationMessages } from '../fixtures/mockConversations';
import { mockRelations } from '../fixtures/mockRelations';
import { mockJsonSchema } from '../fixtures/mockJsonSchema';

onlyOn(Cypress.env('application_name') === 'MEX', () => {
  describe('Decisions tab', () => {
    beforeEach(() => {
      cy.intercept('GET', '**/messages/*', mockMessages);
      cy.intercept('POST', '**/phrases', mockPhrases);
      cy.intercept('GET', '**/users/admins', mockAdmins);
      cy.intercept('GET', '**/me', mockMe);
      cy.intercept('POST', '**/personid', mockPersonId);
      cy.intercept('GET', '**/parking-permits/', mockPermits);
      cy.intercept('GET', '**/parking-permits/?personId=aaaaaaa-bbbb-aaaa-bbbb-aaaabbbbcccc', mockPermits);
      cy.intercept('GET', /\/errand\/\d*/, mockMexErrand_base).as('getErrandById');
      cy.intercept('GET', /\/errand\/\d+\/attachments$/, mockAttachments).as('getErrandAttachments');
      cy.intercept('PATCH', '**/errands/*', { data: 'ok', message: 'ok' }).as('patchErrand');
      cy.intercept('GET', '**/errand/errandNumber/*', mockMexErrand_base).as('getErrand');
      cy.intercept('GET', '**/contract/**', mockPurchaseAgreement).as('getContract');
      cy.intercept('POST', '**/templates/phrases*', mockPhrases).as('getPhrases');
      cy.intercept('GET', '**/errands/*/history', mockHistory).as('getHistory');
      cy.intercept('GET', '**/assets?partyId=aaaaaaa-bbbb-aaaa-bbbb-aaaabbbbcccc&type=PARKINGPERMIT', mockAsset);
      cy.intercept('GET', /\/errand\/\d+\/messages$/, mockMessages);

      cy.intercept('GET', '**/contract/2024-01026', mockPurchaseAgreement).as('getContract');

      cy.intercept('GET', '**/errand/errandNumber/*', mockMexErrand_base).as('getErrand');
      cy.intercept('GET', '**/sourcerelations/**/**', mockRelations).as('getSourceRelations');
      cy.intercept('GET', '**/targetrelations/**/**', mockRelations).as('getTargetRelations');
      cy.intercept('GET', '**/namespace/errands/**/communication/conversations', mockConversations).as(
        'getConversations'
      );
      cy.intercept('GET', '**/errands/**/communication/conversations/*/messages', mockConversationMessages).as(
        'getConversationMessages'
      );
      cy.intercept('GET', '**/assets**', mockAsset).as('getAssets');
      cy.intercept('GET', '**/metadata/jsonschemas/FTErrandAssets/latest', mockJsonSchema).as('getJsonSchema');

      cy.visit(`/arende/2281/${mockMexErrand_base.data.errandNumber}`);
      cy.wait('@getErrand');
      cy.get('.sk-cookie-consent-btn-wrapper').should('exist').contains('Godkänn alla').click();
      cy.get('.sk-tabs-list button').eq(5).should('have.text', 'Beslut').click({ force: true });
    });

    it('displays the correct fields', () => {
      cy.get('[data-cy="decision-outcome-select"]').should('exist');
      cy.get('[data-cy="validFrom-input"]').should('not.exist');
      cy.get('[data-cy="validTo-input"]').should('not.exist');
      cy.get('[data-cy="decision-richtext-wrapper"]').should('exist');
    });

    it('can edit decision fields', () => {
      cy.intercept('POST', '**/render/pdf', mockMexErrand_base).as('postRenderPdf');
      cy.intercept('PUT', `**/decisions/${mockMexErrand_base.data.decisions[0].id}`, mockMexErrand_base).as(
        'updateDecision'
      );

      cy.get('[data-cy="decision-outcome-select"]').should('exist').select(2);
      cy.get('[data-cy="decision-richtext-wrapper"]').should('exist').clear().type('Mock text');
      cy.get('[data-cy="save-decision-button"]').should('exist').click();
      cy.get('button').should('exist').contains('Ja').click();

      cy.wait('@updateDecision').should(({ request }) => {
        expect(request.body.description).to.contain('Mock text');
        expect(request.body.decisionType).to.equal('FINAL');
      });
    });

    it('save button enabled but send decision is disabled if no decision, fromDate or toDate is selected', () => {
      cy.get('[data-cy="decision-outcome-select"]').should('exist').select('Välj utfall');
      cy.get('[data-cy="decision-richtext-wrapper"]').should('exist').clear().type('Mock text');
      cy.contains('Förslag till beslut måste anges').should('exist');
      cy.get('[data-cy="save-decision-button"]').should('exist').should('be.enabled');
      cy.get('[data-cy="save-and-send-decision-button"]').should('exist').should('be.disabled');
    });
  });
});
