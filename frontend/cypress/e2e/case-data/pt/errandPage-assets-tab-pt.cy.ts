/// <reference types="cypress" />

import { onlyOn } from '@cypress/skip-test';
import { mockAttachmentsPT } from 'cypress/e2e/case-data/fixtures/mockAttachments';
import { mockHistory } from 'cypress/e2e/case-data/fixtures/mockHistory';
import { mockPersonId } from 'cypress/e2e/case-data/fixtures/mockPersonId';
import { mockAdmins } from '../fixtures/mockAdmins';
import { mockAsset } from '../fixtures/mockAsset';
import { mockConversationMessages, mockConversations } from '../fixtures/mockConversations';
import { mockMe } from '../fixtures/mockMe';
import { mockMessages } from '../fixtures/mockMessages';
import { mockPTErrand_base } from '../fixtures/mockPtErrand';
import { mockRelations } from '../fixtures/mockRelations';

const tableHeaderColumns = {
  0: 'Typ',
  1: 'Kortnummer',
  2: 'Status',
  3: 'Ärendenummer',
  4: 'Beslutad',
  5: 'Giltighetstid',
};

onlyOn(Cypress.env('application_name') === 'PT', () => {
  describe('Errand page assets tab', () => {
    beforeEach(() => {
      cy.intercept('GET', '**/metadata/jsonschemas/*/latest', { data: { id: 'mock-schema-id', schema: {} } });
      cy.intercept('GET', '**/users/admins', mockAdmins);
      cy.intercept('GET', '**/me', mockMe);
      cy.intercept('GET', '**/featureflags', []);
      cy.intercept('POST', '**/personid', mockPersonId);
      cy.intercept('GET', /\/errand\/\d*/, mockPTErrand_base).as('getErrandById');
      cy.intercept('GET', /\/errand\/\d+\/attachments$/, mockAttachmentsPT).as('getErrandAttachments');
      cy.intercept('PATCH', '**/errands/*', { data: 'ok', message: 'ok' }).as('patchErrand');
      cy.intercept('GET', '**/errand/errandNumber/*', mockPTErrand_base).as('getErrand');
      cy.intercept('POST', '**/stakeholders/personNumber', mockPTErrand_base.data.stakeholders);
      cy.intercept('GET', '**/assets?partyId=aaaaaaa-bbbb-aaaa-bbbb-aaaabbbbcccc&type=PARKINGPERMIT', mockAsset);
      cy.intercept('GET', '**/messages/*', mockMessages);
      cy.intercept('POST', '**/messages', mockMessages);
      cy.intercept('GET', '**/errands/*/history', mockHistory).as('getHistory');
      cy.intercept('GET', '**/contract/2024-01026', mockPTErrand_base).as('getContract');

      cy.intercept('GET', '**/contracts/2024-01026', mockPTErrand_base).as('getContract');

      cy.intercept('GET', /\/errand\/\d+\/messages$/, mockMessages);

      cy.intercept('GET', '**/sourcerelations/**/**', mockRelations).as('getSourceRelations');
      cy.intercept('GET', '**/targetrelations/**/**', mockRelations).as('getTargetRelations');
      cy.intercept('GET', '**/namespace/errands/**/communication/conversations', mockConversations).as(
        'getConversations'
      );
      cy.intercept('GET', '**/errands/**/communication/conversations/*/messages', mockConversationMessages).as(
        'getConversationMessages'
      );
      cy.intercept('PATCH', '**/errands/**/extraparameters', {});

      cy.visit(`/arende/2281/${mockPTErrand_base.data.errandNumber}`);
      cy.wait('@getErrand');
      cy.get('.sk-cookie-consent-btn-wrapper').contains('Godkänn alla').click();
      cy.get('.sk-tabs-list button')
        .eq(4)
        .should('have.text', `Tillstånd & tjänster (${mockAsset.data.length})`)
        .click({ force: true });
    });

    it('shows the correct table headers and assets', () => {
      cy.get('[data-cy="assets-table"]').should('exist');
      cy.get('.sk-table-sortbutton').should('exist').contains('span', tableHeaderColumns[0]);
      cy.get('.sk-table-sortbutton').should('exist').contains('span', tableHeaderColumns[1]);
      cy.get('.sk-table-sortbutton').should('exist').contains('span', tableHeaderColumns[2]);
      cy.get('.sk-table-sortbutton').should('exist').contains('span', tableHeaderColumns[3]);
      cy.get('.sk-table-sortbutton').should('exist').contains('span', tableHeaderColumns[4]);
      cy.get('.sk-table-sortbutton').should('exist').contains('span', tableHeaderColumns[5]);

      cy.get('[data-cy="table-column-type"]').should('exist').contains('strong', 'P-tillstånd');
      cy.get('[data-cy="table-column-assetId"]').should('exist').contains('span', '133773');
      cy.get('[data-cy="table-column-status"]').should('exist').contains('span', 'Aktivt');
      cy.get('[data-cy="table-column-errandNumber"]').should('exist').contains('span', 'PRH-2023-000283');
      cy.get('[data-cy="table-column-issued"]').should('exist').contains('span', '2023-01-01');
      cy.get('[data-cy="table-column-validTo"]').should('exist').contains('span', '2023-01-01 - 2023-12-24');
    });
  });
});
