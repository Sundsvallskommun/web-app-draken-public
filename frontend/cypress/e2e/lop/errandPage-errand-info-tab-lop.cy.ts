/// <reference types="cypress" />

import { onlyOn } from '@cypress/skip-test';
import { mockAdmins } from '../case-data/fixtures/mockAdmins';
import { mockMe } from '../case-data/fixtures/mockMe';
import { mockAdressResponse, mockPersonIdResponse } from './fixtures/mockAdressResponse';
import { mockMetaData } from './fixtures/mockMetadata';
import { mockSupportAdminsResponse } from './fixtures/mockSupportAdmins';
import {
  mockEmptySupportErrand,
  mockFacilitiesData,
  mockSaveFacilities,
  mockSupportAttachments,
  mockSupportErrand,
  mockSupportMessages,
  mockSupportNotes,
} from './fixtures/mockSupportErrands';
import { SupportStakeholderFormModel } from '@supportmanagement/services/support-errand-service';
import cypress from 'cypress';
import { mockAddress } from '../case-data/fixtures/mockAddress';
import { mockOrganizationResponse } from './fixtures/mockOrganizationResponse';

//NOT YET IMPLEMENTED IN FE
onlyOn(Cypress.env('application_name') === 'LOP', () => {
  describe('Errand page', () => {
    beforeEach(() => {
      cy.intercept('GET', '**/administrators', mockAdmins);
      cy.intercept('GET', '**/users/admins', mockSupportAdminsResponse).as('getSupportAdmins');
      cy.intercept('GET', '**/me', mockMe).as('getMe');
      cy.intercept('GET', '**/featureflags', []);
      cy.intercept('GET', '**/supporterrands/2281/3f0e57b2-2876-4cb8-aa71-537b5805be27', mockSupportErrand).as(
        'getErrand'
      );
      cy.intercept('GET', '**/supportattachments/2281/errands/*/attachments', mockSupportAttachments).as(
        'getAttachments'
      );
      cy.intercept('GET', '**/supportmessage/2281/errands/*/communication', mockSupportMessages).as('getMessages');
      cy.intercept('GET', '**/supportnotes/2281/*', mockSupportNotes).as('getNotes');
      cy.intercept('GET', '**/supportmetadata/2281', mockMetaData).as('getSupportMetadata');
      cy.intercept('POST', `**/personid`, mockPersonIdResponse).as('getPersonId');
      cy.intercept('POST', `**/address`, mockAdressResponse).as('getAddress');
      cy.intercept('POST', `**/organization`, mockOrganizationResponse).as('getOrganization');
      cy.intercept('PATCH', `**/supporterrands/2281/${mockEmptySupportErrand.id}`, mockEmptySupportErrand).as(
        'updateErrand'
      );
      cy.intercept('GET', '**/estateByPropertyDesignation/*', mockFacilitiesData).as('getFacilityByDesignation');
      cy.intercept('PATCH', '**/saveFacilities/2281/c9a96dcb-24b1-479b-84cb-2cc0260bb490', mockSaveFacilities).as(
        'saveFacilityInfo'
      );
    });
  });
});
