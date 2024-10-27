/// <reference types="cypress" />

import { onlyOn } from '@cypress/skip-test';
import { mockAttachments } from 'cypress/e2e/case-data/fixtures/mockAttachments';
import { mockHistory } from 'cypress/e2e/case-data/fixtures/mockHistory';
import { mockPersonId } from 'cypress/e2e/case-data/fixtures/mockPersonId';
import { mockAdmins } from '../fixtures/mockAdmins';
import { mockMe } from '../fixtures/mockMe';
import { mockMessages } from '../fixtures/mockMessages';
import { imageMimeTypes } from '@casedata/services/casedata-attachment-service';
import { mockPTErrand_base } from '../fixtures/mockPtErrand';
import { mockAsset } from '../fixtures/mockAsset';

onlyOn(Cypress.env('application_name') === 'PT', () => {
  describe('Errand page attachments tab', () => {
    beforeEach(() => {
      cy.intercept('GET', '**/messages/PRH-2022-000019*', mockMessages);
      cy.intercept('GET', '**/users/admins', mockAdmins);
      cy.intercept('GET', '**/me', mockMe);
      cy.intercept('POST', '**/personid', mockPersonId);
      cy.intercept('GET', /\/attachments\/errand\/\d*/, mockAttachments).as('getErrandAttachments');
      cy.intercept('PATCH', '**/errands/*', { data: 'ok', message: 'ok' }).as('patchErrand');
      cy.intercept('GET', '**/errand/errandNumber/*', mockPTErrand_base).as('getErrand');
      cy.intercept('POST', '**/stakeholders/personNumber', mockPTErrand_base.data.stakeholders);
      cy.intercept('GET', '**/assets?partyId=aaaaaaa-bbbb-aaaa-bbbb-aaaabbbbcccc&type=PARKINGPERMIT', mockAsset);

      cy.intercept('GET', '**/errands/*/history', mockHistory).as('getHistory');

      cy.visit(`/arende/${mockPTErrand_base.data.municipalityId}/${mockPTErrand_base.data.errandNumber}`);
      cy.wait('@getErrand');
      cy.get('.sk-cookie-consent-btn-wrapper').contains('Godkänn alla').click();
      cy.get('.sk-tabs .sk-menubar button')
        .eq(2)
        .should('have.text', `Bilagor (${mockAttachments.data.length})`)
        .click({ force: true });
    });

    it('shows the correct attachment information', () => {
      cy.get('[data-cy="casedataAttachments-list"] .attachment-item').should(
        'have.length',
        mockAttachments.data.length
      );
    });

    it('Can handle attachment alternatives', () => {
      mockAttachments.data.forEach((attachment) => {
        cy.intercept(
          'GET',
          `**/casedata/${mockPTErrand_base.data.municipalityId}/attachments/${attachment.id}`,
          attachment
        ).as('getAttachment');
        cy.intercept(
          'DELETE',
          `**/casedata/${mockPTErrand_base.data.municipalityId}/errands/442/attachments/${attachment.id}`,
          attachment
        ).as('deleteAttachment');
        cy.intercept(
          'PATCH',
          `**/casedata/${mockPTErrand_base.data.municipalityId}/errands/*/attachments/${attachment.id}`,
          attachment
        ).as('patchAttachment');
        cy.intercept('GET', '**/errand/442*', mockPTErrand_base).as('getErrandAgain');
        cy.get(`[data-cy="attachment-${attachment.id}"]`).should('exist');

        cy.get(`[data-cy="attachment-${attachment.id}"] [aria-label="Alternativ"]`)
          .should('exist')
          .click({ force: true });
        //Can open attachment
        cy.get(`[data-cy="open-attachment-${attachment.id}"]`).should('exist').contains('Öppna').click();
        if (imageMimeTypes.find((type) => type === attachment.mimeType)) {
          cy.wait('@getAttachment');
          cy.get('img').should('exist');
          cy.get('.modal-close-btn').should('exist').click();
        }
        cy.get(`[data-cy="attachment-${attachment.id}"] [aria-label="Alternativ"]`)
          .should('exist')
          .click({ force: true });
        //Can edit attachment
        cy.get(`[data-cy="edit-attachment-${attachment.id}"]`).should('exist').contains('Ändra').click();
        cy.get('[data-cy="edit-filename-input"]').should('exist').clear().type('dokument.pdf');
        cy.get('select[data-cy="attachmentType"]').should('exist').select('Läkarintyg');
        cy.get('.sk-modal-footer button.sk-btn-primary').should('exist').contains('Spara').click();
        cy.wait('@patchAttachment');
        cy.get(`[data-cy="attachment-${attachment.id}"] [aria-label="Alternativ"]`)
          .should('exist')
          .click({ force: true });
        //Can delete attachment
        cy.get(`[data-cy="delete-attachment-${attachment.id}"]`).should('exist').contains('Ta bort').click();
        cy.get('.sk-modal-dialog button.sk-btn-secondary').should('exist').contains('Nej');
        cy.get('.sk-modal-dialog button.sk-btn-primary').should('exist').contains('Ja').click();
        cy.wait('@deleteAttachment');
        cy.wait('@getErrandAgain');
      });
    });

    it('Can upload attachment/attachments', () => {
      cy.intercept('POST', `**/casedata/${mockPTErrand_base.data.municipalityId}/attachments`, 'attachment.txt').as(
        'uploadAttachment'
      );
      cy.intercept('GET', '**/errand/442*', mockPTErrand_base).as('getErrandAfterUpload');
      cy.get('[data-cy="add-attachment-button"]').should('exist').contains('Ladda upp bilaga').click();
      cy.get('[data-cy="browse-button"]').should('exist').contains('Bläddra').click();
      //if empty file
      cy.get('input[type=file]').selectFile('cypress/e2e/case-data/files/empty-attachment.txt', { force: true });
      cy.get('.sk-form-error-message').should('have.text', 'Bilagan du försöker lägga till är tom. Försök igen.');

      //if wrong format file
      cy.get('input[type=file]').selectFile('cypress/e2e/case-data/files/testwrongformat.jfif', { force: true });
      cy.get('.sk-form-error-message').should('have.text', 'Filtypen stöds inte.');

      // right format and not empty
      cy.get('input[type=file]').selectFile('cypress/e2e/case-data/files/attachment.txt', { force: true });
      cy.get('select[data-cy="attachmentType"]').should('exist').select('Läkarintyg');
      cy.get('.sk-modal-footer button.sk-btn-primary').should('exist').contains('Ladda upp').click();
      cy.wait('@uploadAttachment');
      cy.wait('@getErrandAfterUpload');
    });
  });
});
