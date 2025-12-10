/// <reference types="cypress" />

import { MEXCaseLabel } from '@casedata/interfaces/case-label';
import { MEXLegacyCaseType } from '@casedata/interfaces/case-type';
import { onlyOn } from '@cypress/skip-test';
import { mockAttachments } from 'cypress/e2e/case-data/fixtures/mockAttachments';
import { mockErrands_base } from 'cypress/e2e/case-data/fixtures/mockErrands';
import { mockAdmins } from '../fixtures/mockAdmins';
import { mockContract } from '../fixtures/mockContract';
import { mockConversationMessages, mockConversations } from '../fixtures/mockConversations';
import { mockMe } from '../fixtures/mockMe';
import { mockMexErrand_base } from '../fixtures/mockMexErrand';
import { mockNotifications } from '../fixtures/mockNotifications';
import { mockRelations } from '../fixtures/mockRelations';
import { mockJsonSchema } from '../fixtures/mockJsonSchema';

onlyOn(Cypress.env('application_name') === 'MEX', () => {
  describe('Register errand', () => {
    beforeEach(() => {
      cy.intercept('GET', '**/users/admins', mockAdmins);
      cy.intercept('GET', '**/me', mockMe).as('mockMe');
      cy.intercept('GET', /2281\/errand\/\d*/, mockMexErrand_base).as('getErrandById');
      cy.intercept('GET', /\/errand\/\d+\/attachments$/, mockAttachments).as('getErrandAttachments');
      cy.intercept('GET', '**/contract/2024-01026', mockContract).as('getContract');
      cy.intercept('GET', '**/casedatanotifications/2281', mockNotifications).as('getNotifications');
      cy.intercept('GET', '**/sourcerelations/**/**', mockRelations).as('getSourceRelations');
      cy.intercept('GET', '**/targetrelations/**/**', mockRelations).as('getTargetRelations');
      cy.intercept('GET', '**/targetrelations/**/**', mockRelations).as('getRelations');
      cy.intercept('GET', '**/namespace/errands/**/communication/conversations', mockConversations).as(
        'getConversations'
      );
      cy.intercept('GET', '**/errands/**/communication/conversations/*/messages', mockConversationMessages).as(
        'getConversationMessages'
      );
      cy.intercept('GET', '**/metadata/jsonschemas/FTErrandAssets/latest', mockJsonSchema).as('getJsonSchema');
      cy.visit('/registrera');
      cy.get('.sk-cookie-consent-btn-wrapper').contains('Godkänn alla').click();
    });

    it('shows correct buttons and input select fields', () => {
      cy.get('[data-cy="registerErrandHeading"] button').eq(0).contains('Avbryt').should('exist');
      cy.get('[data-cy="registerErrandHeading"] button').eq(1).contains('Registrera').should('exist');
      cy.get('.sk-tabs .sk-tabs-list-item-button').eq(0).contains('Grunduppgifter').should('exist');
      cy.get('[data-cy="channel-input"]').should('exist').should('be.disabled');
      cy.get('[data-cy="municipality-input"]').should('exist');
      cy.get('[data-cy="casetype-input"]').should('exist');
      cy.get('[data-cy="casetype-input"]').should('exist');
      cy.get('[data-cy="priority-input"]').should('exist');
      cy.get('button[data-cy="save-and-continue-button"]').contains('Registrera').should('exist');
    });

    it('Manages select input and register', () => {
      cy.intercept('POST', '**/errands', mockMexErrand_base).as('postErrand');
      cy.get('[data-cy="municipality-input"]').should('be.disabled');

      const legacyKeys = Object.keys(MEXLegacyCaseType);
      Object.entries(MEXCaseLabel)
        .filter(([key, value]) => !legacyKeys.includes(key))
        .forEach(([key, value]) => {
          cy.get('[data-cy="casetype-input"]').select(value);
        });

      cy.get('[data-cy="priority-input"]').select('Hög');
      cy.get('[data-cy="priority-input"]').select('Medel');
      cy.get('[data-cy="priority-input"]').select('Låg');

      cy.get('button[data-cy="save-and-continue-button"]').contains('Registrera').click();
      cy.wait('@postErrand');
      cy.wait('@getErrandById');
      cy.wait('@getErrandAttachments');
      cy.visit(`/arende/2281/${mockMexErrand_base.data.errandNumber}`);
    });

    it('Can cancel the process, going back to overview', () => {
      cy.intercept('GET', '**/errands*', mockErrands_base).as('getErrands');
      cy.get('[data-cy="registerErrandHeading"] button').eq(0).contains('Avbryt').should('exist').click();
      cy.get('@getErrands');
      cy.visit('/oversikt');
    });
  });
});
