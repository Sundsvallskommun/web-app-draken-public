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
import { mockEmployee } from './fixtures/mockEmployee';

onlyOn(Cypress.env('application_name') === 'LOP', () => {
  describe('Errand page', () => {
    beforeEach(() => {
      cy.intercept('GET', '**/administrators', mockAdmins);
      cy.intercept('GET', '**/users/admins', mockSupportAdminsResponse).as('getSupportAdmins');
      cy.intercept('GET', '**/me', mockMe).as('getMe');
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
      cy.intercept('GET', `**/portalpersondata/PERSONAL/mockusername`, mockEmployee).as('getEmployee');
      cy.intercept('POST', `**/organization`, mockOrganizationResponse).as('getOrganization');
      cy.intercept('PATCH', `**/supporterrands/2281/${mockEmptySupportErrand.id}`, mockEmptySupportErrand).as(
        'updateErrand'
      );
      cy.intercept('GET', '**/estateByPropertyDesignation/*', mockFacilitiesData).as('getFacilityByDesignation');
      cy.intercept('PATCH', '**/saveFacilities/2281/c9a96dcb-24b1-479b-84cb-2cc0260bb490', mockSaveFacilities).as(
        'saveFacilityInfo'
      );
    });

    it('shows the correct base errand information', () => {
      cy.visit('/arende/2281/3f0e57b2-2876-4cb8-aa71-537b5805be27');
      cy.wait('@getErrand');
      cy.get('.sk-cookie-consent-btn-wrapper').contains('Godkänn alla').click();
      cy.get('[data-cy="labelCategory-input"]').children().contains('Administration').should('exist');
      cy.get('[data-cy="labelType-input"][placeholder="Behörighet"]').should('exist');
      // cy.get('[data-cy="labelType-input"][placeholder]').children().contains('Behörighet').should('exist');
      cy.get('[data-cy="description-input"]').contains('En ärendebeskrivning').should('exist');
      cy.get('[data-cy="channel-input"]').contains('Fysiskt möte').should('exist');
      cy.get('[data-cy="save-button"]').contains('Spara').should('exist');
    });

    it('allows updating errand information', () => {
      cy.visit('/arende/2281/3f0e57b2-2876-4cb8-aa71-537b5805be27');
      cy.wait('@getErrand');
      cy.get('.sk-cookie-consent-btn-wrapper').contains('Godkänn alla').click();

      // Change changeable values
      cy.get('[data-cy="labelCategory-input"]').select('Elnät/Servanet');
      cy.get('[data-cy="description-input"]').clear().type('En ändrad beskrivning');
      cy.get('[data-cy="channel-input"]').select('Chatt');

      // Check changed values
      cy.get('[data-cy="labelCategory-input"]').contains('Elnät/Servanet').should('exist');
      cy.get('[data-cy="labelType-error"]').children().contains('Välj ärendetyp').should('exist');
      cy.get('[data-cy="description-input"]').contains('En ändrad beskrivning').should('exist');
      cy.get('[data-cy="channel-input"]').contains('Chatt').should('exist');
      cy.get('[data-cy="save-button"]').contains('Spara').should('be.disabled');

      // Select missing value
      cy.get('[data-cy="labelType-wrapper"]').click();
      cy.get('[data-cy="labelType-wrapper"]').children().contains('Nyanställning').click();
      cy.get('[data-cy="save-button"]').contains('Spara').should('be.enabled');

      // Post form
      cy.intercept('PATCH', `**/supporterrands/2281/${mockSupportErrand.id}`, mockSupportErrand).as('patchErrand');
      cy.intercept('GET', `**/supporterrands/2281/${mockSupportErrand.id}`, {
        ...mockSupportErrand,
        id: 'c9a96dcb-24b1-479b-84cb-2cc0260bb490',
        stakeholders: [],
        contact: [],
        customer: [],
      }).as('getErrandWithoutStakeholders');
      cy.get('[data-cy="save-button"]').contains('Spara').click();
      cy.wait('@patchErrand').should(({ request, response }) => {
        expect(request.body.channel).to.equal('CHAT');
        expect(request.body.classification.category).to.equal('ELECTRICITY_SERVANET');
        expect(request.body.classification.type).to.equal('ELECTRICITY_SERVANET.EMPLOYMENT');
        expect(request.body.labels).to.include('ELECTRICITY_SERVANET');
        expect(request.body.labels).to.include('ELECTRICITY_SERVANET.EMPLOYMENT');
        expect(request.body.labels).to.include('ELECTRICITY_SERVANET.EMPLOYMENT.NEW_EMPLOYMENT');
        expect(request.body.description).to.equal('En ändrad beskrivning');
        expect([200, 304]).to.include(response && response.statusCode);
      });
    });

    it('validates the person number and organization number fields', () => {
      cy.intercept('GET', `**/supporterrands/2281/c9a96dcb-24b1-479b-84cb-2cc0260bb490`, {
        ...mockSupportErrand,
        id: 'c9a96dcb-24b1-479b-84cb-2cc0260bb490',
        stakeholders: [],
        contact: [],
        customer: [],
      }).as('getErrandWithoutStakeholders');
      cy.visit('/arende/2281/c9a96dcb-24b1-479b-84cb-2cc0260bb490');
      cy.get('.sk-cookie-consent-btn-wrapper').contains('Godkänn alla').click();
      cy.wait('@getErrandWithoutStakeholders');

      // Person
      cy.get('[data-cy="search-person-form-PRIMARY"').click();
      cy.get('[data-cy="contact-personNumber-owner"]').type('WORD!');
      cy.get('[data-cy="search-button-owner"').should('be.disabled');
      cy.get('[data-cy="personal-number-error-message"')
        .should('exist')
        .and('have.text', 'Ej giltigt personnummer (ange tolv siffror: ååååmmddxxxx)');
      cy.get('[data-cy="contact-personNumber-owner"]').clear().type(Cypress.env('mockPersonNumber'));
      cy.get('[data-cy="search-button-owner"').should('be.enabled');
      cy.get('[data-cy="personal-number-error-message"').should('not.exist');

      // Employee
      cy.get('[data-cy="search-employee-form-PRIMARY"').click();
      cy.get('[data-cy="contact-personNumber-owner"]').type('mockusername');
      cy.get('[data-cy="contact-personNumber-owner"]').parent().find('button').should('be.enabled');
      cy.get('[data-cy="personal-number-error-message"').should('not.exist');
    });

    it('shows the correct contact person information', () => {
      cy.visit('/arende/2281/3f0e57b2-2876-4cb8-aa71-537b5805be27');
      cy.wait('@getErrand');
      cy.get('.sk-cookie-consent-btn-wrapper').contains('Godkänn alla').click();
      cy.get('[data-cy="stakeholder-name"]').contains('Kim Svensson').should('exist');
      cy.get('[data-cy="stakeholder-email"]').contains('a@example.com').should('exist');
      cy.get('[data-cy="stakeholder-phone"]').contains('070000000').should('exist');
      cy.get('[data-cy="stakeholder-adress"]').contains('NORRMALMSGATAN 4').should('exist');

      cy.get('[data-cy="stakeholder-name"]').contains('Mormor Svensson').should('exist');
      cy.get('[data-cy="stakeholder-email"]').contains('b@example.com').should('exist');
      cy.get('[data-cy="stakeholder-phone"]').contains('Lägg till telefonnummer').should('exist');
      cy.get('[data-cy="stakeholder-adress"]').contains('NORRMALMSGATAN 5').should('exist');

      cy.get('[data-cy="stakeholder-name"]').contains('Kompis Svensson').should('exist');
      cy.get('[data-cy="stakeholder-email"]').contains('c@example.com').should('exist');
      cy.get('[data-cy="stakeholder-phone"]').contains('070111111').should('exist');
      cy.get('[data-cy="stakeholder-adress"]').contains('NORRMALMSGATAN 6').should('exist');

      cy.get('[data-cy="add-customer-button"]').should('not.exist');
      cy.get('[data-cy="add-manually-button-person"]').should('exist');
    });

    // COMMENTED OUT SINCE DISABLED DOES NOT APPLY TO BUTTONS OF VARIANT="LINK"
    // it('disables the add custom and contact buttons when user is not admin', () => {
    //   cy.intercept('GET', '**/supporterrands/2281/c9a96dcb-24b1-479b-84cb-2cc0260bb490', {
    //     ...mockSupportErrand,
    //     id: 'c9a96dcb-24b1-479b-84cb-2cc0260bb490',
    //     stakeholders: [],
    //     contact: [],
    //     customer: [],
    //   }).as('getErrandWithoutStakeholders');
    //   cy.intercept('GET', '**/me', { ...mockMe, data: { ...mockMe.data, username: 'testuser' } }).as('getMe');
    //   cy.visit('/arende/2281/c9a96dcb-24b1-479b-84cb-2cc0260bb490');
    //   cy.wait('@getErrandWithoutStakeholders');
    //   cy.get('.sk-cookie-consent-btn-wrapper').contains('Godkänn alla').click();
    //   cy.get('[data-cy="add-manually-button-owner"]').should('be.disabled');
    //   cy.get('[data-cy="add-manually-button-person"]').should('be.disabled');
    // });

    it('shows the add applicant person button when no applicant exists', () => {
      cy.intercept('GET', '**/supporterrands/2281/c9a96dcb-24b1-479b-84cb-2cc0260bb490', {
        ...mockSupportErrand,
        id: 'c9a96dcb-24b1-479b-84cb-2cc0260bb490',
        stakeholders: [],
        contact: [],
        customer: [],
      }).as('getErrandWithoutStakeholders');
      cy.visit('/arende/2281/c9a96dcb-24b1-479b-84cb-2cc0260bb490');
      cy.wait('@getErrandWithoutStakeholders');
      cy.get('.sk-cookie-consent-btn-wrapper').contains('Godkänn alla').click();
      cy.get('[data-cy="add-manually-button-owner"]').should('exist');
      cy.get('[data-cy="add-manually-button-person"]').should('exist');
    });

    it('shows the add customer person form when button is pressed', () => {
      cy.intercept('GET', '**/supporterrands/2281/c9a96dcb-24b1-479b-84cb-2cc0260bb490', {
        ...mockSupportErrand,
        id: 'c9a96dcb-24b1-479b-84cb-2cc0260bb490',
        stakeholders: [],
        contact: [],
        customer: [],
      }).as('getErrandWithoutStakeholders');
      cy.visit('/arende/2281/c9a96dcb-24b1-479b-84cb-2cc0260bb490');
      cy.get('.sk-cookie-consent-btn-wrapper').contains('Godkänn alla').click();
      cy.wait('@getSupportAdmins');
      cy.wait('@getMe');
      cy.wait('@getErrandWithoutStakeholders');
      cy.wait('@getMessages');
      cy.wait('@getNotes');
      cy.wait('@getSupportMetadata');

      cy.get('[data-cy="add-manually-button-owner"]').should('exist');
      cy.get('[data-cy="add-manually-button-owner"]').should('be.enabled');
      cy.get('[data-cy="add-manually-button-owner"]').click();

      cy.get('[data-cy="contact-externalIdType-owner"]').should('exist');
      cy.get('[data-cy="contact-externalIdType-owner"]').should('have.value', 'PRIVATE');
      cy.get('[data-cy="contact-role-owner"]').should('exist');
      cy.get('[data-cy="contact-role-owner"]').should('have.value', 'PRIMARY');
      cy.get('[data-cy="contact-externalId-owner"]').should('exist');
      cy.get('[data-cy="contact-personNumber"]').should('exist');
      cy.get('[data-cy="contact-firstName"]').should('exist');
      cy.get('[data-cy="contact-lastName"]').should('exist');
      cy.get('[data-cy="contact-address"]').should('exist');
      cy.get('[data-cy="contact-careOf"]').should('exist');
      cy.get('[data-cy="contact-zipCode"]').should('exist');
    });

    it('shows the add contact person form when button is pressed', () => {
      cy.intercept('GET', '**/supporterrands/2281/c9a96dcb-24b1-479b-84cb-2cc0260bb490', {
        ...mockSupportErrand,
        id: 'c9a96dcb-24b1-479b-84cb-2cc0260bb490',
        stakeholders: [],
        contact: [],
        customer: [],
      }).as('getErrandWithoutStakeholders');
      cy.visit('/arende/2281/c9a96dcb-24b1-479b-84cb-2cc0260bb490');
      cy.get('.sk-cookie-consent-btn-wrapper').contains('Godkänn alla').click();
      cy.wait('@getSupportAdmins');
      cy.wait('@getMe');
      cy.wait('@getErrandWithoutStakeholders');
      cy.wait('@getMessages');
      cy.wait('@getNotes');
      cy.wait('@getSupportMetadata');

      cy.get('[data-cy="search-person-form-CONTACT"').click();
      cy.get('[data-cy="add-manually-button-owner"]').should('exist');
      cy.get('[data-cy="add-manually-button-owner"]').should('be.enabled');
      cy.get('[data-cy="add-manually-button-owner"]').click();

      cy.get('[data-cy="contact-externalIdType-person"]').should('exist');
      cy.get('[data-cy="contact-externalIdType-person"]').should('have.value', 'PRIVATE');
      cy.get('[data-cy="contact-role-person"]').should('exist');
      cy.get('[data-cy="contact-role-person"]').should('have.value', 'CONTACT');
      cy.get('[data-cy="contact-externalId-person"]').should('exist');
      cy.get('[data-cy="contact-personNumber"]').should('exist');
      cy.get('[data-cy="contact-firstName"]').should('exist');
      cy.get('[data-cy="contact-lastName"]').should('exist');
      cy.get('[data-cy="contact-address"]').should('exist');
      cy.get('[data-cy="contact-careOf"]').should('exist');
      cy.get('[data-cy="contact-zipCode"]').should('exist');
      cy.get('[data-cy="contact-city"]').should('exist');
    });

    it('disables incomplete contact form', () => {
      cy.intercept('GET', '**/supporterrands/2281/c9a96dcb-24b1-479b-84cb-2cc0260bb490', {
        ...mockSupportErrand,
        id: 'c9a96dcb-24b1-479b-84cb-2cc0260bb490',
        stakeholders: [],
        contact: [],
        customer: [],
      }).as('getErrandWithoutStakeholders');
      cy.visit('/arende/2281/c9a96dcb-24b1-479b-84cb-2cc0260bb490');
      cy.get('.sk-cookie-consent-btn-wrapper').contains('Godkänn alla').click();
      cy.wait('@getErrandWithoutStakeholders');

      cy.get('[data-cy="add-manually-button-owner"]').click();
      cy.get('[data-cy="submit-contact-button"]').should('be.disabled');
    });

    it('shows search result and sends correct data for a person', () => {
      cy.intercept('PATCH', '**/supporterrands/2281/c9a96dcb-24b1-479b-84cb-2cc0260bb490', mockSupportErrand).as(
        'patchErrandContacts'
      );
      cy.intercept('GET', '**/supporterrands/2281/c9a96dcb-24b1-479b-84cb-2cc0260bb490', {
        ...mockSupportErrand,
        id: 'c9a96dcb-24b1-479b-84cb-2cc0260bb490',
        stakeholders: [],
        contact: [],
        customer: [],
      }).as('getErrandWithoutStakeholders');
      cy.visit('/arende/2281/c9a96dcb-24b1-479b-84cb-2cc0260bb490');
      cy.get('.sk-cookie-consent-btn-wrapper').contains('Godkänn alla').click();
      cy.wait('@getErrandWithoutStakeholders');
      cy.get('[data-cy="search-person-form-PRIMARY"').click();
      cy.get('[data-cy="contact-personNumber-owner"]').clear().type(Cypress.env('mockPersonNumber'));
      cy.get('[data-cy="search-button-owner"').should('be.enabled');
      cy.get('[data-cy="personal-number-error-message"').should('not.exist');
      cy.get('[data-cy="search-button-owner"').click();
      cy.get('[data-cy="search-result"').should('exist');
      cy.get('[data-cy="search-result"').contains('Kim Svensson').should('exist');
      cy.get('[data-cy="search-result"').contains(Cypress.env('mockPersonNumber')).should('exist');
      cy.get('[data-cy="search-result"').contains(mockAdressResponse.data.addresses[0].address).should('exist');
      cy.get('[data-cy="search-result"').contains(mockAdressResponse.data.addresses[0].postalCode).should('exist');
      cy.get('[data-cy="search-result"').contains(mockAdressResponse.data.addresses[0].city).should('exist');

      // Submit it
      cy.get('[data-cy="submit-contact-person-button"]').click();
      cy.get('[data-cy="save-button"]').click();
      cy.wait('@patchErrandContacts').should(({ request, response }) => {
        expect(request.body.stakeholders.length).to.equal(1);
        const s: SupportStakeholderFormModel = request.body.stakeholders[0];
        expect(s.firstName).to.equal(mockAdressResponse.data.givenname);
        expect(s.organizationName).to.equal('');
        expect(s.lastName).to.equal(mockAdressResponse.data.lastname);
        expect(s.externalIdType).to.equal('PRIVATE');
        expect(s.role).to.equal('PRIMARY');
        expect([200, 304]).to.include(response && response.statusCode);
      });
    });

    it('shows search result and sends correct data for an employee', () => {
      cy.intercept('PATCH', '**/supporterrands/2281/c9a96dcb-24b1-479b-84cb-2cc0260bb490', mockSupportErrand).as(
        'patchErrandContacts'
      );
      cy.intercept('GET', '**/supporterrands/2281/c9a96dcb-24b1-479b-84cb-2cc0260bb490', {
        ...mockSupportErrand,
        id: 'c9a96dcb-24b1-479b-84cb-2cc0260bb490',
        stakeholders: [],
        contact: [],
        customer: [],
      }).as('getErrandWithoutStakeholders');
      cy.visit('/arende/2281/c9a96dcb-24b1-479b-84cb-2cc0260bb490');
      cy.get('.sk-cookie-consent-btn-wrapper').contains('Godkänn alla').click();
      cy.wait('@getErrandWithoutStakeholders');
      cy.get('[data-cy="search-employee-form-PRIMARY"').click();
      cy.get('[data-cy="contact-personNumber-owner"]').clear().type('mockusername');
      cy.get('[data-cy="contact-personNumber-owner"]').parent().find('button').contains('Sök').should('be.enabled');
      cy.get('[data-cy="personal-number-error-message"').should('not.exist');
      cy.get('[data-cy="contact-personNumber-owner"]').parent().find('button').contains('Sök').click();

      cy.get('[data-cy="search-result"').should('exist');
      cy.get('[data-cy="search-result"').contains('Mock Lastname').should('exist');
      cy.get('[data-cy="search-result"').contains('mockusername').should('exist');
      cy.get('[data-cy="search-result"').contains('(adress saknas)').should('exist');
      cy.get('[data-cy="search-result"').contains('Telefonnummer saknas').should('exist');
      cy.get('[data-cy="search-result"').contains('mock.user@example.com').should('exist');

      // Submit it
      cy.get('[data-cy="submit-contact-person-button"]').click();
      cy.get('[data-cy="save-button"]').click();
      cy.wait('@patchErrandContacts').should(({ request, response }) => {
        expect(request.body.stakeholders.length).to.equal(1);
        const s: SupportStakeholderFormModel = request.body.stakeholders[0];
        expect(s.firstName).to.equal(mockEmployee.data.givenname);
        expect(s.organizationName).to.equal('');
        expect(s.lastName).to.equal(mockEmployee.data.lastname);
        expect(s.externalIdType).to.equal('EMPLOYEE');
        expect(s.role).to.equal('PRIMARY');
        expect([200, 304]).to.include(response && response.statusCode);
      });
    });

    it('clears the search result when personnumber changes', () => {
      cy.intercept('PATCH', '**/supporterrands/2281/c9a96dcb-24b1-479b-84cb-2cc0260bb490', mockSupportErrand).as(
        'patchErrandContacts'
      );
      cy.intercept('GET', '**/supporterrands/2281/c9a96dcb-24b1-479b-84cb-2cc0260bb490', {
        ...mockSupportErrand,
        id: 'c9a96dcb-24b1-479b-84cb-2cc0260bb490',
        stakeholders: [],
        contact: [],
        customer: [],
      }).as('getErrandWithoutStakeholders');
      cy.visit('/arende/2281/c9a96dcb-24b1-479b-84cb-2cc0260bb490');
      cy.get('.sk-cookie-consent-btn-wrapper').contains('Godkänn alla').click();
      cy.wait('@getErrandWithoutStakeholders');
      cy.get('[data-cy="search-person-form-PRIMARY"').click();
      cy.get('[data-cy="contact-personNumber-owner"]').clear().type(Cypress.env('mockPersonNumber'));
      cy.get('[data-cy="search-button-owner"').should('be.enabled');
      cy.get('[data-cy="personal-number-error-message"').should('not.exist');
      cy.get('[data-cy="search-button-owner"').click();
      cy.get('[data-cy="search-result"').should('exist');
      cy.get('[data-cy="search-result"').contains('Kim Svensson').should('exist');
      cy.get('[data-cy="search-result"').contains(Cypress.env('mockPersonNumber')).should('exist');
      cy.get('[data-cy="search-result"').contains(mockAdressResponse.data.addresses[0].address).should('exist');
      cy.get('[data-cy="search-result"').contains(mockAdressResponse.data.addresses[0].postalCode).should('exist');
      cy.get('[data-cy="search-result"').contains(mockAdressResponse.data.addresses[0].city).should('exist');

      // Change personnumber
      cy.get('[data-cy="contact-personNumber-owner"]').type('1');
      cy.get('[data-cy="search-button-owner"').should('be.disabled');
      cy.get('[data-cy="personal-number-error-message"').should('exist');

      // Open manual form, it should be empty
      cy.get('[data-cy="add-manually-button-owner"]').click();
      cy.get('[data-cy="contact-personNumber"]').should('have.attr', 'readonly');
      cy.get('[data-cy="contact-personNumber"]').should('have.value', '');
      cy.get('[data-cy="contact-firstName"]').should('have.value', '');
      cy.get('[data-cy="contact-lastName"]').should('have.value', '');
      cy.get('[data-cy="contact-address"]').should('have.value', '');
      cy.get('[data-cy="contact-careOf"]').should('have.value', '');
      cy.get('[data-cy="contact-zipCode"]').should('have.value', '');
    });

    it('sends the correct applicant data for manually filled form, for a person', () => {
      cy.intercept('PATCH', '**/supporterrands/2281/c9a96dcb-24b1-479b-84cb-2cc0260bb490', mockSupportErrand).as(
        'patchErrandContacts'
      );
      cy.intercept('GET', '**/supporterrands/2281/c9a96dcb-24b1-479b-84cb-2cc0260bb490', {
        ...mockSupportErrand,
        id: 'c9a96dcb-24b1-479b-84cb-2cc0260bb490',
        stakeholders: [],
        contact: [],
        customer: [],
      }).as('getErrandWithoutStakeholders');
      cy.visit('/arende/2281/c9a96dcb-24b1-479b-84cb-2cc0260bb490');
      cy.get('.sk-cookie-consent-btn-wrapper').contains('Godkänn alla').click();
      cy.wait('@getSupportAdmins');
      cy.wait('@getMe');
      cy.wait('@getErrandWithoutStakeholders');
      cy.wait('@getMessages');
      cy.wait('@getNotes');
      cy.wait('@getSupportMetadata');
      cy.get('[data-cy="add-manually-button-owner"]').click();

      cy.get('[data-cy="contact-personNumber"]').should('have.attr', 'readonly');
      cy.get('[data-cy="contact-personNumber"]').should('have.value', '');
      cy.get('[data-cy="contact-firstName"]').type('Test');
      cy.get('[data-cy="contact-lastName"]').type('Testsson');
      cy.get('[data-cy="contact-address"]').type('Testaddress');
      cy.get('[data-cy="contact-careOf"]').type('TestcareOf');
      cy.get('[data-cy="contact-zipCode"]').type('12345');
      cy.get('[data-cy="contact-city"]').type('Teststaden');
      cy.get('[data-cy="submit-contact-button"]').click();
      cy.get('[data-cy="save-button"]').click();
      cy.wait('@patchErrandContacts').should(({ request, response }) => {
        expect(request.body.stakeholders.length).to.equal(1);
        const s: SupportStakeholderFormModel = request.body.stakeholders[0];
        expect(s.firstName).to.equal('Test');
        expect(s.lastName).to.equal('Testsson');
        expect(s.address).to.equal('Testaddress');
        expect(s.careOf).to.equal('TestcareOf');
        expect(s.zipCode).to.equal('12345');
        expect(s.city).to.equal('Teststaden');
        expect(s.externalIdType).to.equal('PRIVATE');
        expect(s.role).to.equal('PRIMARY');
        expect([200, 304]).to.include(response && response.statusCode);
      });
    });

    it('sends the correct applicant data for manually filled form, for an employee', () => {
      cy.intercept('PATCH', '**/supporterrands/2281/c9a96dcb-24b1-479b-84cb-2cc0260bb490', mockSupportErrand).as(
        'patchErrandContacts'
      );
      cy.intercept('GET', '**/supporterrands/2281/c9a96dcb-24b1-479b-84cb-2cc0260bb490', {
        ...mockSupportErrand,
        id: 'c9a96dcb-24b1-479b-84cb-2cc0260bb490',
        stakeholders: [],
        contact: [],
        customer: [],
      }).as('getErrandWithoutStakeholders');
      cy.visit('/arende/2281/c9a96dcb-24b1-479b-84cb-2cc0260bb490');
      cy.get('.sk-cookie-consent-btn-wrapper').contains('Godkänn alla').click();
      cy.wait('@getSupportAdmins');
      cy.wait('@getMe');
      cy.wait('@getErrandWithoutStakeholders');
      cy.wait('@getMessages');
      cy.wait('@getNotes');
      cy.wait('@getSupportMetadata');
      cy.get('[data-cy="search-employee-form-PRIMARY"').click();
      cy.get('[data-cy="add-manually-button-owner"]').click();

      cy.get('[data-cy="contact-personNumber"]').should('have.attr', 'readonly');
      cy.get('[data-cy="contact-personNumber"]').should('have.value', '');
      cy.get('[data-cy="contact-firstName"]').type('Test');
      cy.get('[data-cy="contact-lastName"]').type('Testsson');
      cy.get('[data-cy="contact-address"]').type('Testaddress');
      cy.get('[data-cy="contact-careOf"]').type('TestcareOf');
      cy.get('[data-cy="contact-zipCode"]').type('12345');
      // TODO Uncomment when city is added to the form
      // cy.get('[data-cy="contact-city"]').type('Teststaden');
      cy.get('[data-cy="submit-contact-button"]').click();
      cy.get('[data-cy="save-button"]').click();
      cy.wait('@patchErrandContacts').should(({ request, response }) => {
        expect(request.body.stakeholders.length).to.equal(1);
        const s: SupportStakeholderFormModel = request.body.stakeholders[0];
        expect(s.firstName).to.equal('Test');
        expect(s.lastName).to.equal('Testsson');
        expect(s.address).to.equal('Testaddress');
        expect(s.careOf).to.equal('TestcareOf');
        expect(s.zipCode).to.equal('12345');
        // TODO Uncomment when city is added to the form
        // expect(s.city).to.equal('Teststaden');
        expect(s.externalIdType).to.equal('PRIVATE');
        expect(s.role).to.equal('PRIMARY');
        expect([200, 304]).to.include(response && response.statusCode);
      });
    });

    it('sends the correct secondary contact data for manually filled form, for a person', () => {
      cy.intercept('PATCH', '**/supporterrands/2281/c9a96dcb-24b1-479b-84cb-2cc0260bb490', mockSupportErrand).as(
        'patchErrandContacts'
      );
      cy.intercept('GET', '**/supporterrands/2281/c9a96dcb-24b1-479b-84cb-2cc0260bb490', {
        ...mockSupportErrand,
        id: 'c9a96dcb-24b1-479b-84cb-2cc0260bb490',
        stakeholders: [],
        contact: [],
        customer: [],
      }).as('getErrandWithoutStakeholders');
      cy.visit('/arende/2281/c9a96dcb-24b1-479b-84cb-2cc0260bb490');
      cy.get('.sk-cookie-consent-btn-wrapper').contains('Godkänn alla').click();
      cy.wait('@getErrandWithoutStakeholders');
      cy.get('[data-cy="search-person-form-PRIMARY"').click();
      cy.get('[data-cy="add-manually-button-person"]').should('be.enabled').click();

      cy.get('[data-cy="contact-personNumber"]').should('have.attr', 'readonly');
      cy.get('[data-cy="contact-personNumber"]').should('have.value', '');
      cy.get('[data-cy="contact-firstName"]').type('Test');
      cy.get('[data-cy="contact-lastName"]').type('Testsson');
      cy.get('[data-cy="contact-address"]').type('Testaddress');
      cy.get('[data-cy="contact-careOf"]').type('TestcareOf');
      cy.get('[data-cy="contact-zipCode"]').type('12345');
      cy.get('[data-cy="contact-city"]').type('Teststaden');
      cy.get('[data-cy="submit-contact-button"]').click();
      cy.get('[data-cy="save-button"]').click();
      cy.wait('@patchErrandContacts').should(({ request, response }) => {
        expect(request.body.stakeholders.length).to.equal(1);
        const s: SupportStakeholderFormModel = request.body.stakeholders[0];
        expect(s.firstName).to.equal('Test');
        expect(s.lastName).to.equal('Testsson');
        expect(s.address).to.equal('Testaddress');
        expect(s.careOf).to.equal('TestcareOf');
        expect(s.zipCode).to.equal('12345');
        expect(s.city).to.equal('Teststaden');
        expect(s.externalIdType).to.equal('PRIVATE');
        expect(s.role).to.equal('CONTACT');
        expect([200, 304]).to.include(response && response.statusCode);
      });
    });

    it('allows editing primary contact person information', () => {
      cy.intercept('PATCH', '**/supporterrands/2281/3f0e57b2-2876-4cb8-000-537b5805be27', mockSupportErrand).as(
        'patchErrandContacts'
      );
      cy.visit('/arende/2281/3f0e57b2-2876-4cb8-aa71-537b5805be27');
      cy.wait('@getErrand');
      cy.get('.sk-cookie-consent-btn-wrapper').contains('Godkänn alla').click();
      cy.get('[data-cy="edit-stakeholder-button-PRIMARY-0"]').click();
      cy.get('[data-cy="searchmode-selector-modal"]').should('not.exist');
      cy.get('[data-cy="contact-firstName"]').should('exist').clear().type('Test');
      cy.get('[data-cy="contact-lastName"]').should('exist').clear().type('Testsson');
      cy.get('[data-cy="submit-contact-button"]').click();
      cy.get('[data-cy="save-button"]').click();
      cy.wait('@updateErrand').should(({ request, response }) => {
        expect(request.body.stakeholders.length).to.equal(mockSupportErrand.stakeholders.length);
        const s: SupportStakeholderFormModel = request.body.stakeholders[0];
        expect(s.firstName).to.equal('Test');
        expect(s.lastName).to.equal('Testsson');
        expect(s.externalIdType).to.equal('PRIVATE');
        expect(s.role).to.equal('PRIMARY');
        expect([200, 304]).to.include(response && response.statusCode);
      });
    });

    it('allows editing secondary contact person information', () => {
      cy.intercept('PATCH', '**/supporterrands/2281/3f0e57b2-2876-4cb8-000-537b5805be27', mockSupportErrand).as(
        'patchErrandContacts'
      );
      cy.visit('/arende/2281/3f0e57b2-2876-4cb8-aa71-537b5805be27');
      cy.wait('@getErrand');
      cy.get('.sk-cookie-consent-btn-wrapper').contains('Godkänn alla').click();
      cy.get('[data-cy="edit-stakeholder-button-CONTACT-0"]').click();
      cy.get('[data-cy="searchmode-selector-modal"]').should('not.exist');
      cy.get('[data-cy="contact-firstName"]').should('exist').clear().type('Test');
      cy.get('[data-cy="contact-lastName"]').should('exist').clear().type('Testsson');
      cy.get('[data-cy="role-select"]').should('exist').select('MANAGER');
      cy.get('[data-cy="submit-contact-button"]').click();
      cy.get('[data-cy="save-button"]').click();
      cy.wait('@updateErrand').should(({ request, response }) => {
        expect(request.body.stakeholders.length).to.equal(mockSupportErrand.stakeholders.length);
        const s: SupportStakeholderFormModel = request.body.stakeholders[1];
        expect(s.firstName).to.equal('Test');
        expect(s.lastName).to.equal('Testsson');
        expect(s.externalIdType).to.equal('PRIVATE');
        expect(s.role).to.equal('MANAGER');
        expect([200, 304]).to.include(response && response.statusCode);
      });
    });

    it('sends the correct applicant data for filled out form', () => {
      cy.intercept('PATCH', '**/supporterrands/2281/c9a96dcb-24b1-479b-84cb-2cc0260bb490', mockSupportErrand).as(
        'patchErrandContacts'
      );
      cy.intercept('GET', '**/supporterrands/2281/c9a96dcb-24b1-479b-84cb-2cc0260bb490', {
        ...mockSupportErrand,
        id: 'c9a96dcb-24b1-479b-84cb-2cc0260bb490',
        stakeholders: [],
        contact: [],
        customer: [],
      }).as('getErrandWithoutStakeholders');
      cy.visit('/arende/2281/c9a96dcb-24b1-479b-84cb-2cc0260bb490');
      cy.get('.sk-cookie-consent-btn-wrapper').contains('Godkänn alla').click();
      cy.wait('@getErrandWithoutStakeholders');
      cy.get('[data-cy="search-person-form-PRIMARY"').click();
      cy.get('[data-cy="contact-personNumber-owner"]').type(Cypress.env('mockPersonNumber'));
      cy.get('[data-cy="search-button-owner"').should('have.text', 'Sök').click();

      cy.get('[data-cy="contact-externalId-owner"]').should('have.value', mockPersonIdResponse.data.personId);
      cy.wait('@getAddress');
      cy.get('[data-cy="stakeholder-name"]').should(
        'have.text',
        mockAdressResponse.data.givenname + ' ' + mockAdressResponse.data.lastname
      );
      cy.get('[data-cy="stakeholder-adress"]').should(
        'have.text',
        mockAdressResponse.data.addresses[0].address +
          ' ' +
          mockAdressResponse.data.addresses[0].postalCode +
          ' ' +
          mockAdressResponse.data.addresses[0].city
      );
      cy.get('[data-cy="stakeholder-phone"]').should('exist');
      cy.get('[data-cy="new-email-input"]').should('exist').first().type(Cypress.env('mockEmail'));
      cy.get('[data-cy="add-email-button"]').should('exist').contains('Lägg till').click();
      cy.get('[data-cy="newPhoneNumber"]').should('exist').type('70000000');
      cy.get('[data-cy="newPhoneNumber-button"]').should('exist').contains('Lägg till').click();
      cy.get('[data-cy="submit-contact-person-button"]').should('exist').contains('Lägg till ärendeägare').click();
      cy.get('[data-cy="save-button"]').click();
      cy.wait('@patchErrandContacts').should(({ request, response }) => {
        expect(request.body.stakeholders.length).to.equal(1);
        const m = mockAdressResponse.data;
        const s: SupportStakeholderFormModel = request.body.stakeholders[0];
        expect(s.firstName).to.equal(m.givenname);
        expect(s.lastName).to.equal(m.lastname);
        expect(s.role).to.equal('PRIMARY');
        expect(s.externalIdType).to.equal('PRIVATE');
        expect(s.contactChannels[0].value).to.equal(Cypress.env('mockEmail'));
        expect(s.contactChannels[1].value).to.equal('+4670000000');
        expect([200, 304]).to.include(response && response.statusCode);
      });
    });
  });
});
