/// <reference types="cypress" />

import { onlyOn } from '@cypress/skip-test';
import { mockAttachments } from 'cypress/e2e/case-data/fixtures/mockAttachments';
import { mockHistory } from 'cypress/e2e/case-data/fixtures/mockHistory';
import { mockPersonId } from 'cypress/e2e/case-data/fixtures/mockPersonId';
import { mockAdmins } from '../fixtures/mockAdmins';
import { mockMe } from '../fixtures/mockMe';
import { mockMessages } from '../fixtures/mockMessages';
import { mockPTErrand_base } from '../fixtures/mockPtErrand';
import { mockAsset } from '../fixtures/mockAsset';

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
      cy.intercept('GET', '**/messages/PRH-2022-000019', mockMessages);
      cy.intercept('GET', '**/users/admins', mockAdmins);
      cy.intercept('GET', '**/me', mockMe);
      cy.intercept('POST', '**/personid', mockPersonId);
      cy.intercept('GET', /\/attachments\/errand\/\d*/, mockAttachments).as('getErrandAttachments');
      cy.intercept('PATCH', '**/errands/*', { data: 'ok', message: 'ok' }).as('patchErrand');
      cy.intercept('GET', '**/errand/errandNumber/*', mockPTErrand_base).as('getErrand');
      cy.intercept('POST', '**/stakeholders/personNumber', mockPTErrand_base.data.stakeholders);
      cy.intercept('GET', '**/assets?partyId=aaaaaaa-bbbb-aaaa-bbbb-aaaabbbbcccc&type=PARKINGPERMIT', mockAsset);

      cy.intercept('GET', '**/errands/*/history', mockHistory).as('getHistory');

      cy.visit(`/arende/2281/${mockPTErrand_base.data.errandNumber}`);
      cy.wait('@getErrand');
      cy.get('.sk-cookie-consent-btn-wrapper').contains('Godkänn alla').click();
      cy.get('.sk-tabs .sk-menubar button')
        .eq(3)
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
      cy.get('[data-cy="table-column-validTo"]').should('exist').contains('span', '2023-01-01-2023-12-24');
    });
  });
});
