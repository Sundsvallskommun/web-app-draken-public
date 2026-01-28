/// <reference types="cypress" />
import { onlyOn } from '@cypress/skip-test';
import { mockAdmins } from '../case-data/fixtures/mockAdmins';
import { mockMe } from '../case-data/fixtures/mockMe';
import { mockAdressResponse, mockPersonIdResponse } from './fixtures/mockAdressResponse';
import { mockConversationMessages, mockConversations } from './fixtures/mockConversations';
import { mockMetaData } from './fixtures/mockMetadata';
import { mockRelations } from './fixtures/mockRelations';
import { mockSupportAdminsResponse } from './fixtures/mockSupportAdmins';
import {
  mockEmptySupportErrand,
  mockSaveFacilities,
  mockSupportAttachments,
  mockSupportErrands,
  mockSupportErrandsEmpty,
  mockSupportMessages,
  mockSupportNotes,
} from './fixtures/mockSupportErrands';

onlyOn(Cypress.env('application_name') === 'LOP', () => {
  describe('register page', () => {
    beforeEach(() => {
      cy.intercept('GET', '**/administrators', mockAdmins);
      cy.intercept('GET', '**/me', mockMe);
      cy.intercept('GET', '**/featureflags', []);
      cy.intercept('POST', '**/newerrand/2281', mockEmptySupportErrand).as('initiateErrand');
      cy.intercept('PATCH', `**/supporterrands/2281/${mockEmptySupportErrand.id}`, mockEmptySupportErrand).as(
        'updateErrand'
      );
      cy.intercept('GET', `**/supporterrands/2281/${mockEmptySupportErrand.id}`, mockEmptySupportErrand).as(
        'getErrand'
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
      cy.intercept('GET', '**/users/admins', mockSupportAdminsResponse).as('getSupportAdmins');
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
      cy.visit('/registrera');
      cy.get('.sk-cookie-consent-btn-wrapper button').contains('Godkänn alla').click();
    });

    it('displays the support errand part of the register form', () => {
      cy.get('[data-cy="labelCategory-input"]').should('exist');
      cy.get('[data-cy="labelType-input"]').should('exist');
      cy.get('[data-cy="channel-input"]').should('exist');
      // cy.get('[data-cy="description-input"]').should('exist');
      cy.get('[data-cy="errand-description-richtext-wrapper"]').should('exist');
    });

    it('displays the admin part of the register form', () => {
      cy.get('[data-cy="admin-input"]').should('exist');
      cy.get('[data-cy="status-input"]').should('exist');
    });

    it('sends the correct data for new errand', () => {
      cy.intercept('GET', `**/supporterrands/2281/${mockEmptySupportErrand.id}`, mockEmptySupportErrand).as(
        'getErrand'
      );
      const labelCat = mockMetaData?.labels?.labelStructure?.[0];
      const labelType = labelCat?.labels?.[0];
      delete labelCat.labels;
      delete labelType.labels;

      expect(labelCat, 'Expected labelCat to be defined').to.not.be.undefined;
      expect(labelCat?.displayName, 'Expected labelCat.displayName to be defined').to.not.be.undefined;
      expect(labelType, 'Expected labelType to be defined').to.not.be.undefined;
      expect(labelType?.displayName, 'Expected labelType.displayName to be defined').to.not.be.undefined;

      cy.get('[data-cy="labelCategory-input"]').select(labelCat!.displayName!);
      cy.get('[data-cy="labelType-input"]').click();
      cy.get('[data-cy="labelType-list"]').children().contains(labelType!.displayName!).click();
      cy.get('[data-cy="errand-description-richtext-wrapper"]').type('Mock description');
      cy.get('[data-cy="save-button"]').click();
      cy.wait(`@updateErrand`).should(({ request, response }) => {
        expect(request.body.classification.category).to.equal(labelCat!.resourcePath!);
        expect(request.body.classification.type).to.equal(labelType!.resourcePath!);
        expect(request.body.labels.map((label) => label.resourcePath)).to.include(labelCat!.resourcePath!);
        expect(request.body.labels.map((label) => label.resourcePath)).to.include(labelType!.resourcePath!);
        expect(request.body.channel).to.equal('PHONE');
        expect(request.body.priority).to.equal('MEDIUM');
        expect(request.body.description).to.equal('<p>Mock description</p>');
        expect(request.body).to.deep.equal({
          assignedUserId: mockEmptySupportErrand.assignedUserId,
          businessRelated: false,
          classification: {
            category: labelCat?.resourcePath,
            type: labelType?.resourcePath,
          },
          externalTags: mockEmptySupportErrand.externalTags,
          labels: [labelCat, labelType],
          channel: 'PHONE',
          parameters: [],
          priority: 'MEDIUM',
          resolution: 'INFORMED',
          stakeholders: [],
          description: '<p>Mock description</p>',
          status: 'NEW',
          suspension: {},
        });

        expect([200, 304]).to.include(response && response.statusCode);
      });
    });
  });
});
