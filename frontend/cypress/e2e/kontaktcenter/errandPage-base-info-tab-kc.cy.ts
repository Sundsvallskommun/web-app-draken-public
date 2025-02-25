/// <reference types="cypress" />

import { onlyOn } from '@cypress/skip-test';
import { mockAdmins } from '../case-data/fixtures/mockAdmins';
import { mockMe } from '../case-data/fixtures/mockMe';
import { mockAdressResponse, mockPersonIdResponse } from './fixtures/mockAdressResponse';
import { mockMetaData } from './fixtures/mockMetadata';
import { mockOrganizationResponse } from './fixtures/mockOrganizationResponse';
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

onlyOn(Cypress.env('application_name') === 'KC', () => {
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
      cy.get('[data-cy="category-input"]').children().contains('IAF').should('exist');
      cy.get('[data-cy="type-input"]').children().contains('Vuxenutbildning').should('exist');
      cy.get('[data-cy="description-input"]').contains('En ärendebeskrivning').should('exist');
      cy.get('[data-cy="channel-input"]').contains('Fysiskt möte').should('exist');
      cy.get('[data-cy="contactReason-input"]').contains('Välj orsak').should('exist');
      cy.get('[data-cy="show-contactReasonDescription-input"]').should('exist').check({ force: true });
      cy.get('[data-cy="contactReasonDescription-input"]').should('exist');
      cy.get('[data-cy="save-button"]').contains('Spara').should('exist');
    });

    it.only('allows updating errand information', () => {
      cy.visit('/arende/2281/3f0e57b2-2876-4cb8-aa71-537b5805be27');
      cy.wait('@getErrand');
      cy.get('.sk-cookie-consent-btn-wrapper').contains('Godkänn alla').click();

      // Change changeable values
      cy.get('[data-cy="category-input"]').select('BoU');
      cy.get('[data-cy="description-input"]').clear().type('En ändrad beskrivning');
      cy.get('[data-cy="contactReason-input"]').select('Klagomål');
      cy.get('[data-cy="channel-input"]').select('Chatt');
      cy.get('[data-cy="show-contactReasonDescription-input"]').check({ force: true });
      cy.get('[data-cy="contactReasonDescription-input"]').clear().type('En ändrad orsaksbeskrivning');

      // Check changed values
      cy.get('[data-cy="category-input"]').contains('BoU').should('exist');
      cy.get('[data-cy="type-input"]').contains('Välj ärendetyp').should('exist');
      cy.get('[data-cy="description-input"]').contains('En ändrad beskrivning').should('exist');
      cy.get('[data-cy="contactReason-input"]').contains('Klagomål').should('exist');
      cy.get('[data-cy="channel-input"]').contains('Chatt').should('exist');
      cy.get('[data-cy="contactReasonDescription-input"]').contains('En ändrad orsaksbeskrivning').should('exist');
      cy.get('[data-cy="save-button"]').contains('Spara').should('be.disabled');

      // Select missing value
      cy.get('[data-cy="type-input"]').select('Övrigt');
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
        expect(request.body.classification.category).to.equal('BOU');
        expect(request.body.classification.type).to.equal('OTHER');
        expect(request.body.description).to.equal('En ändrad beskrivning');
        expect(request.body.contactReason).to.equal('Klagomål');
        expect(request.body.contactReasonDescription).to.equal('En ändrad oraksbeskrivning');
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
      cy.get('[data-cy="contact-personNumber-owner"]').type('WORD!');
      cy.get('[data-cy="search-button-owner"]').should('be.disabled');
      cy.get('[data-cy="personal-number-error-message"]')
        .should('exist')
        .and('have.text', 'Ej giltigt personnummer (ange tolv siffror: ååååmmddxxxx)');
      cy.get('[data-cy="contact-personNumber-owner"]').clear().type(Cypress.env('mockPersonNumber'));
      cy.get('[data-cy="search-button-owner"]').should('be.enabled');
      cy.get('[data-cy="personal-number-error-message"]').should('not.exist');

      // Enterprise
      cy.get('[data-cy="search-enterprise-form-PRIMARY"]').click();
      cy.get('[data-cy="contact-orgNumber-owner"]').type('WORD!');
      cy.get('[data-cy="org-number-error-message"]')
        .should('exist')
        .and('have.text', 'Ej giltigt organisationsnummer (ange tio siffror med streck: kkllmm-nnnn)');
      cy.get('[data-cy="contact-orgNumber-owner"]')
        .clear()
        .type(Cypress.env('mockOrganizationNumber').replace('-', ''));
      cy.get('[data-cy="org-number-error-message"]')
        .should('exist')
        .and('have.text', 'Ej giltigt organisationsnummer (ange tio siffror med streck: kkllmm-nnnn)');
      cy.get('[data-cy="contact-orgNumber-owner"]').clear().type(Cypress.env('mockOrganizationNumber'));
      cy.get('[data-cy="search-button-owner"]').should('be.enabled');
      cy.get('[data-cy="org-number-error-message"]').should('not.exist');

      // Organization
      cy.get('[data-cy="search-organization-form-PRIMARY"]').click();
      cy.get('[data-cy="contact-orgNumber-owner"]').clear().type('WORD!');
      cy.get('[data-cy="search-button-owner"]').should('be.disabled');
      cy.get('[data-cy="org-number-error-message"]')
        .should('exist')
        .and('have.text', 'Ej giltigt organisationsnummer (ange tio siffror med streck: kkllmm-nnnn)');
      cy.get('[data-cy="contact-orgNumber-owner"]').clear().type(Cypress.env('mockOrganizationNumber'));
      cy.get('[data-cy="search-button-owner"]').should('be.enabled');
      cy.get('[data-cy="org-number-error-message"]').should('not.exist');
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

      cy.get('[data-cy="add-manually-button-owner"]').should('exist');
      cy.get('[data-cy="add-manually-button-owner"]').should('be.enabled');
      cy.get('[data-cy="add-manually-button-owner"]').click();

      cy.get('[data-cy="submit-contact-button"]').should('be.disabled');
    });

    it('shows search result and sends correct data for a person', () => {
      cy.intercept('PATCH', '**/supporterrands/2281/c9a96dcb-24b1-479b-84cb-2cc0260bb490/admin', {
        ...mockSupportErrand,
        id: 'c9a96dcb-24b1-479b-84cb-2cc0260bb490',
      }).as('patchErrandContacts');

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
      cy.get('[data-cy="contact-personNumber-owner"]').clear().type(Cypress.env('mockPersonNumber'));
      cy.get('[data-cy="search-button-owner"]').should('be.enabled');
      cy.get('[data-cy="personal-number-error-message"]').should('not.exist');

      // Save button
      cy.get('[data-cy="save-button"]').should('be.disabled');

      cy.get('[data-cy="search-button-owner"]').click();
      cy.get('[data-cy="search-result"]').should('exist');
      cy.get('[data-cy="search-result"]').contains('Kim Svensson').should('exist');
      cy.get('[data-cy="search-result"]').contains(Cypress.env('mockPersonNumber')).should('exist');
      cy.get('[data-cy="search-result"]').contains(mockAdressResponse.data.addresses[0].address).should('exist');
      cy.get('[data-cy="search-result"]').contains(mockAdressResponse.data.addresses[0].postalCode).should('exist');
      cy.get('[data-cy="search-result"]').contains(mockAdressResponse.data.addresses[0].city).should('exist');

      // Submit it
      cy.get('[data-cy="submit-contact-person-button').click();

      cy.get('[data-cy="stakeholder-name"]').contains('Kim Svensson').should('exist');
      cy.get('[data-cy="stakeholder-ssn"]').contains(Cypress.env('mockPersonNumber')).should('exist');
      cy.get('[data-cy="stakeholder-adress"]').contains(mockAdressResponse.data.addresses[0].address).should('exist');
      cy.get('[data-cy="stakeholder-adress"]')
        .contains(mockAdressResponse.data.addresses[0].postalCode)
        .should('exist');
      cy.get('[data-cy="stakeholder-adress"]').contains(mockAdressResponse.data.addresses[0].city).should('exist');

      // Save button
      cy.get('[data-cy="save-button"]').should('be.enabled');
      cy.get('[data-cy="save-button"]').click();
      cy.get('[data-cy="save-button"]').should('be.disabled');

      cy.get('[data-cy="stakeholder-name"]').contains(mockAdressResponse.data.givenname);
      cy.get('[data-cy="stakeholder-name"]').contains(mockAdressResponse.data.lastname);
    });

    it('shows search result and sends correct data for an organization', () => {
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
      cy.get('[data-cy="search-enterprise-form-PRIMARY"]').click();
      cy.get('[data-cy="contact-orgNumber-owner"]').clear().type(Cypress.env('mockOrganizationNumber'));
      cy.get('[data-cy="search-button-owner"]').should('be.enabled');
      cy.get('[data-cy="org-number-error-message"]').should('not.exist');
      cy.get('[data-cy="save-button"]').should('be.disabled');

      cy.get('[data-cy="search-button-owner"]').click();
      cy.get('[data-cy="search-result"]').should('exist');
      cy.get('[data-cy="search-result"]').contains('Hooli Sweden AB').should('exist');
      cy.get('[data-cy="search-result"]').contains(Cypress.env('mockOrganizationNumber')).should('exist');
      cy.get('[data-cy="search-result"]')
        .contains(mockOrganizationResponse.data.companyLocation.address.city)
        .should('exist');
      cy.get('[data-cy="search-result"]')
        .contains(mockOrganizationResponse.data.companyLocation.address.postcode)
        .should('exist');
      cy.get('[data-cy="search-result"]')
        .contains(mockOrganizationResponse.data.companyLocation.address.street)
        .should('exist');
      cy.get('[data-cy="search-result"]').contains(Cypress.env('mockPhoneNumber')).should('exist');

      // Submit it
      cy.get('[data-cy="save-button"]').should('be.disabled');
      cy.get('[data-cy="submit-contact-person-button"]').click();

      cy.get('[data-cy="stakeholder-name"]').contains(mockOrganizationResponse.data.companyName);
      cy.get('[data-cy="stakeholder-adress"]').contains(mockOrganizationResponse.data.address.street);
      cy.get('[data-cy="stakeholder-adress"]').contains(mockOrganizationResponse.data.address.postcode);
      cy.get('[data-cy="stakeholder-adress"]').contains(mockOrganizationResponse.data.address.city);

      cy.get('[data-cy="save-button"]').should('be.enabled');
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
      cy.get('[data-cy="contact-personNumber-owner"]').clear().type(Cypress.env('mockPersonNumber'));
      cy.get('[data-cy="search-button-owner"]').should('be.enabled');
      cy.get('[data-cy="personal-number-error-message"]').should('not.exist');
      cy.get('[data-cy="search-button-owner"]').click();
      cy.get('[data-cy="search-result"]').should('exist');
      cy.get('[data-cy="search-result"]').contains('Kim Svensson').should('exist');
      cy.get('[data-cy="search-result"]').contains(Cypress.env('mockPersonNumber')).should('exist');
      cy.get('[data-cy="search-result"]').contains(mockAdressResponse.data.addresses[0].address).should('exist');
      cy.get('[data-cy="search-result"]').contains(mockAdressResponse.data.addresses[0].postalCode).should('exist');
      cy.get('[data-cy="search-result"]').contains(mockAdressResponse.data.addresses[0].city).should('exist');

      // TODO disable validation for now due to mixed AD/personNumber search
      // Change personnumber
      cy.get('[data-cy="contact-personNumber-owner"]').type('1');
      cy.get('[data-cy="search-button-owner"]').should('be.disabled');
      cy.get('[data-cy="personal-number-error-message"]').should('exist');

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

    it('clears the search result when orgnumber changes', () => {
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
      cy.get('[data-cy="search-enterprise-form-PRIMARY"]').click();
      cy.get('[data-cy="search-enterprise-form-PRIMARY"]').click();
      cy.get('[data-cy="contact-orgNumber-owner"]').clear().type(Cypress.env('mockOrganizationNumber'));
      cy.get('[data-cy="search-button-owner"]').should('be.enabled');
      cy.get('[data-cy="org-number-error-message"]').should('not.exist');

      cy.get('[data-cy="search-button-owner"]').click();
      cy.get('[data-cy="search-result"]').should('exist');
      cy.get('[data-cy="search-result"]').contains('Hooli Sweden AB').should('exist');
      cy.get('[data-cy="search-result"]').contains(Cypress.env('mockOrganizationNumber')).should('exist');
      cy.get('[data-cy="search-result"]')
        .contains(mockOrganizationResponse.data.companyLocation.address.city)
        .should('exist');
      cy.get('[data-cy="search-result"]')
        .contains(mockOrganizationResponse.data.companyLocation.address.postcode)
        .should('exist');
      cy.get('[data-cy="search-result"]')
        .contains(mockOrganizationResponse.data.companyLocation.address.street)
        .should('exist');
      cy.get('[data-cy="search-result"]').contains(Cypress.env('mockPhoneNumber')).should('exist');

      // Change orgnumber
      cy.get('[data-cy="contact-orgNumber-owner"]').type('1');
      cy.get('[data-cy="search-button-owner"]').should('be.disabled');
      cy.get('[data-cy="org-number-error-message"]').should('exist');

      // Open manual form, it should be empty
      cy.get('[data-cy="add-manually-button-owner"]').click();

      cy.get('[data-cy="contact-organizationNumber"]').should('have.attr', 'readonly');
      cy.get('[data-cy="contact-organizationNumber"]').should('have.value', '');
      cy.get('[data-cy="contact-organizationName"]').should('have.value', '');
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
      cy.get('[data-cy="save-button"]').should('be.disabled');
      cy.get('[data-cy="add-manually-button-owner"]').click();

      cy.get('[data-cy="contact-personNumber"]').should('have.attr', 'readonly');
      cy.get('[data-cy="contact-personNumber"]').should('have.value', '');
      cy.get('[data-cy="contact-firstName"]').type('Test');
      cy.get('[data-cy="contact-lastName"]').type('Testsson');
      cy.get('[data-cy="contact-address"]').type('Testaddress');
      cy.get('[data-cy="contact-careOf"]').type('TestcareOf');
      cy.get('[data-cy="contact-zipCode"]').type('12345');
      cy.get('[data-cy="contact-city"]').type('Teststaden');

      cy.get('[data-cy="save-button"]').should('be.disabled');

      cy.get('[data-cy="submit-contact-button"]').click();

      cy.get('[data-cy="stakeholder-name"]').contains('Test');
      cy.get('[data-cy="stakeholder-name"]').contains('Testsson');
      cy.get('[data-cy="stakeholder-adress"]').contains('Testaddress');
      cy.get('[data-cy="stakeholder-adress"]').contains('12345');
      cy.get('[data-cy="stakeholder-adress"]').contains('Teststaden');

      cy.get('[data-cy="save-button"]').should('be.enabled');
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
      cy.get('[data-cy="save-button"]').should('be.disabled');
      cy.get('[data-cy="add-manually-button-person"]').click();

      cy.get('[data-cy="contact-personNumber"]').should('have.attr', 'readonly');
      cy.get('[data-cy="contact-personNumber"]').should('have.value', '');
      cy.get('[data-cy="contact-firstName"]').type('Test');
      cy.get('[data-cy="contact-lastName"]').type('Testsson');
      cy.get('[data-cy="contact-address"]').type('Testaddress');
      cy.get('[data-cy="contact-careOf"]').type('TestcareOf');
      cy.get('[data-cy="contact-zipCode"]').type('12345');
      cy.get('[data-cy="contact-city"]').type('Teststaden');
    });

    it('sends the correct applicant data for manually filled form, for a company', () => {
      cy.intercept('PATCH', '**/supporterrands/2281/3f0e57b2-2876-4cb8-000-537b5805be27', mockSupportErrand).as(
        'patchErrandContacts'
      );
      cy.intercept('GET', '**/supporterrands/2281/3f0e57b2-2876-4cb8-000-537b5805be27', {
        ...mockSupportErrand,
        id: '3f0e57b2-2876-4cb8-000-537b5805be27',
        stakeholders: [],
        contact: [],
        customer: [],
      }).as('getErrandWithoutStakeholders');
      cy.visit('/arende/2281/3f0e57b2-2876-4cb8-000-537b5805be27');
      cy.get('.sk-cookie-consent-btn-wrapper').contains('Godkänn alla').click();
      cy.wait('@getErrandWithoutStakeholders');
      cy.get('[data-cy="search-enterprise-form-PRIMARY"]').click();
      cy.get('[data-cy="search-enterprise-form-PRIMARY"]').click();
      cy.get('[data-cy="add-manually-button-owner"]').click();

      cy.get('[data-cy="contact-organizationNumber"]').should('have.attr', 'readonly');
      cy.get('[data-cy="contact-organizationNumber"]').should('have.value', '');
      cy.get('[data-cy="contact-organizationName"]').type('Test');
      cy.get('[data-cy="contact-address"]').type('Testaddress');
      cy.get('[data-cy="contact-careOf"]').type('TestcareOf');
      cy.get('[data-cy="contact-zipCode"]').type('12345');
      cy.get('[data-cy="contact-city"]').type('Teststaden');

      cy.get('[data-cy="save-button"]').should('be.disabled');
      cy.get('[data-cy="submit-contact-button"]').click();
      cy.get('[data-cy="save-button"]').should('be.enabled');

      cy.get('[data-cy="stakeholder-name"]').contains('Test');
      cy.get('[data-cy="stakeholder-adress"]').contains('Testaddress');
      cy.get('[data-cy="stakeholder-adress"]').contains('12345');
      cy.get('[data-cy="stakeholder-adress"]').contains('Teststaden');
    });

    it('allows editing contact person information', () => {
      cy.intercept('PATCH', '**/supporterrands/2281/3f0e57b2-2876-4cb8-000-537b5805be27', mockSupportErrand).as(
        'patchErrandContacts'
      );
      cy.visit('/arende/2281/3f0e57b2-2876-4cb8-aa71-537b5805be27');
      cy.wait('@getErrand');
      cy.get('.sk-cookie-consent-btn-wrapper').contains('Godkänn alla').click();
      cy.get('[data-cy="edit-stakeholder-button-CONTACT-0"]').first().click();
      cy.get('[data-cy="searchmode-selector-modal"]').should('not.exist');
      cy.get('[data-cy="contact-firstName"]').should('exist').clear().type('Test');
      cy.get('[data-cy="contact-lastName"]').should('exist').clear().type('Testsson');
      cy.get('[data-cy="submit-contact-button"]').click();

      cy.get('[data-cy="stakeholder-name"]').contains('Test');
      cy.get('[data-cy="stakeholder-name"]').contains('Testsson');
    });

    it('allows editing contact organization information', () => {
      cy.intercept('PATCH', '**/supporterrands/2281/3f0e57b2-2876-4cb8-000-537b5805be27', mockSupportErrand).as(
        'patchErrandContacts'
      );
      cy.intercept('GET', '**/supporterrands/2281/c9a96dcb-24b1-479b-84cb-2cc0260bb490', {
        ...mockSupportErrand,
        id: 'c9a96dcb-24b1-479b-84cb-2cc0260bb490',
        stakeholders: [
          {
            externalId: '000000-0000',
            externalIdType: 'COMPANY',
            role: 'PRIMARY',
            organizationName: 'Testbolaget',
            firstName: '',
            lastName: '',
            address: 'NORRMALMSGATAN 4',
            zipCode: '851 85',
            country: 'SWEDEN',
            contactChannels: [
              { type: 'Email', value: 'a@example.com' },
              { type: 'Phone', value: '070000000' },
            ],
          },
        ],
      }).as('getErrandWithOrganizationStakeholder');
      cy.visit('/arende/2281/c9a96dcb-24b1-479b-84cb-2cc0260bb490');
      cy.get('.sk-cookie-consent-btn-wrapper').contains('Godkänn alla').click();
      cy.wait('@getErrandWithOrganizationStakeholder');
      cy.get('[data-cy="edit-stakeholder-button-PRIMARY-0"]').first().click();
      cy.get('[data-cy="searchmode-selector-modal"]').should('not.exist');
      cy.get('[data-cy="contact-organizationNumber"]').should('exist').and('have.value', '000000-0000');
      cy.get('[data-cy="contact-organizationName"]').should('exist').and('have.value', 'Testbolaget');
      cy.get('[data-cy="contact-organizationName"]').clear().type('Test');
      cy.get('[data-cy="contact-lastName"]').should('not.exist');
      cy.get('[data-cy="submit-contact-button"]').click();

      cy.get('[data-cy="stakeholder-name"]').contains('Test');
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
      cy.get('[data-cy="contact-personNumber-owner"]').clear().type(Cypress.env('mockPersonNumber'));
      cy.get('[data-cy="search-button-owner"]').should('be.enabled');
      cy.get('[data-cy="personal-number-error-message"]').should('not.exist');
      cy.get('[data-cy="search-button-owner"]').click();
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

      const m = mockAdressResponse.data;

      cy.get('[data-cy="stakeholder-name"]').contains(m.givenname);
      cy.get('[data-cy="stakeholder-name"]').contains(m.lastname);
      cy.get('[data-cy="stakeholder-email"]').contains(Cypress.env('mockEmail'));
      cy.get('[data-cy="stakeholder-phone"]').contains('+4670000000');
    });

    it('make contact to errande owner', () => {
      cy.intercept('PATCH', '**/supporterrands/2281/c9a96dcb-24b1-479b-84cb-2cc0260bb490/admin', {
        ...mockSupportErrand,
        id: 'c9a96dcb-24b1-479b-84cb-2cc0260bb490',
      }).as('patchErrandContacts');

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
      cy.get('[data-cy="search-button-owner"]').should('be.disabled');

      cy.get('[data-cy="save-button"]').should('be.disabled');
      cy.get('[data-cy="description-input"]').type('  Test value');
      cy.get('[data-cy="save-button"]').should('be.enabled');

      cy.get('[data-cy="add-manually-button-person"]').click();

      cy.get('[data-cy="submit-contact-button"]').should('be.disabled');
      cy.get('[data-cy="contact-personNumber"]').should('have.attr', 'readonly');
      cy.get('[data-cy="contact-personNumber"]').should('have.value', '');
      cy.get('[data-cy="contact-firstName"]').type('Test');
      cy.get('[data-cy="contact-lastName"]').type('Testsson');
      cy.get('[data-cy="contact-address"]').type('Testaddress');
      cy.get('[data-cy="contact-careOf"]').type('TestcareOf');
      cy.get('[data-cy="contact-zipCode"]').type('12345');
      cy.get('[data-cy="contact-city"]').type('Teststaden');

      cy.get('[data-cy="submit-contact-button"]').should('be.enabled');
      cy.get('[data-cy="submit-contact-button"]').click();

      cy.get('[data-cy="stakeholder-name"]').contains('Test');
      cy.get('[data-cy="stakeholder-name"]').contains('Testsson');
      cy.get('[data-cy="stakeholder-adress"]').contains('Testaddress');
      cy.get('[data-cy="stakeholder-adress"]').contains('12345');
      cy.get('[data-cy="stakeholder-adress"]').contains('Teststaden');

      cy.get('[data-cy="make-stakeholder-owner-button"]').should('be.enabled');
      cy.get('[data-cy="make-stakeholder-owner-button"]').click();

      cy.get('button').contains('Ja').should('exist').click();

      cy.get('[data-cy="save-button"]').should('be.enabled');
      cy.get('[data-cy="description-input"]').contains('Test value');

      cy.get('[data-cy="save-button"]').click();
      cy.get('[data-cy="save-button"]').should('be.disabled');
    });

    it('shows the correct estate information', () => {
      const patchFacility = {
        id: 123,
        version: 1,
        created: '2024-01-01',
        updated: '2024-06-30',
        description: 'beskrivning',
        address: 'Adress1',
        facilityCollectionName: 'name',
        mainFacility: true,
        facilityType: 'BOSTAD',
      };
      cy.intercept('GET', '**/supporterrands/2281/c9a96dcb-24b1-479b-84cb-2cc0260bb490', mockSupportErrand).as('getit');
      cy.visit('/arende/2281/3f0e57b2-2876-4cb8-aa71-537b5805be27');
      cy.intercept('GET', '**/supporterrands/2281/c9a96dcb-24b1-479b-84cb-2cc0260bb490', {
        ...mockSupportErrand,
        id: 'c9a96dcb-24b1-479b-84cb-2cc0260bb490',
        stakeholders: [],
        contact: [],
        customer: [],
      }).as('getErrandWithoutStakeholders');
      cy.intercept(
        'PATCH',
        '**/supporterrands/saveFacilities/2281/c9a96dcb-24b1-479b-84cb-2cc0260bb490',
        patchFacility
      ).as('patchfacilities');
      cy.intercept('GET', '**/estateByPropertyDesignation/Balder%201', mockFacilitiesData).as(
        'getFacilityByDesignationBalder1'
      );
      cy.wait('@getErrand');
      cy.get('.sk-cookie-consent-btn-wrapper').contains('Godkänn alla').click();

      // add
      cy.get('[data-cy="facility-disclosure"]').click();
      cy.get('[data-cy="facility-search"]').focus().type('Balder 1', { delay: 100 });
      cy.wait('@getFacilityByDesignationBalder1');
      cy.get('[data-cy="suggestion-list"] label').eq(0).contains('BALDER 1').should('exist');
      cy.get('[data-cy="manage-sidebar"] [data-cy="save-button"]').contains('Spara ärende').should('be.disabled');
      cy.get('.sk-form-combobox-list-option').contains('BALDER 1').click();
      cy.get('[data-cy="manage-sidebar"] [data-cy="save-button"]').contains('Spara ärende').should('be.enabled');

      // check
      cy.get('[data-cy="facility-table"]').contains('Visa fastighetsinformation');
      cy.get('[data-cy="facility-table"]').contains('SUNDSVALL BALDER 1');

      // Save
      cy.get('[data-cy="manage-sidebar"] [data-cy="save-button"]').contains('Spara ärende').click();
      cy.wait('@patchfacilities');
      cy.wait('@getErrandWithoutStakeholders');
      cy.get('[data-cy="manage-sidebar"] [data-cy="save-button"]').contains('Spara ärende').should('be.disabled');

      // Remove
      cy.get('[data-cy="facility-table"]').contains('Ta bort').click();
      cy.get('[data-cy="facility-table"]').contains('Inga fastigheter tillagda');
      cy.get('[data-cy="manage-sidebar"] [data-cy="save-button"]').contains('Spara ärende').click();
      cy.get('[data-cy="manage-sidebar"] [data-cy="save-button"]').contains('Spara ärende').should('be.disabled');
    });
  });
});
