/// <reference types="cypress" />

import { onlyOn } from '@cypress/skip-test';
import { mockAttachments } from 'cypress/e2e/case-data/fixtures/mockAttachments';
import { mockHistory } from 'cypress/e2e/case-data/fixtures/mockHistory';
import { mockMexErrand_base } from '../fixtures/mockMexErrand';
import { mockPersonId } from 'cypress/e2e/case-data/fixtures/mockPersonId';
import { mockAdmins } from '../fixtures/mockAdmins';
import { mockMe } from '../fixtures/mockMe';
import { mockMessages } from '../fixtures/mockMessages';
import { imageMimeTypes } from '@common/components/file-upload/file-upload.component';
import { mockLeaseAgreement, mockContractAttachment } from '../fixtures/mockContract';

onlyOn(Cypress.env('application_name') === 'MEX', () => {
  describe('Errand page attachments tab', () => {
    beforeEach(() => {
      cy.intercept('GET', '**/messages/MEX-2024-000280*', mockMessages);
      cy.intercept('GET', '**/users/admins', mockAdmins);
      cy.intercept('GET', '**/me', mockMe);
      cy.intercept('POST', '**/personid', mockPersonId);
      cy.intercept('GET', /\/errand\/\d*/, mockMexErrand_base).as('getErrandById');
      cy.intercept('GET', /\/errand\/\d+\/attachments$/, mockAttachments).as('getErrandAttachments');
      cy.intercept('PATCH', '**/errands/*', { data: 'ok', message: 'ok' }).as('patchErrand');
      cy.intercept('GET', '**/errand/errandNumber/*', mockMexErrand_base).as('getErrand');
      cy.intercept('POST', '**/stakeholders/personNumber', mockMexErrand_base.data.stakeholders);
      cy.intercept(
        'GET',
        '**/contract/2024-01026',
        mockMexErrand_base.data.extraParameters.find((param) => param.key === 'contractId')?.values[0]
      ).as('getContract');
      cy.intercept('GET', '**/errands/*/history', mockHistory).as('getHistory');
      cy.intercept('GET', /\/errand\/\d+\/messages$/, mockMessages);

      cy.intercept('GET', '**/contracts/2024-01026', mockLeaseAgreement).as('getContract');
      cy.intercept('GET', '**/contracts/2281/2024-01026/attachments/1', mockContractAttachment).as(
        'getContractAttachment'
      );

      cy.visit(`/arende/${mockMexErrand_base.data.municipalityId}/${mockMexErrand_base.data.id}`);
      cy.wait('@getErrand');
      cy.get('.sk-cookie-consent-btn-wrapper').contains('Godkänn alla').click();
      cy.get('.sk-tabs-list button')
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
        cy.intercept('GET', `**/casedata/2281/errands/101/attachments/${attachment.id}`, attachment).as(
          'getAttachment'
        );
        cy.intercept('DELETE', `**/casedata/2281/errands/101/attachments/${attachment.id}`, attachment).as(
          'deleteAttachment'
        );
        cy.intercept('PATCH', `**/casedata/2281/errands/*/attachments/${attachment.id}`, attachment).as(
          'patchAttachment'
        );
        cy.intercept('GET', '**/errand/101*', mockMexErrand_base).as('getErrandAgain');
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
        cy.get('select[data-cy="attachmentType"]').should('exist').select('Förfrågan markköp');
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
      cy.intercept('POST', `**/casedata/2281/errands/101/attachments`, 'attachment.txt').as('uploadAttachment');
      cy.intercept('GET', '**/errand/101*', mockMexErrand_base).as('getErrandAfterUpload');
      cy.get('[data-cy="add-attachment-button"]').should('exist').contains('Ladda upp bilaga').click();
      cy.get('[data-cy="dragdrop-upload"]').should('exist').contains('klicka för att bläddra på din enhet').click();
      //if empty file
      cy.get('input[type=file]').selectFile('cypress/e2e/case-data/files/empty-attachment.txt', { force: true });
      cy.get('.sk-form-error-message').should('have.text', 'Bilagan du försöker lägga till är tom. Försök igen.');

      //if wrong format file
      cy.get('input[type=file]').selectFile('cypress/e2e/case-data/files/testwrongformat.jfif', { force: true });
      cy.get('.sk-form-error-message').should('have.text', 'Filtypen stöds inte.');

      // right format and not empty
      cy.get('input[type=file]').selectFile('cypress/e2e/case-data/files/attachment.txt', { force: true });
      cy.get('select[data-cy="attachmentType"]').should('exist').select('Förfrågan markköp');
      cy.get('.sk-modal-footer button.sk-btn-primary').should('exist').contains('Ladda upp').click();
      cy.wait('@uploadAttachment');
      cy.wait('@getErrandAfterUpload');
    });
  });
});
