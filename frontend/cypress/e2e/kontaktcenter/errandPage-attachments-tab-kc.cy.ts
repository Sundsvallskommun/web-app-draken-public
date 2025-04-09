/// <reference types="cypress" />

import { onlyOn } from '@cypress/skip-test';
import { mockAdmins } from '../case-data/fixtures/mockAdmins';
import { mockMe } from '../case-data/fixtures/mockMe';
import { mockAdressResponse, mockPersonIdResponse } from './fixtures/mockAdressResponse';
import { mockMetaData } from './fixtures/mockMetadata';
import { mockSupportAdminsResponse } from './fixtures/mockSupportAdmins';
import {
  mockEmptySupportErrand,
  mockSupportAttachments,
  mockSupportErrand,
  mockSupportMessages,
  mockSupportNotes,
} from './fixtures/mockSupportErrands';
//import { imageMimeTypes } from '@supportmanagement/services/support-attachment-service';

onlyOn(Cypress.env('application_name') === 'KC', () => {
  describe('Errand page support attachments tab', () => {
    beforeEach(() => {
      cy.intercept('GET', '**/administrators', mockAdmins);
      cy.intercept('GET', '**/users/admins', mockSupportAdminsResponse);
      cy.intercept('GET', '**/me', mockMe);
      cy.intercept('GET', '**/supporterrands/2281/c9a96dcb-24b1-479b-84cb-2cc0260bb490', mockSupportErrand).as(
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
      cy.intercept('PATCH', `**/supporterrands/2281/${mockEmptySupportErrand.id}`, mockEmptySupportErrand).as(
        'updateErrand'
      );

      cy.visit('/arende/2281/c9a96dcb-24b1-479b-84cb-2cc0260bb490');
      cy.wait('@getErrand');
      cy.get('.sk-cookie-consent-btn-wrapper').contains('Godkänn alla').click();
      cy.get('.sk-tabs-list button')
        .eq(2)
        .should('have.text', `Bilagor (${mockSupportAttachments.length})`)
        .click({ force: true });
    });

    const imageMimeTypes = ['image/jpeg', 'image/gif', 'image/png', 'image/tiff', 'image/bmp'];

    it('shows the correct attachment information', () => {
      cy.get('[data-cy="supportattachments-list"] .attachment-item').should(
        'have.length',
        mockSupportAttachments.length
      );
    });

    it('Can handle attachment alternatives', () => {
      mockSupportAttachments.forEach((attachment) => {
        cy.intercept(
          'GET',
          `**/supportattachments/2281/errands/c9a96dcb-24b1-479b-84cb-2cc0260bb490/attachments/${attachment.id}`,
          attachment
        ).as('getAttachment');
        cy.intercept(
          'DELETE',
          `**/supportattachments/2281/errands/c9a96dcb-24b1-479b-84cb-2cc0260bb490/attachments/${attachment.id}`,
          attachment
        ).as('getAttachment');
        cy.get(`[data-cy="attachment-${attachment.id}"]`).should('exist');

        cy.get(`[data-cy="attachment-${attachment.id}"] button[aria-label="Alternativ"]`).should('exist').click();
        cy.get(`[data-cy="open-attachment-${attachment.id}"]`).should('exist').contains('Öppna').click();
        if (imageMimeTypes.find((type) => type === attachment.mimeType)) {
          cy.wait('@getAttachment');
          cy.get('img').should('exist');
          cy.get('.modal-close-btn').should('exist').click();
        }
        cy.get(`[data-cy="attachment-${attachment.id}"] button[aria-label="Alternativ"]`).should('exist').click();
        cy.get(`[data-cy="delete-attachment-${attachment.id}"]`).should('exist').contains('Ta bort').click();
        cy.get('.sk-modal-dialog button.sk-btn-secondary').should('exist').contains('Nej');
        cy.get('.sk-modal-dialog button.sk-btn-primary').should('exist').contains('Ja').click();
      });
    });

    it('Can upload attachment/attachments', () => {
      cy.intercept(
        'POST',
        `**/supportattachments/2281/errands/c9a96dcb-24b1-479b-84cb-2cc0260bb490/attachments`,
        'attachment.txt'
      ).as('uploadAttachment');
      cy.get('[data-cy="add-attachment-button"]').should('exist').contains('Ladda upp bilaga').click();
      cy.get('[data-cy="dragdrop-upload"]').should('exist').contains('klicka för att bläddra på din enhet').click();
      //if empty file
      cy.get('input[type=file]').selectFile('cypress/e2e/kontaktcenter/files/empty-attachment.txt', { force: true });
      cy.get('.sk-form-error-message').should('have.text', 'Bilagan du försöker lägga till är tom. Försök igen.');

      //if wrong format file
      cy.get('input[type=file]').selectFile('cypress/e2e/kontaktcenter/files/testwrongformat.jfif', { force: true });
      cy.get('.sk-form-error-message').should('have.text', 'Filtypen stöds inte.');

      // right format and not empty
      cy.get('input[type=file]').selectFile('cypress/e2e/kontaktcenter/files/attachment.txt', { force: true });
      cy.get('.sk-modal-footer button.sk-btn-primary').should('exist').contains('Ladda upp').click();
      cy.wait('@uploadAttachment');
    });
  });
});
