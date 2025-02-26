/// <reference types="cypress" />
import { onlyOn } from '@cypress/skip-test';
import { mockAdmins } from '../case-data/fixtures/mockAdmins';
import { mockMe } from '../case-data/fixtures/mockMe';
import { mockAdressResponse, mockPersonIdResponse } from './fixtures/mockAdressResponse';
import { mockCategories, mockMetaData } from './fixtures/mockMetadata';
import { mockSupportAdminsResponse } from './fixtures/mockSupportAdmins';
import {
  mockEmptySupportErrand,
  mockSupportAttachments,
  mockSupportErrand,
  mockSupportErrands,
  mockSupportErrandsEmpty,
  mockSupportMessages,
  mockSupportNotes,
} from './fixtures/mockSupportErrands';

onlyOn(Cypress.env('application_name') === 'KC', () => {
  describe('register page', () => {
    beforeEach(() => {
      cy.intercept('GET', '**/administrators', mockAdmins);
      cy.intercept('GET', '**/me', mockMe);
      cy.intercept('POST', '**/newerrand/2281', mockEmptySupportErrand).as('initiateErrand');
      cy.intercept('PATCH', `**/supporterrands/2281/${mockEmptySupportErrand.id}`, mockEmptySupportErrand).as(
        'updateErrand'
      );

      cy.intercept('GET', '**/supportattachments/2281/errands/*/attachments', mockSupportAttachments).as(
        'getAttachments'
      );
      cy.intercept('GET', '**/supportmessage/2281/errands/*/communication', mockSupportMessages).as('getMessages');
      cy.intercept('GET', '**/supportnotes/2281/*', mockSupportNotes).as('getNotes');
      cy.intercept('POST', `**/personid`, mockPersonIdResponse).as('getPersonId');
      cy.intercept('POST', `**/address`, mockAdressResponse).as('getAddress');

      cy.intercept('GET', '**/supporterrands/2281?page=0*', mockSupportErrands).as('getErrands');
      cy.intercept('GET', '**/supporterrands/2281?page=1*', mockSupportErrandsEmpty).as('getErrandsEmpty');
      cy.intercept('GET', '**/supportmetadata/2281', mockMetaData).as('getSupportMetadata');
      cy.intercept('GET', '**/users/admins', mockSupportAdminsResponse);
      cy.visit('/registrera');
      cy.get('.sk-cookie-consent-btn-wrapper button').contains('Godkänn alla').click();
    });

    it('displays the support errand part of the register form', () => {
      cy.get('[data-cy="category-input"]').should('exist');
      cy.get('[data-cy="type-input"]').should('exist');
      cy.get('[data-cy="contactReason-input"]').should('exist');
      cy.get('[data-cy="channel-input"]').should('exist');
      cy.get('[data-cy="description-input"]').should('exist');
      cy.get('[data-cy="show-contactReasonDescription-input"]').should('exist').check({ force: true });
      cy.get('[data-cy="contactReasonDescription-input"]').should('exist');
    });

    it('displays the admin part of the register form', () => {
      cy.get('[data-cy="admin-input"]').should('exist');
      cy.get('[data-cy="status-input"]').should('exist');
    });

    it('sends the correct data for new errand', () => {
      const patchFacility = {
        id: 123,
      };
      cy.intercept('GET', `**/supporterrands/2281/${mockEmptySupportErrand.id}`, mockSupportErrand).as('getErrand');
      cy.intercept(
        'PATCH',
        '**/supporterrands/saveFacilities/2281/c9a96dcb-24b1-479b-84cb-2cc0260bb490',
        patchFacility
      ).as('patchfacilities');
      const cat = mockCategories[0];
      const typ = cat.types[0];
      cy.get('[data-cy="category-input"]').select(cat.displayName);
      cy.get('[data-cy="type-input"]').select(typ.displayName);
      cy.get('[data-cy="description-input"]').type('Mock description');
      cy.get('[data-cy="save-and-continue-button"]').click();
      cy.wait(`@initiateErrand`).should(({ request, response }) => {
        expect(request.body).to.deep.equal({
          businessRelated: false,
          classification: {
            category: cat.name,
            type: typ.name,
          },
          labels: [],
          channel: 'PHONE',
          priority: 'MEDIUM',
          resolution: 'INFORMED',
          description: 'Mock description',
          status: 'NEW',
          title: 'Empty errand',
        });
        expect([200, 304]).to.include(response && response.statusCode);
      });
    });

    it('sends the correct data for new errand. after changes', () => {
      const patchFacility = {
        id: 123,
      };
      cy.intercept('GET', `**/supporterrands/2281/${mockEmptySupportErrand.id}`, mockSupportErrand).as('getErrand');
      cy.intercept(
        'PATCH',
        '**/supporterrands/saveFacilities/2281/c9a96dcb-24b1-479b-84cb-2cc0260bb490',
        patchFacility
      ).as('patchfacilities');
      const cat = mockCategories[2];
      const typ = cat.types[2];
      cy.get('[data-cy="category-input"]').select(cat.displayName);
      cy.get('[data-cy="type-input"]').select(typ.displayName);
      cy.get('[data-cy="description-input"]').type('Mock description');
      cy.get('[data-cy="contactReason-input"]').select('E-tjänst saknas');
      cy.get('[data-cy="show-contactReasonDescription-input"]').should('exist').check({ force: true });
      cy.get('[data-cy="contactReasonDescription-input"]').should('exist').type('Mock contact reason description');
      cy.get('[data-cy="save-and-continue-button"]').click();
      cy.wait(`@initiateErrand`).should(({ request, response }) => {
        expect(request.body).to.deep.equal({
          businessRelated: false,
          classification: {
            category: cat.name,
            type: typ.name,
          },
          contactReason: 'E-tjänst saknas',
          contactReasonDescription: 'Mock contact reason description',
          labels: [],
          channel: 'PHONE',
          priority: 'MEDIUM',
          resolution: 'INFORMED',
          description: 'Mock description',
          status: 'NEW',
          title: 'Empty errand',
        });
        expect([200, 304]).to.include(response && response.statusCode);
      });
    });
  });
});
