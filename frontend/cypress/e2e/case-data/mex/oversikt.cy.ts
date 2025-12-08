/// <reference types="cypress" />
// import { ErrandStatus } from '@casedata/interfaces/errand-status';
import { ErrandStatus } from '../../../../src/casedata/interfaces/errand-status';
// import { appConfig } from '@config/appconfig';
import { appConfig } from '../../../../src/config/appconfig';
import { onlyOn } from '@cypress/skip-test';
import { mockNotifications } from '../../../../cypress/e2e/kontaktcenter/fixtures/mockSupportNotifications';
import { mockAdmins } from '../fixtures/mockAdmins';
import { emptyMockErrands, mockErrands_base, mockFilterErrandsByProperty } from '../fixtures/mockErrands';
import { mockMe } from '../fixtures/mockMe';
import { CaseLabels } from '../../../../src/casedata/interfaces/case-label';
import { mockContractAttachment, mockLeaseAgreement } from '../fixtures/mockContract';

onlyOn(Cypress.env('application_name') === 'MEX', () => {
  describe('Overview page', () => {
    beforeEach(() => {
      cy.intercept('GET', '**/users/admins', mockAdmins);
      cy.intercept('GET', '**/me', mockMe);
      cy.intercept('GET', '**/errands*', mockErrands_base).as('getErrands');
      cy.intercept('GET', '**/casedatanotifications/2281', mockNotifications).as('getNotifications');
      cy.intercept('GET', '**/contracts/2024-01026', mockLeaseAgreement).as('getContract');
      cy.intercept('GET', '**/contracts/2281/2024-01026/attachments/1', mockContractAttachment).as(
        'getContractAttachment'
      );
      cy.visit('/oversikt');
      cy.wait('@getErrands');
      cy.get('.sk-cookie-consent-btn-wrapper').contains('Godkänn alla').click();
    });

    it('displays the logged in users initials', () => {
      const initials = 'MT';
      cy.get('[data-cy=avatar-aside]').contains(initials).should('exist');
    });

    it('displays table data', () => {
      cy.get('[data-cy="main-casedata-table"] .sk-table-tbody-tr').should(
        'have.length',
        mockErrands_base.data.content.length
      );
    });

    it('displays the correct table header', () => {
      const headerRow = cy.get('[data-cy="main-casedata-table"] .sk-table-thead-tr').first();
      headerRow.get('th').eq(0).find('span').first().should('have.text', 'Fast.bet');
      headerRow.get('th').eq(1).find('span').first().should('have.text', 'Senaste aktivitet');
      headerRow.get('th').eq(2).find('span').first().should('have.text', 'Ärendetyp');
      headerRow.get('th').eq(3).find('span').first().should('have.text', 'Ärendemening');
      headerRow.get('th').eq(4).find('span').first().should('have.text', 'Prio');
      headerRow.get('th').eq(5).find('span').first().should('have.text', 'Registrerat');
      headerRow.get('th').eq(6).find('span').first().should('have.text', 'Handläggare');
      headerRow.get('th').eq(7).find('span').first().should('have.text', 'Status');
    });

    it('displays the filters', () => {
      cy.get('[data-cy="Show-filters-button"]').should('exist');
      cy.get('[data-cy="Fastighetsbeteckning-filter"]').should('exist');
      cy.get('[data-cy="Ärendetyp-filter"]').should('exist');
      cy.get('[data-cy="Prioritet-filter"]').should('exist');
      cy.get('[data-cy="Tidsperiod-filter"]').should('exist');
      cy.get('[data-cy="Tidsperiod-filter"]').click();
      cy.get('[data-cy="casedata-validFrom-input"]').should('exist');
      cy.get('[data-cy="casedata-validTo-input"]').should('exist');
      cy.get('[data-cy="Handläggare-filter"]').should('exist');
    });

    it('allows filtering by a property designation', () => {
      const query = 'BALDER 1';
      cy.get('[data-cy="Show-filters-button"]').should('exist');
      cy.get('[data-cy="Fastighetsbeteckning-filter"]').click();
      cy.get('[data-cy="Fastighetsbeteckning-input"]').should('exist').type(query);
      cy.get('[data-cy="Fastighetsbeteckning-input"]').siblings('button').should('have.text', 'Lägg till').click();
      cy.intercept('GET', '**/errands?*', mockFilterErrandsByProperty).as('getErrandsByProperty');
      cy.wait('@getErrandsByProperty');
      cy.get('[data-cy="main-casedata-table"] .sk-table-tbody-tr').should(
        'have.length',
        mockFilterErrandsByProperty.data.content.length
      );

      cy.get(`[data-cy="tag-property-${query}"]`).should('exist').click();
      cy.intercept('GET', '**/errands?*', mockErrands_base).as('getBaseErrands');
      cy.wait('@getBaseErrands');
      cy.get('[data-cy="main-casedata-table"] .sk-table-tbody-tr').should(
        'have.length',
        mockErrands_base.data.content.length
      );
    });

    it('allows filtering by a single caseType', () => {
      cy.get('[data-cy="Show-filters-button"]').should('exist');
      const entries = Object.entries(CaseLabels.MEX);
      cy.get('[data-cy="Ärendetyp-filter"]').click();
      cy.intercept('GET', '**/errands*').as(`${entries[0][0]}-filterSearch`);
      cy.get(`[data-cy="Ärendetyp-filter-${entries[0][0]}"]`).click({ force: true });
      cy.wait(`@${entries[0][0]}-filterSearch`).should(({ request, response }) => {
        expect([200, 304]).to.include(response && response.statusCode);
      });
      cy.get('[data-cy="Ärendetyp-filter"]').click();
      cy.get('[data-cy="tag-caseType"]').should('exist').click();
    });

    it('allows filtering by multiple caseTypes', () => {
      const entries = Object.entries(CaseLabels.MEX);
      const selected = [];
      cy.get('[data-cy="Show-filters-button"]').should('exist');
      cy.get(`[data-cy="Ärendetyp-filter"]`).click();
      entries.forEach((entry, idx, ary) => {
        cy.intercept('GET', '**/errands*').as(`multiple-filterSearch-${idx}`);
        cy.get(`[data-cy="Ärendetyp-filter-${entry[0]}"]`).click({ force: true });
        cy.wait(`@multiple-filterSearch-${idx}`).should(({ request, response }) => {
          selected.push(entry[0]);
          expect([200, 304]).to.include(response && response.statusCode);
        });
      });
      cy.get('[data-cy="Ärendetyp-filter"]').click();
      cy.get('[data-cy="tag-clearAll"]').should('exist').contains('Rensa alla').click();
    });

    it('allows filtering by priority', () => {
      cy.get('[data-cy="Show-filters-button"]').should('exist');
      const labels = ['HIGH', 'MEDIUM', 'LOW'];
      cy.get('[data-cy="Prioritet-filter"]').click();
      cy.intercept('GET', '**/errands*').as(`${labels[0]}-filterSearch`);
      cy.get(`[data-cy="Prioritet-filter-${labels[0]}"]`).click();
      cy.wait(`@${labels[0]}-filterSearch`).should(({ request, response }) => {
        expect([200, 304]).to.include(response && response.statusCode);
      });
      cy.get('[data-cy="Prioritet-filter"]').click();
      cy.get('[data-cy="tag-prio"]').click();
    });

    it('allows filtering by date', () => {
      cy.get('[data-cy="Show-filters-button"]').should('exist');
      cy.get('[data-cy="Tidsperiod-filter"]').click();
      cy.get(`[data-cy="casedata-validFrom-input"]`).should('exist').type('2024-05-22');
      cy.get(`[data-cy="casedata-validTo-input"]`).should('exist').type('2024-05-27');
      cy.get(`[data-cy="casedata-validTo-input"]`).siblings('button').should('have.text', 'Visa tidsperiod').click();
      cy.intercept('GET', '**/errands*').as(`date-filterSearch`);
      cy.wait(`@date-filterSearch`).should(({ request, response }) => {
        expect([200, 304]).to.include(response && response.statusCode);
      });
      cy.get('[data-cy="Tidsperiod-filter"]').click();
      cy.get(`[data-cy="tag-date"]`).should('exist').click();
    });

    it('allows filtering by administrator', () => {
      cy.get('[data-cy="Show-filters-button"]').should('exist');
      mockAdmins.data.forEach((a) => {
        cy.get('[data-cy="Handläggare-filter"]').click();
        cy.get(`[data-cy="admin-${a.guid}"]`).should('exist').click();
        cy.intercept('GET', '**/errands*').as(`admin-filterSearch-${a.guid}`);
        cy.wait(`@admin-filterSearch-${a.guid}`).should(({ request, response }) => {
          expect([200, 304]).to.include(response && response.statusCode);
        });

        cy.get('[data-cy="Handläggare-filter"]').click();
        cy.get(`[data-cy="tag-admin"]`).should('exist').click();
      });
    });

    it('allows filtering by single status', () => {
      const labels = Object.entries(ErrandStatus);
      cy.get('button').contains('Öppna ärenden').click();
      cy.get('[data-cy="Show-filters-button"]').should('exist');
      cy.get('[data-cy="Status-filter"]').click();
      cy.get(`[data-cy="Status-filter-${labels[1][0]}"]`).should('exist').click();
      cy.intercept('GET', '**/errands*').as(`${labels[1][0]}-filterSearch`);
      cy.wait(`@${labels[1][0]}-filterSearch`).should(({ request, response }) => {
        expect([200, 304]).to.include(response && response.statusCode);
      });
      cy.get('[data-cy="Status-filter"]').click();
      cy.get(`[data-cy="tag-status-${labels[2][0]}"]`).should('exist').contains(labels[2][1]).click();
    });

    it('allows filtering by multiple statuses', () => {
      const labels = Object.entries(ErrandStatus);
      cy.get('button').contains('Öppna ärenden').click();
      cy.get('[data-cy="Show-filters-button"]').should('exist');
      cy.get('[data-cy="Status-filter"]').click();
      labels.forEach((label) => {
        if (
          label[0] !== 'ArendeAvslutat' &&
          label[0] !== 'ArendeInkommit' &&
          label[0] !== 'Tilldelat' &&
          label[0] !== 'BeslutOverklagat'
        ) {
          cy.get(`[data-cy="Status-filter-${label[0]}"]`).should('exist').click();
          cy.intercept('GET', '**/errands*').as(`${label[0]}-filterSearch`);
          cy.wait(`@${label[0]}-filterSearch`).should(({ request, response }) => {
            expect([200, 304]).to.include(response && response.statusCode);
          });
        }
      });
      cy.get('[data-cy="Status-filter"]').click();
    });

    it('allows filtering by stakeholder type', () => {
      cy.get('[data-cy="Show-filters-button"]').should('exist');
      const labels = ['PERSON', 'ORGANIZATION'];
      cy.get('[data-cy="StakeholderType-filter"]').click();
      cy.intercept('GET', '**/errands*').as(`${labels[0]}-filterSearch`);
      cy.get(`[data-cy="StakeholderType-filter-${labels[0]}"]`).click();
      cy.wait(`@${labels[0]}-filterSearch`).should(({ request, response }) => {
        expect([200, 304]).to.include(response && response.statusCode);
      });
      cy.get('[data-cy="StakeholderType-filter"]').click();
      cy.get(`[data-cy="tag-stakeholdertype-${labels[0]}"]`).click();
    });

    it('allows filtering only my errands', () => {
      cy.intercept('GET', '**/errands*').as(`myErrands-filterSearch`);
      cy.get('[data-cy="myErrands-filter"]').should('exist').check({ force: true });
      cy.wait(`@myErrands-filterSearch`).should(({ request, response }) => {
        expect([200, 304]).to.include(response && response.statusCode);
      });
      cy.get('[data-cy="myErrands-filter"]').should('exist').uncheck({ force: true });
    });

    it('Can use searchfield', () => {
      cy.get('[data-cy="query-filter"]').should('exist').type('Text goes here');
      cy.intercept('GET', '**/errands*', emptyMockErrands).as(`emptyQuery-filterSearch`);
      cy.wait(`@emptyQuery-filterSearch`);
      cy.get('Caption#errandTableCaption').contains('Det finns inga ärenden').should('exist');

      cy.get('[data-cy="query-filter"]').should('exist').clear().type('balder');
      cy.intercept('GET', '**/errands*', mockErrands_base).as(`listedQuery-filterSearch`);
      cy.wait(`@listedQuery-filterSearch`);
      cy.get('[data-cy="main-casedata-table"] .sk-table-tbody-tr').should(
        'have.length',
        mockErrands_base.data.content.length
      );
    });

    it('Can use export', () => {
      if (appConfig.features.useErrandExport) {
        cy.get('[data-cy="export-button"]').should('exist').click();
        cy.get('p').should('exist').contains('Det finns ärenden som inte är avslutade. Vill du ändå exportera listan?');
      } else {
        cy.get('[data-cy="export-button"]').should('exist');
      }
    });
  });
});
