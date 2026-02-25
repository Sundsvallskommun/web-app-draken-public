/// <reference types="cypress" />
import { onlyOn } from '@cypress/skip-test';
import { mockAdmins } from '../case-data/fixtures/mockAdmins';
import { mockMe } from '../case-data/fixtures/mockMe';
import { mockSupportAdminsResponse } from './fixtures/mockSupportAdmins';
import { mockMetaData } from './fixtures/mockMetadata';
import {
  mockDifferentUserSupportErrand,
  mockEmptySupportErrand,
  mockSaveFacilities,
  mockSupportAttachments,
  mockSupportErrand,
  mockSupportMessages,
} from './fixtures/mockSupportErrands';
import { mockAdressResponse, mockPersonIdResponse } from './fixtures/mockAdressResponse';
import { mockSidebarButtons } from './fixtures/mockSidebarButtons';
import { mockComments } from './fixtures/mockComments';
import { mockSupportHistory } from './fixtures/mockSupportHistory';
import { mockForwardSupportMessage } from './fixtures/mockForwardSupportMessage';
import { mockSetAdminResponse, mockSetSelfAssignAdminResponse } from './fixtures/mockSetAdminResponse';
import { mockConversations, mockConversationMessages } from './fixtures/mockConversations';
import { mockRelations } from './fixtures/mockRelations';

