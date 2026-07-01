/// <reference types="cypress" />
import { onlyOn } from '@cypress/skip-test';

import { mockAdmins } from '../case-data/fixtures/mockAdmins';
import { mockMe } from '../case-data/fixtures/mockMe';
import { mockConversationMessages, mockConversations } from '../lop/fixtures/mockConversations';
import { mockRelations } from '../lop/fixtures/mockRelations';
import { mockComments } from './fixtures/mockComments';
import { mockHandoverPreview, mockHandoverResult, mockNamespaceConfigs } from './fixtures/mockHandover';
import { mockMetaData } from './fixtures/mockMetadata';
import { mockStakeholderStatus } from './fixtures/mockStakeholderStatus';
import { mockSupportAdminsResponse } from './fixtures/mockSupportAdmins';
import { mockSupportAttachments, mockSupportErrand, mockSupportMessages } from './fixtures/mockSupportErrands';
import { mockSupportHistory } from './fixtures/mockSupportHistory';

onlyOn(Cypress.env('application_name') === 'KC', () => {
  describe('errand handover to another namespace', () => {
    beforeEach(() => {
      cy.intercept('GET', '**/administrators', mockAdmins);
      cy.intercept('GET', '**/users/admins', mockSupportAdminsResponse);
      cy.intercept('GET', '**/me', mockMe);
      cy.intercept('GET', '**/featureflags', []);
      cy.intercept('GET', '**/supportattachments/2281/errands/*/attachments', mockSupportAttachments).as('getAttachments');
      cy.intercept('GET', `**/supportmessage/2281/errands/${mockSupportErrand.id}/communication`, mockSupportMessages).as(
        'getMessages'
      );
      cy.intercept('GET', `**/supportnotes/2281/${mockSupportErrand.id}`, mockComments).as('getNotes');
      cy.intercept('GET', `**/supporthistory/2281/${mockSupportErrand.id}`, mockSupportHistory).as('getHistory');
      cy.intercept('GET', '**/supportmetadata/2281', mockMetaData).as('getSupportMetadata');
      cy.intercept('GET', '**/sourcerelations/**/**', mockRelations).as('getSourceRelations');
      cy.intercept('GET', '**/targetrelations/**/**', mockRelations).as('getTargetRelations');
      cy.intercept('GET', '**/namespace/errands/**/communication/conversations', mockConversations).as('getConversations');
      cy.intercept('GET', '**/errands/**/communication/conversations/*/messages', mockConversationMessages).as(
        'getConversationMessages'
      );
      cy.intercept('GET', '**/party/*/statuses', mockStakeholderStatus).as('getStakeholderStatuses');
      cy.intercept('GET', `**/supporterrands/errandnumber/${mockSupportErrand.errandNumber}`, mockSupportErrand).as('getErrand');
      // Refetch of the (now closed) source errand after a successful handover, mirroring MEX.
      cy.intercept('GET', `**/supporterrands/2281/${mockSupportErrand.id}`, mockSupportErrand).as('getErrandById');

      // Handover-specific endpoints
      cy.intercept('GET', '**/supportnamespaceconfigs/2281', mockNamespaceConfigs).as('getNamespaceConfigs');
      cy.intercept('GET', '**/supportnamespacemetadata/2281/*', {}).as('getNamespaceMetadata');
      cy.intercept('POST', `**/supporterrands/2281/${mockSupportErrand.id}/handover/preview`, mockHandoverPreview).as(
        'getHandoverPreview'
      );
      cy.intercept('POST', `**/supporterrands/2281/${mockSupportErrand.id}/handover`, {
        statusCode: 201,
        body: mockHandoverResult,
      }).as('executeHandover');
    });

    it('hands over the errand to another namespace and opens the new errand', () => {
      cy.visit('/arende/KC-00000001');
      cy.wait('@getErrand');
      cy.wait('@getNamespaceConfigs');
      cy.get('.sk-cookie-consent-btn-wrapper').contains('Godkänn alla').click();

      // Step 1 – open modal, choose "Draken" and pick the target namespace (where MEX is also listed).
      cy.get(`[data-cy="forward-button"]`).should('exist').contains('Överlämna ärendet').click();
      cy.get(`article.sk-modal-dialog`).should('exist');
      cy.get('.sk-modal-dialog [type="radio"]').eq(0).should('have.value', 'DEPARTMENT').check();
      // Selecting the namespace triggers the preview automatically (no "Nästa" click).
      cy.get('.sk-modal-dialog [data-cy="resolution-input"]').should('exist').select('ROB');
      cy.wait('@getHandoverPreview');

      // Step 2 – review renders all sections; auto-suggestions are preselected.
      cy.get('[data-cy="handover-review"]').should('exist');
      cy.get('[data-cy="handover-autocopy"]').should('exist');
      cy.get('[data-cy="handover-category-select"]').should('have.value', 'ADMINISTRATION');
      cy.get('[data-cy="handover-type-select"]').should('have.value', 'GENERAL');
      cy.get('[data-cy="handover-contactreason-select"]').should('have.value', 'Allmän fråga');
      cy.get('[data-cy="handover-review"]').contains('Auto-förslag');
      cy.get('[data-cy="handover-warning"]').should('exist');

      // Step 2 -> execute. Required mappings are answered (suggestions), so the button is enabled.
      // Same label + confirmation dialog as the MEX forward.
      cy.get('[data-cy="handover-submit-button"]').should('not.be.disabled').contains('Överlämna ärendet').click();
      cy.get('.sk-dialog').should('exist').contains('Vill du överlämna ärendet?');
      cy.get('.sk-dialog .sk-btn-primary').contains('Ja').click();
      cy.wait('@executeHandover').then((interception) => {
        // The frontend must send a stable idempotency key so retries don't create duplicate errands.
        expect(interception?.request.headers).to.have.property('idempotency-key');
        expect(interception?.request.body.target.namespace).to.eq('ROB');
        expect(interception?.response?.statusCode).to.eq(201);
      });

      // Like the MEX forward: the modal closes after a successful handover (no in-modal success view).
      cy.get('article.sk-modal-dialog').should('not.exist');
    });
  });
});
