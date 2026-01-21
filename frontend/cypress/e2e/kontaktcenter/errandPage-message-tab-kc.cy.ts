/// <reference types="cypress" />

import { onlyOn } from '@cypress/skip-test';
import { mockAdmins } from '../case-data/fixtures/mockAdmins';
import { mockMe } from '../case-data/fixtures/mockMe';
import { mockMetaData } from './fixtures/mockMetadata';
import { mockSupportAdminsResponse } from './fixtures/mockSupportAdmins';
import {
  mockSupportAttachments,
  mockSupportErrand,
  mockSupportErrandCommunication,
  mockSupportNotes,
} from './fixtures/mockSupportErrands';
//TODO:Update mockdata
import { mockConversationMessages, mockConversations } from '../lop/fixtures/mockConversations';
import { mockRelations } from '../lop/fixtures/mockRelations';
import { goToMessageTab, sendEmailWithAttachment, sendSmsMessage } from '../utils/messages-cy';
import { mockStakeholderStatus } from './fixtures/mockStakeholderStatus';

onlyOn(Cypress.env('application_name') === 'KC', () => {
  describe('Message tab', () => {
    beforeEach(() => {
      cy.intercept('GET', '**/administrators', mockAdmins);
      cy.intercept('GET', '**/users/admins', mockSupportAdminsResponse);
      cy.intercept('GET', '**/me', mockMe);
      cy.intercept('GET', '**/featureflags', []);
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
      cy.intercept('GET', '**/party/*/statuses', mockStakeholderStatus).as('getStakeholderStatuses');
      cy.intercept('GET', '**/namespace/errands/**/communication/conversations', mockConversations).as(
        'getConversations'
      );
      cy.intercept('GET', '**/errands/**/communication/conversations/*/messages', mockConversationMessages).as(
        'getConversationMessages'
      );
      goToMessageTab();
    });

    it('views messages in inbox', () => {
      cy.intercept(
        'PUT',
        `**/supportmessage/2281/errands/c9a96dcb-24b1-479b-84cb-2cc0260bb490/communication/*/viewed/true`,
        mockSupportErrandCommunication
      ).as('viewed');

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

    it('sends sms', () => {
      sendSmsMessage();
    });

    it('sends email with attachment', () => {
      sendEmailWithAttachment();
    });
  });
});