onlyOn(Cypress.env('application_name') === 'LOP', () => {
  describe('errand page', () => {
    beforeEach(() => {
      cy.intercept('GET', '**/administrators', mockAdmins);
      cy.intercept('GET', '**/users/admins', mockSupportAdminsResponse);
      cy.intercept('GET', '**/me', mockMe);
      cy.intercept('GET', '**/featureflags', []);
      cy.intercept('GET', '**/supportattachments/2281/errands/*/attachments', mockSupportAttachments).as(
        'getAttachments'
      );
      cy.intercept(
        'GET',
        `**/supportmessage/2281/errands/${mockSupportErrand.id}/communication`,
        mockSupportMessages
      ).as('getMessages');
      cy.intercept('GET', `**/supportnotes/2281/${mockSupportErrand.id}`, mockComments).as('getNotes');
      cy.intercept('POST', `**/supportnotes/2281/${mockSupportErrand.id}`, mockComments).as('addNote');
      cy.intercept('GET', `**/supporthistory/2281/${mockSupportErrand.id}`, mockSupportHistory).as('getHistory');
      cy.intercept('GET', '**/supportmetadata/2281', mockMetaData).as('getSupportMetadata');
      cy.intercept('POST', `**/personid`, mockPersonIdResponse).as('getPersonId');
      cy.intercept('POST', `**/address`, mockAdressResponse).as('getAddress');
      cy.intercept('PATCH', `**/supporterrands/2281/${mockEmptySupportErrand.id}`, mockEmptySupportErrand).as(
        'updateErrand'
      );
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
      cy.intercept('GET', `**/supporterrands/errandnumber/${mockSupportErrand.errandNumber}`, mockSupportErrand).as(
        'getErrand'
      );
      cy.intercept('PATCH', `**/supporterrands/2281/${mockSupportErrand.id}/admin`, mockSetAdminResponse).as(
        'setAdmin'
      );
      cy.intercept('POST', `**/supportmessage/2281/${mockSupportErrand.id}`, mockForwardSupportMessage).as(
        'postMessage'
      );
    });

    it('shows the correct base errand and sidebar main buttons', () => {
      cy.visit(`/arende/${mockSupportErrand.errandNumber}`);
      cy.wait('@getErrand');
      cy.get('.sk-cookie-consent-btn-wrapper').contains('Godkänn alla').click();

      cy.get('[data-cy="manage-sidebar"]').should('exist');
      cy.get(`[aria-label="${mockSidebarButtons[0].label}"]`).should('exist');
      cy.get(`[aria-label="${mockSidebarButtons[1].label}"]`).should('exist');
      cy.get(`[aria-label="${mockSidebarButtons[2].label}"]`).should('exist');
    });

    it('Can self assign errand', () => {
      cy.intercept(
        'GET',
        `**/supporterrands/errandnumber/${mockDifferentUserSupportErrand.errandNumber}`,
        mockDifferentUserSupportErrand
      ).as('getErrand');
      cy.intercept(
        'PATCH',
        `**/supporterrands/2281/${mockDifferentUserSupportErrand.id}/admin`,
        mockSetSelfAssignAdminResponse
      ).as('setAdmin');
      cy.visit(`/arende/${mockDifferentUserSupportErrand.errandNumber}`);
      cy.wait('@getErrand');
      cy.get('.sk-cookie-consent-btn-wrapper').contains('Godkänn alla').click();

      cy.get('[data-cy="self-assign-errand-button"]').should('exist').click();

      cy.wait('@setAdmin').then((interception) => {
        expect(interception?.response?.body.assignedUserId).to.equal('kctest');
        expect(interception?.response?.statusCode).to.eq(200);
      });
    });

    it('Can manage admin changes', () => {
      cy.visit(`/arende/${mockSupportErrand.errandNumber}`);
      cy.wait('@getErrand');
      cy.get('.sk-cookie-consent-btn-wrapper').contains('Godkänn alla').click();

      cy.get(`[data-cy="admin-input"]`).should('exist');
      cy.get(`[data-cy="admin-input"]`)
        .select(1)
        .should('have.value', `${mockSupportAdminsResponse.data[1].displayName}`);
      cy.get(`[data-cy="save-button"]`).should('exist').click();
      cy.wait('@setAdmin').then((interception) => {
        expect(interception?.request.body).to.deep.equal({
          assignedUserId: mockSupportAdminsResponse.data[1].name,
          status: 'ASSIGNED',
        });
        expect(interception?.response?.statusCode).to.eq(200);
      });
    });

    it('Can manage status and priority changes', () => {
      cy.visit(`/arende/${mockSupportErrand.errandNumber}`);
      cy.wait('@getErrand');
      cy.get('.sk-cookie-consent-btn-wrapper').contains('Godkänn alla').click();

      // Status
      cy.get(`[data-cy="status-input"]`).should('exist');
      cy.get(`[data-cy="status-input"]`).select('PENDING').should('have.value', `PENDING`);

      // Priority
      cy.get(`[data-cy="priority-input"]`).should('exist');
      cy.get(`[data-cy="priority-input"]`).select('LOW').should('have.value', `LOW`);
      cy.get(`[data-cy="save-button"]`).should('exist').click();

      cy.wait('@updateErrand').then((interception) => {
        expect(interception?.request.body.priority).to.eq('LOW');
        expect(interception?.request.body.status).to.eq('PENDING');
        expect(interception?.response?.statusCode).to.eq(200);
      });
    });

    it('Can manage forwarding, suspending and solving errand', () => {
      cy.visit(`/arende/${mockSupportErrand.errandNumber}`);
      cy.wait('@getErrand');
      cy.get('.sk-cookie-consent-btn-wrapper').contains('Godkänn alla').click();

      //Can forward the errand
      cy.intercept('POST', `**/supportmessage/2281/${mockSupportErrand.id}`, mockForwardSupportMessage).as(
        'postMessage'
      );
      cy.get(`[data-cy="forward-button"]`).should('exist').contains('Överlämna ärendet').click();

      cy.get(`article.sk-modal-dialog`).should('exist');

      cy.get('.sk-modal-dialog [data-cy="new-email-input"]').should('exist').type('test@test.se');
      cy.get('.sk-modal-dialog [data-cy="add-new-email-button"]').should('exist').click();

      cy.get('[data-cy="decision-richtext-wrapper"]').should('exist').contains('Hej,');

      cy.get('.sk-modal-dialog button.sk-btn-primary').should('exist').contains('Överlämna ärende').click();

      cy.get('.sk-dialog').should('exist').contains('Vill du överlämna ärendet?');
      cy.get('.sk-dialog .sk-btn-secondary').contains('Nej').should('exist');
      cy.get('.sk-dialog .sk-btn-primary').contains('Ja').should('exist').click();
      cy.wait('@postMessage');

      //Can suspend the errand
      cy.get(`[data-cy="suspend-button"]`).should('exist').contains('Parkera ärende').click();
      cy.get('.sk-modal-dialog').should('exist').contains('Parkera ärendet');
      cy.get('.sk-modal-dialog .sk-btn-primary').contains('Parkera ärende').click();
      const solveLables = [
        { label: 'Avslutat', id: 'SOLVED' },
        { label: 'Registrerat i annat system', id: 'REGISTERED_EXTERNAL_SYSTEM' },
        { label: 'Åter till chef', id: 'BACK_TO_MANAGER' },
        { label: 'Åter till HR', id: 'BACK_TO_HR' },
      ];

      //can change supportErrand to solved
      cy.get(`[data-cy="solved-button"]`).should('exist').contains('Avsluta ärende').click();
      cy.get('article.sk-modal-dialog').should('exist').contains('Välj en lösning');
      cy.get('[data-cy="solve-radiolist"] label').should('have.length', solveLables.length);
      cy.get('[data-cy="solve-radiolist"] label input').eq(1).should('have.value', solveLables[1].id).check();
      cy.get('article.sk-modal-dialog button.sk-btn-primary').contains('Avsluta ärende').should('exist').click();
    });

    // it('Resets suspendedFrom and suspendedTo when manually changing status from SUSPENDED', () => {
    //   cy.intercept('GET', '**/supporterrands/2281/c9a96dcb-24b1-479b-84cb-2cc0260bb490', {
    //     ...mockSupportErrand,
    //     status: 'SUSPENDED',
    //     suspension: {
    //       suspendedTo: '2024-12-12',
    //       suspendedFrom: '2024-08-12',
    //     },
    //   }).as('getErrand');
    //   cy.intercept(
    //     'PATCH',
    //     '**/supporterrands/2281/c9a96dcb-24b1-479b-84cb-2cc0260bb490/admin',
    //     mockSetAdminResponse
    //   ).as('setAdmin');
    //   cy.visit('/arende/c9a96dcb-24b1-479b-84cb-2cc0260bb490');
    //   cy.wait('@getErrand');
    //   cy.get('.sk-cookie-consent-btn-wrapper').contains('Godkänn alla').click();

    //   cy.get(`[data-cy="status-input"]`).select('ONGOING');
    //   cy.get(`[data-cy="save-button"]`).should('exist').click();

    //   cy.wait('@updateErrand').then((interception) => {
    //     expect(interception?.response?.statusCode).to.eq(200);
    //     cy.wrap(interception.request.body.suspension).should('exist');
    //     cy.wrap(Object.keys(interception.request.body.suspension)).should('have.length', 0);
    //     cy.wrap(JSON.stringify(interception.request.body.suspension)).should('equal', '{}');
    //   });
    // });

    it('Resets suspendedFrom and suspendedTo when reactivating errand', () => {
      cy.intercept('GET', `**/supporterrands/errandnumber/${mockSupportErrand.errandNumber}`, {
        ...mockSupportErrand,
        status: 'SUSPENDED',
        suspension: {
          suspendedTo: '2024-12-12',
          suspendedFrom: '2024-08-12',
        },
      }).as('getErrand');
      cy.visit(`/arende/${mockSupportErrand.errandNumber}`);
      cy.wait('@getErrand');
      cy.get('.sk-cookie-consent-btn-wrapper').contains('Godkänn alla').click();

      cy.get(`[data-cy="resume-button"]`).should('exist').click();
      cy.get('button').contains('Ja').should('exist').click();

      cy.wait('@updateErrand').then((interception) => {
        expect(interception?.response?.statusCode).to.eq(200);
        cy.wrap(interception.request.body.suspension).should('exist');
        cy.wrap(Object.keys(interception.request.body.suspension)).should('have.length', 0);
        cy.wrap(JSON.stringify(interception.request.body.suspension)).should('equal', '{}');
      });
    });

    it('Can manage Kommentarer', () => {
      const comment = 'En kommentar med text';
      const updatedComment = 'En uppdaterad kommentar med text';
      cy.visit(`/arende/${mockSupportErrand.errandNumber}`);
      cy.wait('@getErrand');
      cy.get('.sk-cookie-consent-btn-wrapper').contains('Godkänn alla').click();

      cy.intercept('POST', `**/supportnotes/2281/*`, comment).as('newComment');
      cy.intercept('PATCH', `**/supportnotes/2281/*/notes/*`, comment).as('updateComment');
      cy.intercept('DELETE', `**/supportnotes/2281/*/notes/*`, mockComments.notes[0].id).as('deleteComment');

      cy.get(`[aria-label="${mockSidebarButtons[1].label}"]`).should('exist').click();
      cy.get('[data-cy="noteslist"]').children('div').should('have.length', mockComments._meta.totalRecords);

      //New comment
      cy.get(`[aria-label="Ny kommentar"]`).should('exist').type(comment);

      cy.get(`[data-cy="save-newcomment"]`).should('exist').contains('Spara').click();
      cy.wait('@newComment').then((interception) => {
        expect(interception?.response?.statusCode).to.eq(200);
      });

      //Update comment
      cy.get(`[data-cy="options-${mockComments.notes[0].id}"]`).should('exist').click();
      cy.get(`[data-cy="edit-note-button"]`).contains('Ändra').should('exist').click();
      cy.get('[data-cy="edit-notes-input"]').should('exist').clear().type(updatedComment);
      cy.get(`[data-cy="save-updatedcomment"]`).contains('Spara').should('exist').click();

      cy.wait('@updateComment').then((interception) => {
        expect(interception?.response?.statusCode).to.eq(200);
      });

      //Delete comment
      cy.get(`[data-cy="options-${mockComments.notes[0].id}"]`).should('exist').click();
      cy.get(`[data-cy="delete-note-button"]`).contains('Ta bort').should('exist').click();
      cy.get('.sk-dialog').contains('Vill du ta bort kommentaren?').should('exist');
      cy.get('.sk-dialog .sk-btn-secondary').contains('Nej').should('exist');
      cy.get('.sk-dialog .sk-btn-primary').contains('Ja').should('exist').click();
      cy.wait('@deleteComment');
    });

    it('Can manage Ärendelogg', () => {
      cy.visit(`/arende/${mockSupportErrand.errandNumber}`);
      cy.wait('@getErrand');
      cy.get('.sk-cookie-consent-btn-wrapper').contains('Godkänn alla').click();

      cy.get(`[aria-label="${mockSidebarButtons[2].label}"]`).should('exist').click();
      cy.get('[data-cy="history-log"] div.sk-avatar').should('have.length', mockSupportHistory.totalElements);
      cy.get('[data-cy="history-log"] div button').first().click();
      cy.get('[data-cy="history-table-details-close-button"]').should('exist').contains('Stäng').click();
    });
  });
});
