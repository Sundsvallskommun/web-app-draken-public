/// <reference types="cypress" />

import { onlyOn } from '@cypress/skip-test';
import { SupportStakeholderFormModel } from '@supportmanagement/services/support-errand-service';
import { mockAdmins } from '../case-data/fixtures/mockAdmins';
import { mockMe } from '../case-data/fixtures/mockMe';
import {
  clearSearchResultOnPersonNumberChange,
  disabledIncompleteContactForm,
  displayManuallyAddStakeholderModal,
  searchAndSaveContactPersonStakeholder,
  searchAndSavePersonStakeholder,
  sendCorrectDataOnManualAddPerson,
  supportManagementEmployeeSearch,
  supportManagementPersonSearch,
} from '../utils/stakeholder-search-cy';
import { mockAdressResponse, mockPersonIdResponse } from './fixtures/mockAdressResponse';
import { mockConversationMessages, mockConversations } from './fixtures/mockConversations';
import { mockEmployee } from './fixtures/mockEmployee';
import { mockMetaData } from './fixtures/mockMetadata';
import { mockOrganizationResponse } from './fixtures/mockOrganizationResponse';
import { mockRelations } from './fixtures/mockRelations';
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

onlyOn(Cypress.env('application_name') === 'LOP', () => {
  describe('Errand page', () => {
    beforeEach(() => {
      cy.intercept('GET', '**/administrators', mockAdmins);
      cy.intercept('GET', '**/users/admins', mockSupportAdminsResponse).as('getSupportAdmins');
      cy.intercept('GET', '**/me', mockMe).as('getMe');
      cy.intercept('GET', '**/featureflags', []);
      cy.intercept('GET', '**/supporterrands/2281/3f0e57b2-2876-4cb8-aa71-537b5805be27', mockSupportErrand);
      cy.intercept('GET', `**/supporterrands/errandnumber/${mockSupportErrand.errandNumber}`, mockSupportErrand).as(
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
      cy.intercept('GET', '**/sourcerelations/**/**', mockRelations).as('getSourceRelations');
      cy.intercept('GET', '**/targetrelations/**/**', mockRelations).as('getTargetRelations');
      cy.intercept('GET', '**/namespace/errands/**/communication/conversations', mockConversations).as(
        'getConversations'
      );
      cy.intercept('GET', '**/errands/**/communication/conversations/*/messages', mockConversationMessages).as(
        'getConversationMessages'
      );
    });

    it('shows the correct base errand information', () => {
      cy.visit(`/arende/${mockSupportErrand.errandNumber}`);
      cy.wait('@getErrand');
      cy.get('.sk-cookie-consent-btn-wrapper').contains('Godkänn alla').click();
      const errandCategory = mockSupportErrand.labels.find((l) => l.classification === 'CATEGORY');
      const errandType = mockSupportErrand.labels.find((l) => l.classification === 'TYPE');
      const errandSubtype = mockSupportErrand.labels.find((l) => l.classification === 'SUBTYPE');
      cy.get('[data-cy="labelCategory-input"]').children().contains(errandCategory.displayName).should('exist');
      if (errandSubtype) {
        cy.get(`[data-cy="labelType-input"][placeholder="${errandSubtype.displayName}"]`).should('exist');
      } else {
        cy.get(`[data-cy="labelType-input"][placeholder="${errandType.displayName}"]`).should('exist');
      }
      cy.get('.ql-editor').children().contains('En ärendebeskrivning').should('exist');
      cy.get('[data-cy="errand-description-richtext-wrapper"]').contains('En ärendebeskrivning').should('exist');
      cy.get('[data-cy="channel-input"]').contains('Fysiskt möte').should('exist');
      cy.get('[data-cy="save-button"]').contains('Spara').should('exist');
    });

    it('allows updating errand information', () => {
      cy.visit(`/arende/${mockSupportErrand.errandNumber}`);
      cy.wait('@getErrand');
      cy.get('.sk-cookie-consent-btn-wrapper').contains('Godkänn alla').click();

      // Change changeable values
      cy.get('[data-cy="labelCategory-input"]').select('Elnät/Servanet');
      cy.get('[data-cy="errand-description-richtext-wrapper"]').clear().type('En ändrad beskrivning');
      cy.get('[data-cy="channel-input"]').select('Chatt');

      // Check changed values
      cy.get('[data-cy="labelCategory-input"]').contains('Elnät/Servanet').should('exist');
      cy.get('[data-cy="labelType-error"]').children().contains('Välj ärendetyp').should('exist');
      cy.get('[data-cy="errand-description-richtext-wrapper"]').contains('En ändrad beskrivning').should('exist');
      cy.get('[data-cy="channel-input"]').contains('Chatt').should('exist');
      cy.get('[data-cy="save-button"]').contains('Spara ärende').should('be.disabled');

      // Select missing value
      cy.get('[data-cy="labelType-wrapper"]').click();
      cy.get('[data-cy="labelType-wrapper"]').children().contains('Nyanställning').click();
      cy.get('[data-cy="save-button"]').contains('Spara ärende').should('be.enabled');

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
        expect(request.body.classification.type).to.equal('ELECTRICITY_SERVANET/EMPLOYMENT');

        // Check label objects
        const postedCategory = request.body.labels.find((l) => l.classification === 'CATEGORY');
        const postedType = request.body.labels.find((l) => l.classification === 'TYPE');
        const postedSubtype = request.body.labels.find((l) => l.classification === 'SUBTYPE');
        const metadataCategory = mockMetaData.labels.labelStructure.find((l) => l.id === postedCategory?.id);
        const metadataType = metadataCategory.labels?.find((l) => l.id === postedType?.id);
        const metadataSubtype = metadataType.labels?.find((l) => l.id === postedSubtype?.id);
        delete metadataCategory?.labels;
        expect(postedCategory).to.deep.equal(metadataCategory);
        delete metadataType?.labels;
        expect(postedType).to.deep.equal(metadataType);
        delete metadataSubtype?.labels;
        expect(postedSubtype).to.deep.equal(metadataSubtype);

        expect(request.body.labels.map((label) => label.resourcePath)).to.include('ELECTRICITY_SERVANET');
        expect(request.body.labels.map((label) => label.resourcePath)).to.include('ELECTRICITY_SERVANET/EMPLOYMENT');
        expect(request.body.labels.map((label) => label.resourcePath)).to.include(
          'ELECTRICITY_SERVANET/EMPLOYMENT/NEW_EMPLOYMENT'
        );
        expect(request.body.description).to.equal('<p>En ändrad beskrivning</p>');
        expect([200, 304]).to.include(response && response.statusCode);
      });
    });

    it('validates the person number and organization number fields', () => {
      cy.intercept('GET', `**/supporterrands/errandnumber/${mockSupportErrand.errandNumber}`, {
        ...mockSupportErrand,
        id: 'c9a96dcb-24b1-479b-84cb-2cc0260bb490',
        stakeholders: [],
        contact: [],
        customer: [],
      }).as('getErrandWithoutStakeholders');
      cy.visit(`/arende/${mockSupportErrand.errandNumber}`);
      cy.get('.sk-cookie-consent-btn-wrapper').contains('Godkänn alla').click();
      cy.wait('@getErrandWithoutStakeholders');

      // Person
      supportManagementPersonSearch();

      // Employee
      supportManagementEmployeeSearch();
    });

    it('shows the correct contact person information', () => {
      cy.visit(`/arende/${mockSupportErrand.errandNumber}`);
      cy.wait('@getErrand');
      cy.get('.sk-cookie-consent-btn-wrapper').contains('Godkänn alla').click();
      //Errand owner
      cy.get('[data-cy="stakeholder-name"]').contains(mockSupportErrand.stakeholders[0].firstName).should('exist');
      cy.get('[data-cy="stakeholder-adress"]').contains(mockSupportErrand.stakeholders[0].address).should('exist');

      // const stakeholder = mockSupportErrand.stakeholders[0];
      const getContactValue = (stakeholderIndex: number, type: string): string => {
        const stakeholder = mockSupportErrand.stakeholders[stakeholderIndex];
        const channel = stakeholder.contactChannels.find((c) => c.type === type);
        expect(channel, `Expected stakeholder #${stakeholderIndex} to have a contact channel of type '${type}'`).to.not
          .be.undefined;
        return channel!.value;
      };

      const getParameterValue = (stakeholderIndex: number, key: string): string => {
        const stakeholder = mockSupportErrand.stakeholders[stakeholderIndex];
        if (!stakeholder.parameters) {
          throw new Error(`Expected stakeholder #${stakeholderIndex} parameters to be defined`);
        }
        const param = stakeholder.parameters.find((p) => p.key === key);
        expect(param, `Expected stakeholder #${stakeholderIndex} to have parameter '${key}'`).to.not.be.undefined;
        expect(param!.values.length, `Expected parameter '${key}' to have at least one value`).to.be.greaterThan(0);
        return param!.values[0];
      };

      const getStringValue = (
        stakeholderIndex: number,
        key: keyof (typeof mockSupportErrand.stakeholders)[0]
      ): string => {
        const stakeholder = mockSupportErrand.stakeholders[stakeholderIndex];
        const value = stakeholder[key];
        expect(value, `Expected stakeholder #${stakeholderIndex} to have a defined ${key}`).to.not.be.undefined;
        return value as string;
      };

      // Stakeholder 0
      cy.get('[data-cy="stakeholder-email"]').contains(getContactValue(0, 'Email')).should('exist');
      cy.get('[data-cy="stakeholder-phone"]').contains(getContactValue(0, 'Phone')).should('exist');
      cy.get('[data-cy="stakeholder-title"]').contains(getParameterValue(0, 'title')).should('exist');
      cy.get('[data-cy="stakeholder-department"]').contains(getParameterValue(0, 'department')).should('exist');
      cy.get('[data-cy="stakeholder-referenceNumber"]')
        .contains(getParameterValue(0, 'referenceNumber'))
        .should('exist');

      // Contact person #1 (index 1)
      cy.get('[data-cy="stakeholder-name"]').contains(getStringValue(1, 'firstName')).should('exist');
      cy.get('[data-cy="stakeholder-adress"]').contains(getStringValue(1, 'address')).should('exist');
      cy.get('[data-cy="stakeholder-email"]').contains(getContactValue(1, 'Email')).should('exist');

      // Contact person #2 (index 2)
      cy.get('[data-cy="stakeholder-name"]').contains(getStringValue(2, 'firstName')).should('exist');
      cy.get('[data-cy="stakeholder-adress"]').contains(getStringValue(2, 'address')).should('exist');
      cy.get('[data-cy="stakeholder-email"]').contains(getContactValue(2, 'Email')).should('exist');
      cy.get('[data-cy="stakeholder-phone"]').contains(getContactValue(2, 'Phone')).should('exist');

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
    //   cy.visit('/arende/c9a96dcb-24b1-479b-84cb-2cc0260bb490');
    //   cy.wait('@getErrandWithoutStakeholders');
    //   cy.get('.sk-cookie-consent-btn-wrapper').contains('Godkänn alla').click();
    //   cy.get('[data-cy="add-manually-button-owner"]').should('be.disabled');
    //   cy.get('[data-cy="add-manually-button-person"]').should('be.disabled');
    // });

    it('shows the add applicant person button when no applicant exists', () => {
      cy.intercept('GET', `**/supporterrands/errandnumber/${mockSupportErrand.errandNumber}`, {
        ...mockSupportErrand,
        id: 'c9a96dcb-24b1-479b-84cb-2cc0260bb490',
        stakeholders: [],
        contact: [],
        customer: [],
      }).as('getErrandWithoutStakeholders');
      cy.visit(`/arende/${mockSupportErrand.errandNumber}`);
      cy.wait('@getErrandWithoutStakeholders');
      cy.get('.sk-cookie-consent-btn-wrapper').contains('Godkänn alla').click();
      cy.get('[data-cy="add-manually-button-owner"]').should('exist');
      cy.get('[data-cy="add-manually-button-person"]').should('exist');
    });

    it('shows the add customer person form when button is pressed', () => {
      cy.intercept('GET', `**/supporterrands/errandnumber/${mockSupportErrand.errandNumber}`, {
        ...mockSupportErrand,
        id: 'c9a96dcb-24b1-479b-84cb-2cc0260bb490',
        stakeholders: [],
        contact: [],
        customer: [],
      }).as('getErrandWithoutStakeholders');
      cy.visit(`/arende/${mockSupportErrand.errandNumber}`);
      cy.get('.sk-cookie-consent-btn-wrapper').contains('Godkänn alla').click();
      cy.wait('@getSupportAdmins');
      cy.wait('@getMe');
      cy.wait('@getErrandWithoutStakeholders');
      cy.wait('@getMessages');
      cy.wait('@getSupportMetadata');

      displayManuallyAddStakeholderModal();
    });

    it('shows the add contact person form when button is pressed', () => {
      cy.intercept('GET', `**/supporterrands/errandnumber/${mockSupportErrand.errandNumber}`, {
        ...mockSupportErrand,
        id: 'c9a96dcb-24b1-479b-84cb-2cc0260bb490',
        stakeholders: [],
        contact: [],
        customer: [],
      }).as('getErrandWithoutStakeholders');
      cy.visit(`/arende/${mockSupportErrand.errandNumber}`);
      cy.get('.sk-cookie-consent-btn-wrapper').contains('Godkänn alla').click();
      cy.wait('@getSupportAdmins');
      cy.wait('@getMe');
      cy.wait('@getErrandWithoutStakeholders');
      cy.wait('@getMessages');
      cy.wait('@getSupportMetadata');

      cy.get('[data-cy="search-person-form-CONTACT"').click();

      displayManuallyAddStakeholderModal();
    });

    it('disables incomplete contact form', () => {
      cy.intercept('GET', `**/supporterrands/errandnumber/${mockSupportErrand.errandNumber}`, {
        ...mockSupportErrand,
        id: 'c9a96dcb-24b1-479b-84cb-2cc0260bb490',
        stakeholders: [],
        contact: [],
        customer: [],
      }).as('getErrandWithoutStakeholders');
      cy.visit(`/arende/${mockSupportErrand.errandNumber}`);
      cy.get('.sk-cookie-consent-btn-wrapper').contains('Godkänn alla').click();
      cy.wait('@getErrandWithoutStakeholders');

      disabledIncompleteContactForm();
    });

    it('shows search result and sends correct data for a person', () => {
      cy.intercept('PATCH', '**/supporterrands/2281/c9a96dcb-24b1-479b-84cb-2cc0260bb490', mockSupportErrand).as(
        'patchErrandContacts'
      );
      cy.intercept('GET', '**/supporterrands/2281/c9a96dcb-24b1-479b-84cb-2cc0260bb490', mockSupportErrand);
      cy.intercept('GET', `**/supporterrands/errandnumber/${mockSupportErrand.errandNumber}`, {
        ...mockSupportErrand,
        id: 'c9a96dcb-24b1-479b-84cb-2cc0260bb490',
        stakeholders: [],
        contact: [],
        customer: [],
      }).as('getErrandWithoutStakeholders');
      cy.visit(`/arende/${mockSupportErrand.errandNumber}`);
      cy.get('.sk-cookie-consent-btn-wrapper').contains('Godkänn alla').click();
      cy.wait('@getErrandWithoutStakeholders');

      searchAndSavePersonStakeholder(mockAdressResponse);
    });

    it('shows search result and sends correct data for an employee', () => {
      cy.intercept('PATCH', '**/supporterrands/2281/c9a96dcb-24b1-479b-84cb-2cc0260bb490', mockSupportErrand).as(
        'patchErrandContacts'
      );
      cy.intercept('GET', `**/supporterrands/errandnumber/${mockSupportErrand.errandNumber}`, {
        ...mockSupportErrand,
        id: 'c9a96dcb-24b1-479b-84cb-2cc0260bb490',
        stakeholders: [],
        contact: [],
        customer: [],
      }).as('getErrandWithoutStakeholders');
      cy.visit(`/arende/${mockSupportErrand.errandNumber}`);
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
      cy.intercept('GET', `**/supporterrands/errandnumber/${mockSupportErrand.errandNumber}`, {
        ...mockSupportErrand,
        id: 'c9a96dcb-24b1-479b-84cb-2cc0260bb490',
        stakeholders: [],
        contact: [],
        customer: [],
      }).as('getErrandWithoutStakeholders');
      cy.visit(`/arende/${mockSupportErrand.errandNumber}`);
      cy.get('.sk-cookie-consent-btn-wrapper').contains('Godkänn alla').click();
      cy.wait('@getErrandWithoutStakeholders');

      clearSearchResultOnPersonNumberChange(mockAdressResponse);
    });

    it('sends the correct applicant data for manually filled form, for a person', () => {
      cy.intercept('PATCH', '**/supporterrands/2281/c9a96dcb-24b1-479b-84cb-2cc0260bb490', mockSupportErrand).as(
        'patchErrandContacts'
      );
      cy.intercept('GET', '**/supporterrands/2281/c9a96dcb-24b1-479b-84cb-2cc0260bb490', mockSupportErrand);
      cy.intercept('GET', `**/supporterrands/errandnumber/${mockSupportErrand.errandNumber}`, {
        ...mockSupportErrand,
        id: 'c9a96dcb-24b1-479b-84cb-2cc0260bb490',
        stakeholders: [],
        contact: [],
        customer: [],
      }).as('getErrandWithoutStakeholders');
      cy.visit(`/arende/${mockSupportErrand.errandNumber}`);
      cy.get('.sk-cookie-consent-btn-wrapper').contains('Godkänn alla').click();
      cy.wait('@getSupportAdmins');
      cy.wait('@getMe');
      cy.wait('@getErrandWithoutStakeholders');
      cy.wait('@getMessages');
      // cy.wait('@getNotes');
      cy.wait('@getSupportMetadata');

      cy.get('[data-cy="add-manually-button-owner"]').click();

      sendCorrectDataOnManualAddPerson();
    });

    it('sends the correct applicant data for manually filled form, for an employee', () => {
      cy.intercept('PATCH', '**/supporterrands/2281/c9a96dcb-24b1-479b-84cb-2cc0260bb490', mockSupportErrand).as(
        'patchErrandContacts'
      );
      cy.intercept('GET', `**/supporterrands/errandnumber/${mockSupportErrand.errandNumber}`, {
        ...mockSupportErrand,
        id: 'c9a96dcb-24b1-479b-84cb-2cc0260bb490',
        stakeholders: [],
        contact: [],
        customer: [],
      }).as('getErrandWithoutStakeholders');
      cy.visit(`/arende/${mockSupportErrand.errandNumber}`);
      cy.get('.sk-cookie-consent-btn-wrapper').contains('Godkänn alla').click();
      cy.wait('@getSupportAdmins');
      cy.wait('@getMe');
      cy.wait('@getErrandWithoutStakeholders');
      cy.wait('@getMessages');
      // cy.wait('@getNotes');
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
      cy.intercept('GET', `**/supporterrands/errandnumber/${mockSupportErrand.errandNumber}`, {
        ...mockSupportErrand,
        id: 'c9a96dcb-24b1-479b-84cb-2cc0260bb490',
        stakeholders: [],
        contact: [],
        customer: [],
      }).as('getErrandWithoutStakeholders');
      cy.visit(`/arende/${mockSupportErrand.errandNumber}`);
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
      cy.visit(`/arende/${mockSupportErrand.errandNumber}`);
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
      cy.visit(`/arende/${mockSupportErrand.errandNumber}`);
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
      cy.intercept('GET', `**/supporterrands/errandnumber/${mockSupportErrand.errandNumber}`, {
        ...mockSupportErrand,
        id: 'c9a96dcb-24b1-479b-84cb-2cc0260bb490',
        stakeholders: [],
        contact: [],
        customer: [],
      }).as('getErrandWithoutStakeholders');
      cy.visit(`/arende/${mockSupportErrand.errandNumber}`);
      cy.get('.sk-cookie-consent-btn-wrapper').contains('Godkänn alla').click();
      cy.wait('@getErrandWithoutStakeholders');

      searchAndSaveContactPersonStakeholder(mockAdressResponse, mockPersonIdResponse);
    });
  });
});
