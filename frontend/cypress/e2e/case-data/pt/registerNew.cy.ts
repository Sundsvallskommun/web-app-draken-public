/// <reference types="cypress" />

import { onlyOn } from '@cypress/skip-test';
import { mockAttachments } from 'cypress/e2e/case-data/fixtures/mockAttachments';
import { mockErrands_base } from 'cypress/e2e/case-data/fixtures/mockErrands';
import { mockHistory } from 'cypress/e2e/case-data/fixtures/mockHistory';
import { mockPersonId } from 'cypress/e2e/case-data/fixtures/mockPersonId';
import { mockAdmins } from '../fixtures/mockAdmins';
import { mockMe } from '../fixtures/mockMe';
import { mockMessages } from '../fixtures/mockMessages';
import { mockPermits } from '../fixtures/mockPermits';
import { mockPTCaseTypes } from 'cypress/e2e/case-data/fixtures/mockCaseTypes';
import { mockMexErrand_base } from '../fixtures/mockMexErrand';
import { mockContract } from '../fixtures/mockContract';

//NOTE: copied structure from MEX - needs cleanup and detail fix to match PT

onlyOn(Cypress.env('application_name') === 'PT', () => {
  describe('Register errand', () => {
    beforeEach(() => {
      cy.intercept('GET', '**/messages/*', mockMessages);
      cy.intercept('POST', '**/personid', mockPersonId);
      cy.intercept('GET', '**/users/admins', mockAdmins);
      cy.intercept('GET', '**/me', mockMe).as('mockMe');
      cy.intercept('GET', '**/parking-permits/', mockPermits);
      cy.intercept('GET', '**/parking-permits/?personId=aaaaaaa-bbbb-aaaa-bbbb-aaaabbbbcccc', mockPermits);
      cy.intercept('GET', '**/errands*', mockErrands_base).as('getErrands');
      cy.intercept('GET', /\/errand\/\d*/, mockMexErrand_base).as('getErrandById');
      cy.intercept('GET', /\/errand\/\d*\/attachments/, mockAttachments).as('getErrandAttachments');
      cy.intercept('GET', '**/errand/errandNumber/*', mockMexErrand_base).as('getErrand');
      cy.intercept('GET', '**/errands/*/history', mockHistory).as('getHistory');
      cy.intercept('GET', '**/contract/*', mockContract);
      cy.visit('/registrera');
      cy.get('.sk-cookie-consent-btn-wrapper').contains('Godkänn alla').click();
    });

    it('shows correct buttons and input select fields', () => {
      cy.get('[data-cy="registerErrandHeading"] button').eq(0).contains('Avbryt').should('exist');
      cy.get('[data-cy="registerErrandHeading"] button').eq(1).contains('Registrera').should('exist');
      cy.get('.sk-menubar .sk-menubar-item button').eq(0).contains('Grunduppgifter').should('exist');
      cy.get('[data-cy="channel-input"]').should('exist').should('be.disabled');
      cy.get('[data-cy="municipality-input"]').should('exist');
      cy.get('[data-cy="casetype-input"]').should('exist');
      cy.get('[data-cy="casetype-input"]').should('exist');
      cy.get('[data-cy="priority-input"]').should('exist');
      cy.get('.sk-tabs-content button[data-cy="save-and-continue-button"]').contains('Registrera').should('exist');
    });

    it('Manages select input and register', () => {
      cy.intercept('POST', '**/errands', mockMexErrand_base).as('postErrand');
      cy.intercept('GET', '**/errand/errandNumber/*', mockMexErrand_base).as('getErrand');
      cy.get('[data-cy="municipality-input"]').should('be.disabled');
      mockPTCaseTypes.data.forEach((type) => {
        cy.get('[data-cy="casetype-input"]').select(type);
      });

      cy.get('[data-cy="priority-input"]').select('Hög');
      cy.get('[data-cy="priority-input"]').select('Medel');
      cy.get('[data-cy="priority-input"]').select('Låg');

      cy.get('.sk-tabs-content button[data-cy="save-and-continue-button"]').contains('Registrera').click();
      cy.get('.sk-modal-dialog').should('exist');
      cy.get('.sk-modal-footer button.sk-btn-secondary').contains('Nej').should('exist').click();

      cy.get('.sk-tabs-content button[data-cy="save-and-continue-button"]').contains('Registrera').click();
      cy.get('.sk-modal-dialog').should('exist');
      cy.get('.sk-modal-footer button.sk-btn-primary').contains('Ja').should('exist').click();
      cy.wait('@postErrand');
      cy.wait('@getErrandById');
      cy.visit(`/arende/${mockMexErrand_base.data.id}`);
    });

    it('Can cancel the process, going back to overview', () => {
      cy.intercept('GET', '**/errands*', mockErrands_base).as('getErrands');
      cy.get('[data-cy="registerErrandHeading"] button').eq(0).contains('Avbryt').should('exist').click();
      cy.get('@getErrands');
      cy.visit('/oversikt');
    });
  });
});
