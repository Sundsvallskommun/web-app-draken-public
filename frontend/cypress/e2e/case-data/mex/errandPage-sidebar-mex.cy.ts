/// <reference types="cypress" />

import { appConfig } from '@config/appconfig';
import { onlyOn } from '@cypress/skip-test';
import { mockAddress } from 'cypress/e2e/case-data/fixtures/mockAddress';
import { mockAttachments } from 'cypress/e2e/case-data/fixtures/mockAttachments';
import { mockHistory } from 'cypress/e2e/case-data/fixtures/mockHistory';
import { mockPersonId } from 'cypress/e2e/case-data/fixtures/mockPersonId';
import { mockAdmins } from '../fixtures/mockAdmins';
import { mockContract } from '../fixtures/mockContract';
import { mockMe } from '../fixtures/mockMe';
import { mockMessages } from '../fixtures/mockMessages';
import { mockMexErrand_base } from '../fixtures/mockMexErrand';
import { mockSidebarButtons } from '../fixtures/mockSidebarButtons';
import { mockRelations } from '../fixtures/mockRelations';
import { mockConversationMessages, mockConversations } from '../fixtures/mockConversations';
import { mockAsset } from '../fixtures/mockAsset';
import { mockJsonSchema } from '../fixtures/mockJsonSchema';

