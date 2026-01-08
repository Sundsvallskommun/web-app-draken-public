/// <reference types="cypress" />
import { onlyOn } from '@cypress/skip-test';
import { mockAdmins } from '../case-data/fixtures/mockAdmins';
import { mockMe } from '../case-data/fixtures/mockMe';
import { mockSupportAdminsResponse } from './fixtures/mockSupportAdmins';
import { mockMetaData } from './fixtures/mockMetadata';
import {
  mockDifferentUserSupportErrand,
  mockEmptySupportErrand,
  mockSupportAttachments,
  mockSupportErrand,
  mockSupportMessages,
} from './fixtures/mockSupportErrands';
import { mockAdressResponse, mockPersonIdResponse } from './fixtures/mockAdressResponse';
import { mockSidebarButtons } from './fixtures/mockSidebarButtons';
import { mockComments } from './fixtures/mockComments';
import { mockSupportHistory } from './fixtures/mockSupportHistory';
import { mockForwardSupportErrandToMEX, mockForwardSupportMessage } from './fixtures/mockForwardSupportMessage';
import { mockSetAdminResponse, mockSetSelfAssignAdminResponse } from './fixtures/mockSetAdminResponse';
//TODO: Update mockdata
import { mockRelations } from '../lop/fixtures/mockRelations';
import { mockConversationMessages, mockConversations } from '../lop/fixtures/mockConversations';
import { mockStakeholderStatus } from './fixtures/mockStakeholderStatus';

