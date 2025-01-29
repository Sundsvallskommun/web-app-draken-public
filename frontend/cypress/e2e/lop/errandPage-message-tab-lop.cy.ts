/// <reference types="cypress" />

import { mockMe } from '../case-data/fixtures/mockMe';
import {
  mockMissingRootMessage,
  mockSupportAttachments,
  mockSupportErrand,
  mockSupportErrandCommunication,
  mockSupportNotes,
} from './fixtures/mockSupportErrands';
import { mockAdmins } from '../case-data/fixtures/mockAdmins';
import { mockSupportAdminsResponse } from './fixtures/mockSupportAdmins';
import { mockMetaData } from './fixtures/mockMetadata';
import { onlyOn } from '@cypress/skip-test';
import { interceptFormData } from 'cypress-intercept-formdata';
import { CyHttpMessages } from 'cypress/types/net-stubbing';

onlyOn(Cypress.env('application_name') === 'LOP', () => {
  describe('Message tab', () => {
    beforeEach(() => {
      cy.intercept('GET', '**/administrators', mockAdmins);
      cy.intercept('GET', '**/users/admins', mockSupportAdminsResponse);
      cy.intercept('GET', '**/me', mockMe);
      cy.intercept('GET', '**/supporterrands/2281/c9a96dcb-24b1-479b-84cb-2cc0260bb490', mockSupportErrand).as(
        'getSupportErrand'
      );
      cy.intercept('GET', '**/supportmetadata/2281', mockMetaData).as('getSupportMetadata');
      cy.intercept('GET', '**/supportnotes/2281/*', mockSupportNotes).as('getNotes');
      cy.intercept('GET', '**/supportattachments/2281/errands/*/attachments', mockSupportAttachments);
      cy.intercept('GET', '**/supportmessage/2281/errands/*/communication', mockSupportErrandCommunication).as(
        'getMessages'
      );
      cy.intercept(
        'POST',
        '**/supportmessage/2281/c9a96dcb-24b1-479b-84cb-2cc0260bb490',
        mockSupportErrandCommunication
      ).as('sendMessage');
    });

    const goToMessageTab = () => {
      cy.visit('arende/2281/c9a96dcb-24b1-479b-84cb-2cc0260bb490');
      cy.wait('@getSupportErrand');
      cy.get('.sk-cookie-consent-btn-wrapper').should('exist').contains('Godkänn alla').click();
      cy.get('button').contains('Meddelanden').should('exist').click();
    };

    it('views messages in inbox', () => {
      cy.intercept(
        'PUT',
        `**/supportmessage/2281/errands/c9a96dcb-24b1-479b-84cb-2cc0260bb490/communication/*/viewed/true`,
        mockSupportErrandCommunication
      ).as('viewed');

      goToMessageTab();
      if (
        cy.get('[data-cy="message-container"] .sk-avatar').should('have.length', mockSupportErrandCommunication.length)
      ) {
        mockSupportErrandCommunication.forEach((communication) => {
          cy.get(`[data-cy="message-${communication.communicationID}"]`).should('exist');
          cy.get(`[data-cy="message-${communication.communicationID}"] button.sk-btn-ghost svg`)
            .should('exist')
            .click();

          cy.wait('@viewed');
          if (communication.communicationAttachments.length !== 0) {
            communication.communicationAttachments.forEach((a) => {
              cy.get(`div.message-${communication.communicationID} ul button[role="listitem"]`)
                .should('exist')
                .contains(a.name);
            });
          }
        });
      }
    });

    it('displays dummy message when root is missing', () => {
      cy.intercept('GET', '**/supportmessage/2281/errands/*/communication', mockMissingRootMessage).as(
        'getSupportErrandMissingRoot'
      );
      cy.intercept(
        'PUT',
        `**/supportmessage/2281/errands/c9a96dcb-24b1-479b-84cb-2cc0260bb490/communication/*/viewed/true`,
        mockMissingRootMessage
      );

      cy.visit('arende/2281/c9a96dcb-24b1-479b-84cb-2cc0260bb490');
      cy.wait('@getSupportErrandMissingRoot');
      cy.get('.sk-cookie-consent-btn-wrapper').should('exist').contains('Godkänn alla').click();
      cy.get('button').contains('Meddelanden').should('exist').click();
      if (cy.get('[data-cy="message-container"] .sk-avatar').should('have.length', mockMissingRootMessage.length + 1)) {
        cy.get('p').contains('Meddelande har vidarebefordrats').should('exist');
        mockMissingRootMessage.forEach((communication) => {
          cy.get(`[data-cy="message-${communication.communicationID}"]`).should('exist').click();
          cy.get('[data-cy="close-message-wrapper"]')
            .should('exist')
            .first()
            .within(() => {
              cy.get('[data-cy="close-message-wrapper-icon"]').should('exist').click({ force: true });
            });
        });
      }
    });

    it('sends sms', () => {
      goToMessageTab();
      cy.get('[data-cy="new-message-button"]').should('exist').click();

      cy.get('[data-cy="message-channel-radio-button-group mt-8"]').should('exist');
      cy.get('[data-cy="message-channel-radio-button-group mt-8"] li input[value="email"]').should('exist');
      cy.get('[data-cy="message-channel-radio-button-group mt-8"] li input[value="sms"]')
        .should('exist')
        .check({ force: true });
      cy.get('[data-cy="decision-richtext-wrapper"]').should('exist').clear().type('Mock message');

      cy.get('[data-cy="newPhoneNumber"]').should('exist').clear().type('+46701740635');
      cy.get('[data-cy="newPhoneNumber-button"]').should('exist').click({ force: true });

      cy.get('[data-cy="send-message-button"]').should('exist').click();
      cy.wait('@sendMessage').should(({ request, response }) => {
        const data = interceptFormData(request as CyHttpMessages.IncomingHttpRequest);
        expect(data['contactMeans']).to.equal('sms');
        expect(data['plaintextMessage']).to.equal('Mock message');
        expect(data['recipientPhone']).to.equal('+46701740635');
      });
    });

    it('sends email with attachment', () => {
      goToMessageTab();
      cy.get('[data-cy="new-message-button"]').should('exist').click();

      cy.get('[data-cy="decision-richtext-wrapper"]').should('exist').clear().type('Mock message');

      cy.get('[data-cy="message-channel-radio-button-group mt-8"] li input[value="email"]')
        .should('exist')
        .check({ force: true });

      cy.get('[data-cy="new-email-input"]').should('exist').clear().type('test@example.com');
      cy.get('[data-cy="add-new-email-button"]').should('exist').click({ force: true });

      cy.get('[data-cy="add-attachment-button"]').contains('Bifoga fil').should('exist').click();
      cy.get('button').contains('Bläddra').should('exist').click();
      cy.get('input[type=file]').selectFile('cypress/e2e/kontaktcenter/files/empty-attachment.txt', { force: true });
      cy.get('.sk-form-error-message').should('have.text', 'Bilagan du försöker lägga till är tom. Försök igen.');
      cy.get('button').contains('Bläddra').should('exist').click();
      cy.get('input[type=file]').selectFile('cypress/e2e/kontaktcenter/files/attachment.txt', { force: true });
      cy.get('[data-cy="upload-button"]').contains('Ladda upp').should('exist').click();

      cy.get('[data-cy="send-message-button"]').should('exist').click();
      cy.wait('@sendMessage').should(({ request, response }) => {
        const data = interceptFormData(request as CyHttpMessages.IncomingHttpRequest);
        expect(data['contactMeans']).to.equal('email');
        expect(data['plaintextMessage']).to.equal('Mock message');
        expect(data['files']).to.equal('attachment.txt');
      });
    });
  });
});
