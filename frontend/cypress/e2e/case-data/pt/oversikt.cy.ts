/// <reference types="cypress" />
import { onlyOn } from '@cypress/skip-test';
import { mockErrand_base } from 'cypress/e2e/case-data/fixtures/mockErrand';
import { mockPersonId } from 'cypress/e2e/case-data/fixtures/mockPersonId';
import { mockAdmins } from '../fixtures/mockAdmins';
import { mockErrands_base } from '../fixtures/mockErrands';
import { mockMe } from '../fixtures/mockMe';
import { mockMessages } from '../fixtures/mockMessages';
import { mockPermits } from '../fixtures/mockPermits';
import { mockNotifications } from 'cypress/e2e/kontaktcenter/fixtures/mockSupportNotifications';

onlyOn(Cypress.env('application_name') === 'PT', () => {
  describe('Overview page', () => {
    beforeEach(() => {
      cy.intercept('POST', '**/messages', mockMessages);
      cy.intercept('GET', '**/users/admins', mockAdmins);
      cy.intercept('GET', '**/me', mockMe);
      cy.intercept('GET', '**/featureflags', []);
      cy.intercept('GET', '**/parking-permits/', mockPermits);
      cy.intercept('GET', '**/parking-permits/?personId=aaaaaaa-bbbb-aaaa-bbbb-aaaabbbbcccc', mockPermits);
      cy.intercept('POST', '**/personid*', mockPersonId).as('personIdSearch');
      cy.intercept('GET', '**/errands*', mockErrands_base).as('getErrands');
      cy.intercept('GET', /\/errand\/\d*/, mockErrand_base).as('getErrandById');
      cy.intercept('GET', '**/casedatanotifications', mockNotifications).as('getSupportNotifications');
      cy.visit('/oversikt');
      cy.wait('@getErrands');
      cy.get('.sk-cookie-consent-btn-wrapper').contains('Godkänn alla').click();
    });

    it('displays the correct table header for PT', () => {
      const headerRow = cy.get('[data-cy="main-casedata-table"] .sk-table-thead-tr').first();
      headerRow.get('th').eq(0).find('span').first().should('have.text', 'Status');
      headerRow.get('th').eq(1).find('span').first().should('have.text', 'Senaste aktivitet');
      headerRow.get('th').eq(2).find('span').first().should('have.text', 'Ärendetyp');
      headerRow.get('th').eq(3).find('span').first().should('have.text', 'Ärendenummer');
      headerRow.get('th').eq(4).find('span').first().should('have.text', 'Prioritet');
      headerRow.get('th').eq(5).find('span').first().should('have.text', 'Ärendeägare');
      headerRow.get('th').eq(6).find('span').first().should('have.text', 'Registrerat');
      headerRow.get('th').eq(7).find('span').first().should('have.text', 'Handläggare');
    });

    it('displays PT-specific filters including Phase filter', () => {
      cy.get('[aria-label="status-button-Under granskning"]').click();
      cy.get('[data-cy="Show-filters-button"]').should('exist');
      cy.get('[data-cy="Status-filter"]').should('exist');
      cy.get('[data-cy="Ärendetyp-filter"]').should('exist');
      cy.get('[data-cy="Prioritet-filter"]').should('exist');
      cy.get('[data-cy="Tidsperiod-filter"]').should('exist');
      cy.get('[data-cy="Tidsperiod-filter"]').click();
      cy.get('[data-cy="casedata-validFrom-input"]').should('exist');
      cy.get('[data-cy="casedata-validTo-input"]').should('exist');
      cy.get('[data-cy="Handläggare-filter"]').should('exist');
      cy.get('[data-cy="Phase-filter"]').should('exist');
    });
  });
});
