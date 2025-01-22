import { onlyOn } from '@cypress/skip-test';
import { mockAdmins } from '../case-data/fixtures/mockAdmins';
import { mockMe } from '../case-data/fixtures/mockMe';
import { mockSupportAdminsResponse } from './fixtures/mockSupportAdmins';
import { mockCategories, mockMetaData } from './fixtures/mockMetadata';
import {
  mockEmptySupportErrand,
  mockFilterAdminErrands,
  mockFilterChannelErrands,
  mockFilterDateErrands,
  mockFilteredCategoryErrands,
  mockFilteredPrioErrands,
  mockOngoingSupportErrands,
  mockSuspendedSupportErrands,
  mockSolvedSupportErrands,
  mockSupportErrands,
  mockSupportErrandsEmpty,
} from './fixtures/mockSupportErrands';
import { mockNotifications } from './fixtures/mockSupportNotifications';
import { mockMetaDataRoles } from '../lop/fixtures/mockMetadata';

onlyOn(Cypress.env('application_name') === 'KC', () => {
  describe('Overview support errand', () => {
    beforeEach(() => {
      cy.intercept('GET', '**/administrators', mockAdmins);
      cy.intercept('GET', '**/me', mockMe);
      cy.intercept('GET', '**/supporterrands/2281?page=0*', mockSupportErrands).as('getErrands');
      cy.intercept('GET', '**/supporterrands/2281?page=1*', mockSupportErrandsEmpty).as('getErrandsEmpty');
      cy.intercept('GET', '**/supportmetadata/2281', mockMetaData).as('getSupportMetadata');
      cy.intercept('GET', '**/supportmetadata/2281/roles', mockMetaDataRoles).as('getSupportMetadataRoles');
      cy.intercept('GET', '**/supportnotifications/2281', mockNotifications).as('getSupportNotifications');
      cy.intercept('GET', '**/users/admins', mockSupportAdminsResponse).as('getSupportAdmins');
      cy.visit('/oversikt/');
      cy.wait('@getErrands');
      cy.get('.sk-cookie-consent-btn-wrapper').contains('Godkänn alla').click();
    });

    it('displays the logged in users name', () => {
      cy.get('[data-cy="userinfo"]').contains('My Testsson').should('exist');
    });

    it('displays the correct number of errands', () => {
      cy.get('[data-cy="main-table"] .sk-table-tbody-tr').should('have.length', mockSupportErrands.content.length);
    });

    it('displays the correct table header', () => {
      const headerRow = cy.get('[data-cy="main-table"] .sk-table-thead-tr').first();
      headerRow.get('th').eq(0).find('span').first().should('have.text', 'Status');
      headerRow.get('th').eq(1).find('span').first().should('have.text', 'Verksamhet');
      headerRow.get('th').eq(2).find('span').first().should('have.text', 'Ärendetyp');
      headerRow.get('th').eq(3).find('span').first().should('have.text', 'Registrerad');
      headerRow.get('th').eq(4).find('span').first().should('have.text', 'Senaste aktivitet');
      headerRow.get('th').eq(5).find('span').first().should('have.text', 'Prioritet');
      headerRow.get('th').eq(6).find('span').first().should('have.text', 'Inkom via');
      headerRow.get('th').eq(7).find('span').first().should('have.text', 'Ansvarig');
    });

    it('displays the filters', () => {
      cy.get('[data-cy="show-filters-button"]').should('exist');
      cy.get('[data-cy="Verksamhet-filter"]').should('exist');
      cy.get('[data-cy="Ärendetyp-filter"]').should('exist');
      cy.get('[data-cy="Prioritet-filter"]').should('exist');
      cy.get('[data-cy="Tidsperiod-filter"]').should('exist');
      cy.get('[data-cy="Handläggare-filter"]').should('exist');
      cy.get('[data-cy="Channel-filter"]').should('exist');
    });

    //FILTER
    it('allows filtering', () => {
      cy.get('[data-cy="show-filters-button"]').click();

      //Verksamhet
      cy.get('[data-cy="Verksamhet-filter"]').type('1');
      cy.get(`[data-cy=Verksamhet-filter-${mockCategories[0].name}]`).should('exist').click();

      cy.intercept('GET', `**/supporterrands/2281?page=0*`, mockFilteredCategoryErrands).as('getFilterCatErrands');

      cy.wait('@getFilterCatErrands');
      cy.get('[data-cy="main-table"] .sk-table-tbody-tr').should(
        'have.length',
        mockFilteredCategoryErrands.content.length
      );

      cy.get('[data-cy="Verksamhet-filter"]').type('1');
      cy.get('[data-cy="Verksamhet-filter"]').siblings('div').get('[aria-label="Rensa verksamhet"]').click();

      cy.intercept('GET', `**/supporterrands/2281?page=0*`, mockSupportErrands).as('unFilterCatErrands');

      cy.wait('@unFilterCatErrands');
      cy.get('[data-cy="main-table"] .sk-table-tbody-tr').should('have.length', mockSupportErrands.content.length);

      //Ärendetyp
      cy.get('[data-cy="Ärendetyp-filter"]').type('2');
      cy.get(`[data-cy=Ärendetyp-filter-${mockCategories[0].types[0].name}]`).should('exist').click();

      cy.intercept('GET', `**/supporterrands/2281?page=0*`, mockFilteredCategoryErrands).as('getFilterTypeErrands');

      cy.wait('@getFilterTypeErrands');
      cy.get('[data-cy="main-table"] .sk-table-tbody-tr').should(
        'have.length',
        mockFilteredCategoryErrands.content.length
      );

      cy.get('[data-cy="Ärendetyp-filter"]').type('2');
      cy.get('[data-cy="Ärendetyp-filter"]').siblings('div').get('[aria-label="Rensa ärendetyp"]').click();
      cy.intercept('GET', `**/supporterrands/2281?page=0*`, mockSupportErrands).as('unFilterTypeErrands');
      cy.wait('@unFilterTypeErrands');
      cy.get('[data-cy="main-table"] .sk-table-tbody-tr').should('have.length', mockSupportErrands.content.length);

      //Prioritet
      cy.get('[data-cy="Prioritet-filter"]').type('3');
      cy.get(`[data-cy=Prioritet-filter-HIGH]`).should('exist').click();

      cy.intercept('GET', `**/supporterrands/2281?page=0*`, mockFilteredPrioErrands).as('getFilterPrioErrands');

      cy.wait('@getFilterPrioErrands');
      cy.get('[data-cy="main-table"] .sk-table-tbody-tr').should('have.length', mockFilteredPrioErrands.content.length);

      cy.get('[data-cy="Prioritet-filter"]').type('3');
      cy.get('[data-cy="Prioritet-filter"]').siblings('div').get('[aria-label="Rensa prioritet"]').click();

      cy.intercept('GET', `**/supporterrands/2281?page=0*`, mockSupportErrands).as('unFilterPrioErrands');
      cy.wait('@unFilterPrioErrands');
      cy.get('[data-cy="main-table"] .sk-table-tbody-tr').should('have.length', mockSupportErrands.content.length);

      //Tidsperiod
      cy.get('[data-cy="Tidsperiod-filter"]').type('4');
      cy.get(`[data-cy="validFrom-input"]`).should('exist').type('2024-05-14');
      cy.get(`[data-cy="validTo-input"]`).should('exist').type('2024-06-14');
      cy.get(`[data-cy="Tidsperiod-button"]`).should('exist').click();

      cy.intercept('GET', `**/supporterrands/2281?page=0*`, mockFilterDateErrands).as('getFilterDateErrands');

      cy.wait('@getFilterDateErrands');
      cy.get('[data-cy="main-table"] .sk-table-tbody-tr').should('have.length', mockFilterDateErrands.content.length);

      cy.get('[data-cy="Tidsperiod-filter"]').siblings('div').get('[aria-label="Rensa Tidsperiod"]').click();

      cy.intercept('GET', `**/supporterrands/2281?page=0*`, mockSupportErrands).as('unFilterDateErrands');
      cy.wait('@unFilterDateErrands');
      cy.get('[data-cy="main-table"] .sk-table-tbody-tr').should('have.length', mockSupportErrands.content.length);

      //Handläggare
      cy.get('[data-cy="Handläggare-filter"]').type('5');
      cy.get(`[data-cy=Handläggare-filter-${mockSupportAdminsResponse.data[1].name}]`).should('exist').click();

      cy.intercept('GET', `**/supporterrands/2281?page=0*`, mockFilterAdminErrands).as('getFilterAdminErrands');

      cy.wait('@getFilterAdminErrands');
      cy.get('[data-cy="main-table"] .sk-table-tbody-tr').should('have.length', mockFilterAdminErrands.content.length);

      cy.get('[data-cy="Handläggare-filter"]').type('5');
      cy.get('[data-cy="Handläggare-filter"]').siblings('div').get('[aria-label="Rensa Handläggare"]').click();

      cy.intercept('GET', `**/supporterrands/2281?page=0*`, mockSupportErrands).as('unFilterAdminErrands');
      cy.wait('@unFilterAdminErrands');
      cy.get('[data-cy="main-table"] .sk-table-tbody-tr').should('have.length', mockSupportErrands.content.length);

      //Channel
      cy.get('[data-cy="Channel-filter"]').type('6');
      cy.get(`[data-cy="Channel-filter-CHAT"]`).should('exist').click();

      cy.intercept('GET', `**/supporterrands/2281?page=0*`, mockFilterChannelErrands).as('getFilterChannelErrands');

      cy.wait('@getFilterChannelErrands');
      cy.get('[data-cy="main-table"] .sk-table-tbody-tr').should(
        'have.length',
        mockFilterChannelErrands.content.length
      );

      cy.get('[data-cy="Channel-filter"]').type('6');
      cy.get('[data-cy="Channel-filter"]').siblings('div').get('[aria-label="Rensa Kanal"]').click();

      cy.intercept('GET', `**/supporterrands/2281?page=0*`, mockSupportErrands).as('unFilterChannelErrands');
      cy.wait('@unFilterChannelErrands');
      cy.get('[data-cy="main-table"] .sk-table-tbody-tr').should('have.length', mockSupportErrands.content.length);
    });

    //SIDEBAR DISPLAY
    it('displays sidebar - user, notifications button and errand statuses', () => {
      cy.get('[data-cy="overview-aside"]').should('exist');
      cy.get('[data-cy="avatar-aside"]').should('exist');
      cy.get('[aria-label="Notifieringar"]').should('exist');
      cy.get(`[aria-label="status-button-${mockMetaData.statuses[0].name}"]`).should('exist');
      cy.get(`[aria-label="status-button-${mockMetaData.statuses[1].name}"]`).should('exist');
      cy.get(`[aria-label="status-button-${mockMetaData.statuses[2].name}"]`).should('exist');
      cy.get(`[aria-label="status-button-${mockMetaData.statuses[3].name}"]`).should('exist');
    });

    //SIDEBAR USE
    it('allows to switch between errand statuses in sidebar', () => {
      cy.get(`[aria-label="status-button-${mockMetaData.statuses[1].name}"]`).click();
      cy.intercept('GET', `**/supporterrands/2281?page=0*`, mockOngoingSupportErrands).as('getOngoingErrands');
      cy.wait('@getOngoingErrands');
      cy.get('[data-cy="main-table"] .sk-table-tbody-tr').should(
        'have.length',
        mockOngoingSupportErrands.content.length
      );

      cy.get(`[aria-label="status-button-${mockMetaData.statuses[2].name}"]`).click();
      cy.intercept('GET', `**/supporterrands/2281?page=0*`, mockSuspendedSupportErrands).as('getSuspendedErrands');
      cy.wait('@getSuspendedErrands');
      cy.get('[data-cy="main-table"] .sk-table-tbody-tr').should(
        'have.length',
        mockSuspendedSupportErrands.content.length
      );

      cy.get(`[aria-label="status-button-${mockMetaData.statuses[3].name}"]`).click();
      cy.intercept('GET', `**/supporterrands/2281?page=0*`, mockSolvedSupportErrands).as('getSolvedErrands');
      cy.wait('@getSolvedErrands');
      cy.get('[data-cy="main-table"] .sk-table-tbody-tr').should(
        'have.length',
        mockSolvedSupportErrands.content.length
      );

      cy.get(`[aria-label="status-button-${mockMetaData.statuses[0].name}"]`).click();
      cy.intercept('GET', `**/supporterrands/2281?page=0*`, mockSupportErrands).as('getNewErrands');
      cy.wait('@getNewErrands');
      cy.get('[data-cy="main-table"] .sk-table-tbody-tr').should('have.length', mockSupportErrands.content.length);
    });

    //SEARCH
    it('displays search and allows to filter table', () => {
      cy.get('[data-cy="query-filter"]').should('exist').type('kctest2');
      cy.intercept('GET', '**/supporterrands/2281?page=0*', mockFilterAdminErrands).as('getQueryErrands');
      cy.wait('@getQueryErrands');
      cy.get('[data-cy="main-table"] .sk-table-tbody-tr').contains('kctest2').should('exist');

      cy.get('[data-cy="query-filter"]').clear().type('search text');
      cy.intercept('GET', '**/supporterrands/2281?page=0*', mockEmptySupportErrand).as('getEmptyErrands');
      cy.wait('@getEmptyErrands');
      cy.get('Caption#errandTableCaption').contains('Det finns inga ärenden').should('exist');

      cy.get('[data-cy="query-filter"]').clear();
      cy.intercept('GET', '**/supporterrands/2281?page=0*', mockSupportErrands).as('getErrands');
      cy.wait('@getEmptyErrands');
      cy.get('[data-cy="main-table"] .sk-table-tbody-tr').should('have.length', mockSupportErrands.content.length);
    });
  });
});