onlyOn(Cypress.env('application_name') === 'MEX', () => {
  describe('Errand page', () => {
    beforeEach(() => {
      cy.intercept('GET', '**/messages/*', mockMessages);
      cy.intercept('POST', '**/messages', mockMessages);
      cy.intercept('POST', '**/personid', mockPersonId);
      cy.intercept('GET', '**/users/admins', mockAdmins);
      cy.intercept('GET', '**/me', mockMe).as('mockMe');
      cy.intercept('GET', /\/errand\/\d*/, mockMexErrand_base).as('getErrandById');
      cy.intercept('GET', /\/errand\/\d+\/attachments$/, mockAttachments).as('getErrandAttachments');
      cy.intercept('GET', '**/errands/*/history', mockHistory).as('getHistory');
      cy.intercept('POST', '**/address', mockAddress).as('postAddress');
      cy.intercept('GET', '**/**/stakeholders/**', mockMexErrand_base.data.stakeholders);
      cy.intercept('DELETE', '**/**/stakeholders/**', mockMexErrand_base.data.stakeholders);
      cy.intercept('GET', '**/errand/errandNumber/*', mockMexErrand_base).as('getErrand');
      cy.intercept('GET', '**/assets?**', mockAsset);
      cy.intercept('POST', '**/errands/*/facilities', mockMexErrand_base);

      cy.intercept('POST', '**/stakeholders/**', mockMexErrand_base.data.stakeholders);
      cy.intercept('GET', '**/contract/2024-01026', mockContract).as('getContract');

      cy.intercept('GET', '**/errand/errandNumber/*', mockMexErrand_base).as('getErrand');
      cy.intercept('GET', '**/sourcerelations/**/**', mockRelations).as('getSourceRelations');
      cy.intercept('GET', '**/targetrelations/**/**', mockRelations).as('getTargetRelations');
      cy.intercept('GET', '**/namespace/errands/**/communication/conversations', mockConversations).as(
        'getConversations'
      );
      cy.intercept('GET', '**/errands/**/communication/conversations/*/messages', mockConversationMessages).as(
        'getConversationMessages'
      );
      cy.intercept('PATCH', '**/errands/101', { data: 'ok', message: 'ok' }).as('patchErrand');
      cy.intercept('PATCH', '**/errands/**/extraparameters', { data: [], message: 'ok' }).as('saveExtraParameters');
      cy.intercept('GET', '**/metadata/jsonschemas/FTErrandAssets/latest', mockJsonSchema).as('getJsonSchema');

      cy.visit('/arende/2281/MEX-2024-000280');
      cy.wait('@getErrand');
      cy.get('.sk-cookie-consent-btn-wrapper').contains('Godkänn alla').click();
    });

    it('shows the correct sidebar main buttons', () => {
      cy.get('[data-cy="manage-sidebar"]').should('exist');
      cy.get(`[aria-label="${mockSidebarButtons[0].label}"]`).should('exist');
      cy.get(`[aria-label="${mockSidebarButtons[1].label}"]`).should('exist');
      cy.get(`[aria-label="${mockSidebarButtons[2].label}"]`).should('exist');
      cy.get(`[aria-label="${mockSidebarButtons[3].label}"]`).should('exist');
      cy.get(`[aria-label="${mockSidebarButtons[4].label}"]`).should('exist');
      cy.get(`[aria-label="${mockSidebarButtons[5].label}"]`).should('exist');
    });

    it('manages Administrators', () => {
      cy.intercept('PATCH', '**/errands/*/stakeholders', mockMexErrand_base.data.stakeholders).as('patchStakeholders');
      cy.intercept('PATCH', '**/errands/*', mockMexErrand_base).as('patchErrand');

      cy.get(`[aria-label="${mockSidebarButtons[0].label}"]`).should('exist');
      cy.get('[data-cy="admin-input"]').should('exist').select('Testhandläggare Katarina');
      cy.get('[data-cy="save-and-continue-button"]').should('exist').contains('Spara ärende').click();

      cy.wait('@patchStakeholders').should(({ request }) => {
        expect(request.body.adAccount).to.equal('TESTADMIN1');
      });
    });

    it('manages Status', () => {
      cy.intercept('PATCH', '**/errands/*', mockMexErrand_base).as('patchErrand');

      cy.get(`[aria-label="${mockSidebarButtons[0].label}"]`).should('exist');

      cy.get('[data-cy="status-input"]').should('exist').should('not.be.disabled').select(1);
      cy.get('[data-cy="save-and-continue-button"]').should('exist').contains('Spara ärende').click();
      cy.get('[data-cy="status-input"]').should('exist').contains('Väntar på komplettering');
      cy.wait('@patchErrand').should(({ request }) => {
        expect(request.body.status.statusType).to.equal('Väntar på komplettering');
      });
    });

    it('manages Notes', () => {
      cy.intercept('PATCH', '**/errands/*/notes', mockMexErrand_base.data.stakeholders).as('patchNotes');

      cy.get(`[aria-label="${mockSidebarButtons[1].label}"]`).should('exist').click();
      cy.get('[data-cy="notes-wrapper"]')
        .should('exist')
        .children()
        .each((item, index) => {
          if (index < mockMexErrand_base.data.notes.filter((note) => note.noteType === 'PUBLIC').length) {
            cy.get(`[data-cy="note-${index}"]`)
              .should('exist')
              .within(() => {
                cy.get('.sk-avatar').should('exist');
                cy.get('[data-cy="note-text"]').should('exist').contains('Mock note');
              });
          }
        });
      cy.get('[data-cy="PUBLIC-note-input"]').should('exist').type('Mock note', { delay: 100 });
      cy.get('[data-cy="save-PUBLIC-note-button"]').should('exist').click();

      cy.wait('@patchNotes').should(({ request }) => {
        expect(request.body.text).to.equal('Mock note');
        expect(request.body.noteType).to.equal('PUBLIC');
      });
    });

    it('manages Comments', () => {
      cy.intercept('PATCH', '**/errands/*/notes', mockMexErrand_base.data.stakeholders).as('patchNotes');

      cy.get(`[aria-label="${mockSidebarButtons[2].label}"]`).should('exist').click();

      cy.get('[data-cy="notes-wrapper"]')
        .should('exist')
        .children()
        .each((item, index) => {
          if (index < mockMexErrand_base.data.notes.filter((note) => note.noteType === 'INTERNAL').length) {
            cy.get(`[data-cy="note-${index}"]`)
              .should('exist')
              .within(() => {
                cy.get('.sk-avatar').should('exist');
                cy.get('[data-cy="note-text"]').should('exist').contains('Mock comment');
              });
          }
        });

      cy.get('[data-cy="INTERNAL-note-input"]').should('exist').type('Mock comment', { delay: 100 });
      cy.get('[data-cy="save-INTERNAL-note-button"]').should('exist').click();

      cy.wait('@patchNotes').should(({ request }) => {
        expect(request.body.text).to.equal('Mock comment');
        expect(request.body.noteType).to.equal('INTERNAL');
      });
    });

    it('manages Guides', () => {
      cy.get(`[aria-label="${mockSidebarButtons[3].label}"]`).should('exist').click();
      cy.get('[data-cy="guide-wrapper"]').should('exist').contains('Ingen guide vald');
      cy.get('[data-cy="select-guide"]').should('exist').select(2);
      cy.get('[data-cy="guide-wrapper"]').should('exist').contains('Bygglov');
    });

    it('manages Investigation', () => {
      cy.intercept('POST', '**/render/pdf', mockMexErrand_base).as('postRenderPdf');
      cy.intercept('PATCH', '**/errands/*/decisions', mockMexErrand_base).as('patchDecision');

      cy.get(`[aria-label="${mockSidebarButtons[4].label}"]`).should('exist').click();
      cy.get('[data-cy="utredning-richtext-wrapper"]')
        .should('exist')
        .last()
        .within(() => {
          cy.get('.ql-editor').type('Mock investigation text', { delay: 100 });
        });

      cy.get('[data-cy="save-investigation-description-button"]').should('exist').click();

      cy.wait('@postRenderPdf').should(({ request }) => {
        expect(request.body.parameters.description).to.contain('Mock investigation text');
      });

      cy.wait('@patchDecision').should(({ request }) => {
        expect(request.body.description).to.contain('Mock investigation text');
      });
    });

    it('manages History', () => {
      cy.intercept('GET', '**/user/**', mockAdmins);
      cy.intercept('GET', '**/decisions/*', mockMexErrand_base);

      cy.get(`[aria-label="${mockSidebarButtons[5].label}"]`).should('exist').click();

      const events = [
        'Ny utredning/beslut',
        'Ny utredning/beslut',
        'Status ändrades',
        'Fas Beslut påbörjades',
        'Status ändrades',
        'Statusbeskrivning ändrades',
        'Status ändrades',
        'Statusbeskrivning ändrades',
        'Fas Utredning påbörjades',
        'Ny utredning/beslut',
        'Ärendet skapades',
        'Ärendetyp ändrades',
        'Prioritet ändrades',
        'Beskrivning ändrades',
        'Diarienummer ändrades',
        'Fas Aktualisering påbörjades',
        'Ny handläggare/intressent',
        'Extraparametrar ändrades',
        'Status ändrades',
        'Statusbeskrivning ändrades',
      ];

      cy.get('[data-cy="history-wrapper"]').should('exist');
      events.forEach((event, index) => {
        cy.get(`[data-cy="history-event-label-${index}"]`)
          .should('exist')
          .should('have.text', event)
          .click({ force: true });
        cy.get('[data-cy="history-details-title"]').should('not.be.empty');
        cy.get('[data-cy="history-details-type"]').should('not.be.empty');
        cy.get('[data-cy="history-table-details-close-button"]').should('exist').click();
      });

      cy.get('[data-cy="history-event-label-2"]').click();
      cy.get('[data-cy="history-details-type"]').should('have.text', 'Status');
      cy.get('[data-cy="history-details-content"]').should('contain.text', 'Tidigare värde:');
      cy.get('[data-cy="history-details-content"]').should('contain.text', 'Under utredning');
      cy.get('[data-cy="history-details-content"]').should('contain.text', 'Nytt värde:');
      cy.get('[data-cy="history-details-content"]').should('contain.text', 'Under beslut');
      cy.get('[data-cy="history-table-details-close-button"]').should('exist').click();
    });

    it('manages Exports', () => {
      if (appConfig.features.useErrandExport) {
        cy.get(`[aria-label="${mockSidebarButtons[6].label}"]`).should('exist').click();
        cy.get('[data-cy="basicInformation"]').should('exist');
        cy.get('[data-cy="export-button"]').should('exist').click();
        cy.get('p')
          .should('exist')
          .contains('Detta ärende är inte avslutat. Är du säker på att du vill exportera? Exporten kommer att loggas.');
      } else {
        cy.get(`[aria-label="${mockSidebarButtons[6].label}"]`).should('exist');
      }
    });
  });
});