onlyOn(Cypress.env('application_name') === 'KC', () => {
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
        '**/supportmessage/2281/errands/c9a96dcb-24b1-479b-84cb-2cc0260bb490/communication',
        mockSupportMessages
      ).as('getMessages');
      cy.intercept('GET', '**/supportnotes/2281/c9a96dcb-24b1-479b-84cb-2cc0260bb490', mockComments).as('getNotes');
      cy.intercept('POST', '**/supportnotes/2281/c9a96dcb-24b1-479b-84cb-2cc0260bb490', mockComments).as('addNote');
      cy.intercept('GET', '**/supporthistory/2281/c9a96dcb-24b1-479b-84cb-2cc0260bb490', mockSupportHistory).as(
        'getHistory'
      );
      cy.intercept('GET', '**/supportmetadata/2281', mockMetaData).as('getSupportMetadata');
      cy.intercept('POST', `**/personid`, mockPersonIdResponse).as('getPersonId');
      cy.intercept('POST', `**/address`, mockAdressResponse).as('getAddress');
      cy.intercept('PATCH', `**/supporterrands/2281/${mockEmptySupportErrand.id}`, mockEmptySupportErrand).as(
        'updateErrand'
      );
      cy.intercept('POST', `**/supporterrands/2281/${mockEmptySupportErrand.id}/forward`, mockEmptySupportErrand).as(
        'forwardErrand'
      );
      cy.intercept('GET', '**/sourcerelations/**/**', mockRelations).as('getSourceRelations');
      cy.intercept('GET', '**/targetrelations/**/**', mockRelations).as('getTargetRelations');
      cy.intercept('GET', '**/namespace/errands/**/communication/conversations', mockConversations).as(
        'getConversations'
      );
      cy.intercept('GET', '**/errands/**/communication/conversations/*/messages', mockConversationMessages).as(
        'getConversationMessages'
      );
      cy.intercept('GET', '**/party/*/statuses', mockStakeholderStatus).as('getStakeholderStatuses');
    });

    it('shows the correct base errand and sidebar main buttons', () => {
      cy.intercept('GET', '**/supporterrands/2281/c9a96dcb-24b1-479b-84cb-2cc0260bb490', mockSupportErrand).as(
        'getErrand'
      );
      cy.visit('/arende/2281/c9a96dcb-24b1-479b-84cb-2cc0260bb490');
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
        '**/supporterrands/2281/c9a96dcb-24b1-479b-84cb-2cc0260bb490',
        mockDifferentUserSupportErrand
      ).as('getErrand');
      cy.intercept(
        'PATCH',
        '**/supporterrands/2281/c9a96dcb-24b1-479b-84cb-2cc0260bb490/admin',
        mockSetSelfAssignAdminResponse
      ).as('setAdmin');
      cy.visit('/arende/2281/c9a96dcb-24b1-479b-84cb-2cc0260bb490');
      cy.wait('@getErrand');
      cy.get('.sk-cookie-consent-btn-wrapper').contains('Godkänn alla').click();

      cy.get('[data-cy="self-assign-errand-button"]').should('exist').click();

      cy.wait('@setAdmin').then((interception) => {
        expect(interception?.response?.body?.assignedUserId).to.equal('kctest');
        expect(interception?.response?.statusCode).to.eq(200);
      });
    });

    it('Can manage admin changes', () => {
      cy.intercept('GET', '**/supporterrands/2281/c9a96dcb-24b1-479b-84cb-2cc0260bb490', mockSupportErrand).as(
        'getErrand'
      );
      cy.intercept(
        'PATCH',
        '**/supporterrands/2281/c9a96dcb-24b1-479b-84cb-2cc0260bb490/admin',
        mockSetAdminResponse
      ).as('setAdmin');
      cy.visit('/arende/2281/c9a96dcb-24b1-479b-84cb-2cc0260bb490');
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
      cy.intercept('GET', '**/supporterrands/2281/c9a96dcb-24b1-479b-84cb-2cc0260bb490', mockSupportErrand).as(
        'getErrand'
      );
      cy.intercept(
        'PATCH',
        '**/supporterrands/2281/c9a96dcb-24b1-479b-84cb-2cc0260bb490/admin',
        mockSetAdminResponse
      ).as('setAdmin');
      cy.visit('/arende/2281/c9a96dcb-24b1-479b-84cb-2cc0260bb490');
      cy.wait('@getErrand');
      cy.get('.sk-cookie-consent-btn-wrapper').contains('Godkänn alla').click();

      // Status
      cy.get(`[data-cy="status-input"]`).should('exist');
      cy.get(`[data-cy="status-input"]`).select('PENDING').should('have.value', 'PENDING');

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

    it('Can forward department errand', () => {
      cy.intercept('GET', '**/supporterrands/2281/c9a96dcb-24b1-479b-84cb-2cc0260bb490', mockSupportErrand).as(
        'getErrand'
      );
      cy.intercept(
        'PATCH',
        '**/supporterrands/2281/c9a96dcb-24b1-479b-84cb-2cc0260bb490/admin',
        mockSetAdminResponse
      ).as('setAdmin');
      cy.visit('/arende/2281/c9a96dcb-24b1-479b-84cb-2cc0260bb490');
      cy.wait('@getErrand');
      cy.get('.sk-cookie-consent-btn-wrapper').contains('Godkänn alla').click();

      cy.intercept('POST', `**/supportmessage/2281/c9a96dcb-24b1-479b-84cb-2cc0260bb490`, mockForwardSupportMessage).as(
        'postMessage'
      );
      cy.get('[data-cy="save-button"]').contains('Spara ärende').should('exist').click();
      cy.get(`[data-cy="forward-button"]`).should('exist').contains('Överlämna ärendet').click();

      cy.get(`article.sk-modal-dialog`).should('exist');

      cy.get('.sk-modal-dialog [type="radio"]').eq(1).should('have.value', 'EMAIL').check();
      cy.get('.sk-modal-dialog [data-cy="email-tag-0"]').should('not.exist');

      cy.get('.sk-modal-dialog [type="radio"]').eq(0).should('have.value', 'DEPARTMENT').check();
      cy.get('.sk-modal-dialog [data-cy="resolution-input"]').should('exist').select(0);

      cy.get('[data-cy="decision-richtext-wrapper"]').should('exist').contains('Hej,');

      cy.get('.sk-modal-dialog button.sk-btn-primary').should('exist').contains('Överlämna ärendet').click();

      cy.get('.sk-dialog').should('exist').contains('Vill du överlämna ärendet?');
      cy.get('.sk-dialog .sk-btn-secondary').contains('Nej').should('exist');
      cy.get('.sk-dialog .sk-btn-primary').contains('Ja').should('exist').click();
      cy.wait('@forwardErrand');
    });

    it('Can forward email errand', () => {
      cy.intercept('GET', '**/supporterrands/2281/c9a96dcb-24b1-479b-84cb-2cc0260bb490', mockSupportErrand).as(
        'getErrand'
      );
      cy.intercept(
        'PATCH',
        '**/supporterrands/2281/c9a96dcb-24b1-479b-84cb-2cc0260bb490/admin',
        mockSetAdminResponse
      ).as('setAdmin');
      cy.visit('/arende/2281/c9a96dcb-24b1-479b-84cb-2cc0260bb490');
      cy.wait('@getErrand');
      cy.get('.sk-cookie-consent-btn-wrapper').contains('Godkänn alla').click();

      cy.intercept('POST', `**/supportmessage/2281/c9a96dcb-24b1-479b-84cb-2cc0260bb490`, mockForwardSupportMessage).as(
        'postMessage'
      );
      cy.get('[data-cy="save-button"]').contains('Spara ärende').should('exist').click();
      cy.get(`[data-cy="forward-button"]`).should('exist').contains('Överlämna ärendet').click();

      cy.get(`article.sk-modal-dialog`).should('exist');

      cy.get('.sk-modal-dialog [type="radio"]').eq(0).should('have.value', 'DEPARTMENT').check();
      cy.get('.sk-modal-dialog [data-cy="resolution-input"]').should('exist').select(0);
      cy.get('.sk-modal-dialog [type="radio"]').eq(1).should('have.value', 'EMAIL').check();
      cy.get('.sk-modal-dialog [data-cy="new-email-input"]').should('exist').type('test@test.se');
      cy.get('.sk-modal-dialog [data-cy="add-new-email-button"]').should('exist').click();

      cy.get('[data-cy="decision-richtext-wrapper"]').should('exist').contains('Hej,');

      cy.get('.sk-modal-dialog button.sk-btn-primary').should('exist').contains('Överlämna ärendet').click();

      cy.get('.sk-dialog').should('exist').contains('Vill du överlämna ärendet?');
      cy.get('.sk-dialog .sk-btn-secondary').contains('Nej').should('exist');
      cy.get('.sk-dialog .sk-btn-primary').contains('Ja').should('exist').click();
      cy.wait('@postMessage');
    });

    it('Can manage forwarding, suspending and solving errand', () => {
      cy.intercept('GET', '**/supporterrands/2281/c9a96dcb-24b1-479b-84cb-2cc0260bb490', mockSupportErrand).as(
        'getErrand'
      );
      cy.intercept(
        'PATCH',
        '**/supporterrands/2281/c9a96dcb-24b1-479b-84cb-2cc0260bb490/admin',
        mockSetAdminResponse
      ).as('setAdmin');
      cy.visit('/arende/2281/c9a96dcb-24b1-479b-84cb-2cc0260bb490');
      cy.wait('@getErrand');
      cy.get('.sk-cookie-consent-btn-wrapper').contains('Godkänn alla').click();

      //Can forward the errand
      cy.intercept('POST', `**/supportmessage/2281/c9a96dcb-24b1-479b-84cb-2cc0260bb490`, mockForwardSupportMessage).as(
        'postMessage'
      );
      cy.get('[data-cy="save-button"]').contains('Spara ärende').should('exist').click();
      cy.get(`[data-cy="forward-button"]`).should('exist').contains('Överlämna ärendet').click();

      cy.get(`article.sk-modal-dialog`).should('exist');

      cy.get('.sk-modal-dialog [type="radio"]').eq(0).should('have.value', 'DEPARTMENT').check();
      cy.get('.sk-modal-dialog [data-cy="resolution-input"]').should('exist').select(0);
      cy.get('.sk-modal-dialog [type="radio"]').eq(1).should('have.value', 'EMAIL').check();
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
        { label: 'Hänvisat att återkomma', id: 'REFERRED_TO_RETURN' },
        { label: 'Hänvisat till intern service', id: 'INTERNAL_SERVICE' },
        { label: 'Hänvisat till självservice', id: 'SELF_SERVICE' },
        { label: 'Kopplat samtal', id: 'CONNECTED' },
        { label: 'Löst av Kontakt Sundsvall', id: 'SOLVED' },
        { label: 'Registrerat i annat system', id: 'REGISTERED_EXTERNAL_SYSTEM' },
        { label: 'SecureAppbox', id: 'SECURE_APPBOX' },
      ];

      //can change supportErrand to solved
      cy.get(`[data-cy="solved-button"]`).should('exist').contains('Avsluta ärende').click();
      cy.get('article.sk-modal-dialog').should('exist').contains('Välj en lösning');
      cy.get('[data-cy="solve-radiolist"] label').should('have.length', solveLables.length);
      cy.get('[data-cy="solve-radiolist"] label input').eq(1).should('have.value', solveLables[1].id).check();
      cy.get('article.sk-modal-dialog button.sk-btn-primary').contains('Avsluta ärende').should('exist').click();
    });

    it('Can manage Kommentarer', () => {
      const comment = 'En kommentar med text';
      const updatedComment = 'En uppdaterad kommentar med text';
      cy.intercept('GET', '**/supporterrands/2281/c9a96dcb-24b1-479b-84cb-2cc0260bb490', mockSupportErrand).as(
        'getErrand'
      );
      cy.visit('/arende/2281/c9a96dcb-24b1-479b-84cb-2cc0260bb490');
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
      cy.intercept('GET', '**/supporterrands/2281/c9a96dcb-24b1-479b-84cb-2cc0260bb490', mockSupportErrand).as(
        'getErrand'
      );
      cy.visit('/arende/2281/c9a96dcb-24b1-479b-84cb-2cc0260bb490');
      cy.wait('@getErrand');
      cy.get('.sk-cookie-consent-btn-wrapper').contains('Godkänn alla').click();

      cy.get(`[aria-label="${mockSidebarButtons[2].label}"]`).should('exist').click();
      cy.get('[data-cy="history-log"] div.sk-avatar').should('have.length', mockSupportHistory.totalElements);
      cy.get('[data-cy="history-log"] div button').first().click();
      cy.get('[data-cy="history-table-details-close-button"]').should('exist').contains('Stäng').click();
    });

    it('Can manage Vidarebefodra', () => {
      cy.intercept('GET', '**/supporterrands/2281/c9a96dcb-24b1-479b-84cb-2cc0260bb490', mockSupportErrand).as(
        'getErrand'
      );
      cy.visit('/arende/2281/c9a96dcb-24b1-479b-84cb-2cc0260bb490');
      cy.wait('@getErrand');
      cy.get('.sk-cookie-consent-btn-wrapper').contains('Godkänn alla').click();

      cy.intercept(
        'POST',
        `**/supporterrands/2281/c9a96dcb-24b1-479b-84cb-2cc0260bb490/forward`,
        mockForwardSupportErrandToMEX
      ).as('postMessage');

      cy.get('[data-cy="save-button"]').contains('Spara ärende').should('exist').click();
      cy.get(`[data-cy="forward-button"]`).should('exist').contains('Överlämna ärendet').click();
      cy.get('.sk-modal-dialog [type="radio"]').eq(0).should('have.value', 'DEPARTMENT').check();
      cy.get('[data-cy="resolution-input"]').should('exist').select('Mark och exploatering (MEX)');
      cy.get('[data-cy="decision-richtext-wrapper"]').should('exist').contains('Hej,');

      cy.get('.sk-modal-dialog button.sk-btn-primary').should('exist').contains('Överlämna ärende').click();

      cy.get('.sk-dialog').should('exist').contains('Vill du överlämna ärendet?');
      cy.get('.sk-dialog .sk-btn-secondary').contains('Nej').should('exist');
      cy.get('.sk-dialog .sk-btn-primary').contains('Ja').should('exist').click();
      cy.wait('@postMessage').then(({ request }) => {
        expect(request.body.department).to.equal('MEX');
        expect(request.body.recipient).to.equal('DEPARTMENT');
      });
      cy.wait('@getErrand');
    });
  });
});
