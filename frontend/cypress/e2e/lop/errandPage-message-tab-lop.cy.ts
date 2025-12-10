/// <reference types="cypress" />

import { onlyOn } from '@cypress/skip-test';
import { mockAdmins } from '../case-data/fixtures/mockAdmins';
import { mockMe } from '../case-data/fixtures/mockMe';
import { goToMessageTab, sendEmailWithAttachment, sendSmsMessage } from '../utils/messages-cy';
import { mockConversationMessages, mockConversations } from './fixtures/mockConversations';
import { mockMetaData } from './fixtures/mockMetadata';
import { mockRelations } from './fixtures/mockRelations';
import { mockSupportAdminsResponse } from './fixtures/mockSupportAdmins';
import {
  mockMissingRootMessage,
  mockSupportAttachments,
  mockSupportErrand,
  mockSupportErrandCommunication,
  mockSupportNotes,
} from './fixtures/mockSupportErrands';

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
      cy.intercept('GET', '**/sourcerelations/**/**', mockRelations).as('getSourceRelations');
      cy.intercept('GET', '**/targetrelations/**/**', mockRelations).as('getTargetRelations');
      cy.intercept('GET', '**/namespace/errands/**/communication/conversations', mockConversations).as(
        'getConversations'
      );
      cy.intercept('GET', '**/errands/**/communication/conversations/*/messages', mockConversationMessages).as(
        'getConversationMessages'
      );
    });

    it('views messages in inbox', () => {
      cy.intercept(
        'PUT',
        `**/supportmessage/2281/errands/c9a96dcb-24b1-479b-84cb-2cc0260bb490/communication/*/viewed/true`,
        mockSupportErrandCommunication
      ).as('viewed');

      goToMessageTab();
      if (
        cy
          .get('[data-cy="message-container"] .sk-avatar')
          .should('have.length', mockSupportErrandCommunication.length + 2 * mockConversationMessages.data.length)
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
                .contains(a.fileName);
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
      if (
        cy
          .get('[data-cy="message-container"] .sk-avatar')
          .should('have.length', mockMissingRootMessage.length + 1 + 2 * mockConversationMessages.data.length)
      ) {
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
      sendSmsMessage();
    });

    it('sends email with attachment', () => {
      goToMessageTab();
      sendEmailWithAttachment();
    });
  });
});
