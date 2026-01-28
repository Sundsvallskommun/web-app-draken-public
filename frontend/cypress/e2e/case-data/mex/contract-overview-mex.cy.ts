/// <reference types="cypress" />

import { onlyOn } from '@cypress/skip-test';
import { mockNotifications } from '../../../../cypress/e2e/kontaktcenter/fixtures/mockSupportNotifications';
import { mockAdmins } from '../fixtures/mockAdmins';
import {
  mockContractsList,
  mockContractsListEmpty,
  mockContractsListFiltered,
} from '../fixtures/mockContractsList';
import { mockErrands_base } from '../fixtures/mockErrands';
import { mockMe } from '../fixtures/mockMe';

onlyOn(Cypress.env('application_name') === 'MEX', () => {
  describe('Contract Overview page', () => {
    beforeEach(() => {
      cy.intercept('GET', '**/users/admins', mockAdmins);
      cy.intercept('GET', '**/me', mockMe);
      cy.intercept('GET', '**/featureflags', []);
      cy.intercept('GET', '**/errands*', mockErrands_base).as('getErrands');
      cy.intercept('GET', '**/casedatanotifications/2281', mockNotifications).as('getNotifications');
      cy.intercept('GET', '**/contracts?*', mockContractsList).as('getContracts');
      cy.visit('/oversikt');
      cy.wait('@getErrands');
      cy.get('.sk-cookie-consent-btn-wrapper').contains('Godkänn alla').click();
    });

    const navigateToContractOverview = () => {
      cy.get('button').contains('Avtalsöversikt').should('exist').click();
      cy.wait('@getContracts');
    };

    it('can navigate to contract overview by clicking Avtalsöversikt button', () => {
      cy.get('button').contains('Avtalsöversikt').should('exist').click();
      cy.wait('@getContracts');
      cy.get('h1').contains('Avtal').should('exist');
    });

    it('displays the contracts table with correct headers', () => {
      navigateToContractOverview();
      cy.get('[data-cy="contracts-table"]').should('exist');

      const expectedHeaders = [
        'Fastighetsbeteckning',
        'Distrikt',
        'Avtals-ID',
        'Avtalstyp',
        'Avtalssubtyp',
        'Parter',
        'Avtalsperiod',
        'Uppsägningsdatum',
      ];

      expectedHeaders.forEach((header) => {
        cy.get('[data-cy="contracts-table"] th').contains(header).should('exist');
      });
    });

    it('displays contract data in the table', () => {
      navigateToContractOverview();
      cy.get('[data-cy="contracts-table"] tbody tr').should(
        'have.length',
        mockContractsList.contracts?.length
      );

      // Check first row data
      cy.get('[data-cy="contracts-table"] tbody tr')
        .first()
        .within(() => {
          cy.contains('TESTKOMMUN TESTFASTIGHET 1:1').should('exist');
          cy.contains('Testdistrikt Norra').should('exist');
          cy.contains('2049-00001').should('exist');
          cy.contains('Arrende').should('exist');
          cy.contains('Tomträtt').should('exist');
          cy.contains('Test Kommun AB').should('exist');
          cy.contains('Testföretag AB').should('exist');
          cy.contains('2024-01-01').should('exist');
          cy.contains('2025-12-31').should('exist');
        });
    });

    it('displays the filter bar', () => {
      navigateToContractOverview();
      cy.get('[data-cy="contract-query-filter"]').should('exist');
      cy.get('[data-cy="show-filters-button"]').should('exist');
      cy.get('[data-cy="contract-type-filter"]').should('exist');
      cy.get('[data-cy="contract-lease-type-filter"]').should('exist');
      cy.get('[data-cy="contract-dates-filter"]').should('exist');
      cy.get('[data-cy="contract-status-filter"]').should('exist');
    });

    it('can toggle filter visibility', () => {
      navigateToContractOverview();
      // Filters should be visible by default
      cy.get('[data-cy="contract-type-filter"]').should('be.visible');

      // Click to hide filters
      cy.get('[data-cy="show-filters-button"]').click();
      cy.get('[data-cy="contract-type-filter"]').should('not.be.visible');

      // Click to show filters again
      cy.get('[data-cy="show-filters-button"]').click();
      cy.get('[data-cy="contract-type-filter"]').should('be.visible');
    });

    it('can use the search field', () => {
      navigateToContractOverview();
      cy.get('[data-cy="contract-query-filter"]').should('exist').type('BALDER');
      cy.intercept('GET', '**/contracts?*', mockContractsListFiltered).as('getFilteredContracts');
      cy.get('[data-cy="contract-query-filter"]').parent().find('button').contains('Sök').click();
      cy.wait('@getFilteredContracts');
      cy.get('[data-cy="contracts-table"] tbody tr').should(
        'have.length',
        mockContractsListFiltered.contracts?.length
      );
    });

    it('can filter by contract type', () => {
      navigateToContractOverview();
      cy.get('[data-cy="contract-type-filter"]').click();
      cy.intercept('GET', '**/contracts?*', mockContractsListFiltered).as('getFilteredContracts');
      cy.get('[data-cy="contract-type-filter-LEASE_AGREEMENT"]').click({ force: true });
      cy.wait('@getFilteredContracts');
    });

    it('can filter by lease type (subtype)', () => {
      navigateToContractOverview();
      cy.get('[data-cy="contract-lease-type-filter"]').click();
      cy.intercept('GET', '**/contracts?*', mockContractsListFiltered).as('getFilteredContracts');
      cy.get('[data-cy="contract-lease-type-filter-LEASEHOLD"]').click({ force: true });
      cy.wait('@getFilteredContracts');
    });

    it('can filter by status', () => {
      navigateToContractOverview();
      cy.get('[data-cy="contract-status-filter"]').click();
      cy.intercept('GET', '**/contracts?*', mockContractsListFiltered).as('getFilteredContracts');
      cy.get('[data-cy="contract-status-filter-ACTIVE"]').click({ force: true });
      cy.wait('@getFilteredContracts');
    });

    it('can filter by date period', () => {
      navigateToContractOverview();
      cy.get('[data-cy="contract-dates-filter"]').click();
      cy.get('[data-cy="contract-filter-startdate"]').should('exist').type('2024-01-01');
      cy.get('[data-cy="contract-filter-enddate"]').should('exist').type('2024-12-31');
      cy.intercept('GET', '**/contracts?*', mockContractsListFiltered).as('getFilteredContracts');
      cy.get('[data-cy="contract-dates-apply"]').click();
      cy.wait('@getFilteredContracts');
    });

    it('displays empty state when no contracts found', () => {
      // Override the default intercept before navigating
      cy.intercept('GET', '**/contracts?*', mockContractsListEmpty).as('getContracts');
      cy.get('button').contains('Avtalsöversikt').should('exist').click();
      cy.wait('@getContracts');
      cy.contains('Inga avtal hittades').should('exist');
    });

    it('displays pagination controls', () => {
      navigateToContractOverview();
      // Pagination controls are in the table footer area
      cy.contains('Sida:').should('exist');
      cy.contains('Rader per sida:').should('exist');
      cy.contains('Radhöjd:').should('exist');
      cy.get('input#pageSize').should('exist');
      cy.get('select#rowHeight').should('exist');
    });

    it('can change rows per page', () => {
      navigateToContractOverview();
      cy.get('input#pageSize').should('exist').clear().type('24');
      cy.intercept('GET', '**/contracts?*limit=24*', mockContractsList).as('getContractsNewLimit');
      cy.wait('@getContractsNewLimit');
    });

    it('can change row height', () => {
      navigateToContractOverview();
      cy.get('select#rowHeight').should('exist').select('Tät');
      // The dense prop adds a data-dense attribute
      cy.get('[data-cy="contracts-table"]').should('have.attr', 'data-dense', 'dense');
    });

    it('displays parties on separate lines', () => {
      navigateToContractOverview();
      // Check that parties are displayed on separate lines (in separate divs)
      // Parties column is index 5 (0: propertyNames, 1: districts, 2: contractId, 3: type, 4: leaseType, 5: parties)
      cy.get('[data-cy="contracts-table"] tbody tr')
        .first()
        .within(() => {
          cy.get('td').eq(5).find('div > div').should('have.length', 2);
          cy.get('td').eq(5).find('div > div').first().should('contain.text', 'Test Kommun AB');
          cy.get('td').eq(5).find('div > div').last().should('contain.text', 'Testföretag AB');
        });
    });

    it('displays contract period dates on separate lines', () => {
      navigateToContractOverview();
      // Check that dates are displayed on separate lines (in separate divs)
      // Avtalsperiod column is index 6
      cy.get('[data-cy="contracts-table"] tbody tr')
        .first()
        .within(() => {
          cy.get('td').eq(6).find('div > div').should('have.length', 2);
          cy.get('td').eq(6).find('div > div').first().should('contain.text', '2024-01-01');
          cy.get('td').eq(6).find('div > div').last().should('contain.text', '2025-12-31');
        });
    });

    it('can sort by clicking sortable column headers', () => {
      navigateToContractOverview();
      // Click on Avtalstyp header to sort
      cy.intercept('GET', '**/contracts?*', mockContractsList).as('getSortedContracts');
      cy.get('[data-cy="contracts-table"] th').contains('Avtalstyp').click();
      cy.wait('@getSortedContracts');
    });
  });
});
