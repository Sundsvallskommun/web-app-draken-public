/// <reference types="cypress" />

import { onlyOn } from '@cypress/skip-test';
import { mockAddress } from 'cypress/e2e/case-data/fixtures/mockAddress';
import { mockAttachments } from 'cypress/e2e/case-data/fixtures/mockAttachments';
import { mockHistory } from 'cypress/e2e/case-data/fixtures/mockHistory';
import { mockPTErrand_base, mockPTErrand_base_afterStatusChange } from '../fixtures/mockPtErrand';
import { mockPersonId } from 'cypress/e2e/case-data/fixtures/mockPersonId';
import { mockAdmins } from '../fixtures/mockAdmins';
import { mockMe } from '../fixtures/mockMe';
import { mockMessages } from '../fixtures/mockMessages';
import { mockPermits } from '../fixtures/mockPermits';
import { mockSidebarButtons } from '../fixtures/mockSidebarButtons';
import { mockContract } from '../fixtures/mockContract';

onlyOn(Cypress.env('application_name') === 'PT', () => {
  describe('Errand page', () => {
    beforeEach(() => {
      cy.intercept('GET', '**/messages/*', mockMessages);
      cy.intercept('POST', '**/messages', mockMessages);
      cy.intercept('POST', '**/personid', mockPersonId);
      cy.intercept('GET', '**/users/admins', mockAdmins);
      cy.intercept('GET', '**/me', mockMe).as('mockMe');
      cy.intercept('GET', '**/parking-permits/', mockPermits);
      cy.intercept('GET', '**/parking-permits/?personId=aaaaaaa-bbbb-aaaa-bbbb-aaaabbbbcccc', mockPermits);
      cy.intercept('GET', /\/errand\/\d*/, mockPTErrand_base).as('getErrandById');
      cy.intercept('GET', /\/errand\/\d*\/attachments/, mockAttachments).as('getErrandAttachments');
      cy.intercept('GET', '**/errands/*/history', mockHistory).as('getHistory');
      cy.intercept('POST', '**/address', mockAddress).as('postAddress');
      cy.intercept('GET', '**/**/stakeholders/**', mockPTErrand_base.data.stakeholders);
      cy.intercept('GET', '**/errand/errandNumber/*', mockPTErrand_base).as('getErrand');
      cy.intercept('POST', '**/stakeholders/**', mockPTErrand_base.data.stakeholders);
      cy.intercept('GET', '**/contract/2024-01026', mockContract).as('getContract');
      cy.intercept('GET', '**/assets?partyId=aaaaaaa-bbbb-aaaa-bbbb-aaaabbbbcccc&type=PARKINGPERMIT', {
        data: [
          {
            id: 'c9d99a9e-9302-45c4-a7c6-f4568gh44',
            assetId: '1337',
            origin: 'CASEDATA',
            partyId: 'd7af5f83-166a-499b-ab86-da8ca456897c',
            caseReferenceIds: ['PRH-2022-000019'],
            type: 'PARKINGPERMIT',
            issued: '2024-01-01',
            validTo: '2024-12-24',
            status: 'ACTIVE',
            description: 'Parkeringstillstånd för funktionshindrad',
            additionalParameters: {},
          },
        ],
        message: 'success',
      }).as('getAssets');
      cy.intercept('GET', '**/errand/errandNumber/*', mockPTErrand_base).as('getErrand');
      cy.visit('/arende/2281/PRH-2022-000019');
      cy.wait('@getErrand');
      cy.get('.sk-cookie-consent-btn-wrapper').contains('Godkänn alla').click();
    });

    it('shows the correct sidebar main buttons', () => {
      cy.get('[data-cy="manage-sidebar"]').should('exist');
      cy.get(`[aria-label="${mockSidebarButtons[0].label}"]`).should('exist');
      cy.get(`[aria-label="${mockSidebarButtons[1].label}"]`).should('exist');
      cy.get(`[aria-label="${mockSidebarButtons[2].label}"]`).should('exist');
      cy.get(`[aria-label="${mockSidebarButtons[5].label}"]`).should('exist');
    });

    it('manages Information', () => {
      const mockStatus = {
        status: 'Internt komplettering',
        description: 'Internt komplettering',
        dateTime: '2024-12-14T13:51:14.635643+01:00',
      };
      cy.intercept('PATCH', '**/errands/*/stakeholders/*', mockPTErrand_base.data.stakeholders).as('patchStakeholders');
      cy.intercept('PATCH', '**/errands/*', mockStatus).as('patchErrandStatus');

      cy.get(`[aria-label="${mockSidebarButtons[0].label}"]`).should('exist');
      cy.get('[data-cy="admin-input"]').should('exist').select(2);

      cy.get('[data-cy="assign-administrator-button"]').should('exist').contains('Tilldela').click();

      cy.wait('@patchStakeholders').should(({ request }) => {
        console.log('request stakeholder: ', request);
        expect(request.body.adAccount).to.equal('TESTADMIN1');
      });

      cy.get('[data-cy="status-input"]').should('exist').select('Under utredning');
    });

    it('manages Notes', () => {
      cy.intercept('PATCH', '**/errands/*/notes', mockPTErrand_base.data.stakeholders).as('patchNotes');

      cy.get(`[aria-label="${mockSidebarButtons[1].label}"]`).should('exist').click();
      cy.get('[data-cy="notes-wrapper"]')
        .should('exist')
        .children()
        .each((item, index) => {
          if (index < mockPTErrand_base.data.notes.filter((note) => note.noteType === 'PUBLIC').length) {
            cy.get(`[data-cy="note-${index}"]`)
              .should('exist')
              .within(() => {
                cy.get('.sk-avatar').should('exist');
                cy.get('[data-cy="note-text"]').should('exist').contains('Mock note');
              });
          }
        });
      cy.get('[data-cy="PUBLIC-note-input"]').should('exist').type('Mock note');
      cy.get('[data-cy="save-PUBLIC-note-button"]').should('exist').click();

      cy.wait('@patchNotes').should(({ request }) => {
        expect(request.body.text).to.equal('Mock note');
        expect(request.body.noteType).to.equal('PUBLIC');
      });
    });

    it('manages Comments', () => {
      cy.intercept('PATCH', '**/errands/*/notes', mockPTErrand_base.data.stakeholders).as('patchNotes');

      cy.get(`[aria-label="${mockSidebarButtons[2].label}"]`).should('exist').click();

      cy.get('[data-cy="notes-wrapper"]')
        .should('exist')
        .children()
        .each((item, index) => {
          if (index < mockPTErrand_base.data.notes.filter((note) => note.noteType === 'INTERNAL').length) {
            cy.get(`[data-cy="note-${index}"]`)
              .should('exist')
              .within(() => {
                cy.get('.sk-avatar').should('exist');
                cy.get('[data-cy="note-text"]').should('exist').contains('Mock comment');
              });
          }
        });

      cy.get('[data-cy="INTERNAL-note-input"]').should('exist').type('Mock comment');
      cy.get('[data-cy="save-INTERNAL-note-button"]').should('exist').click();

      cy.wait('@patchNotes').should(({ request }) => {
        expect(request.body.text).to.equal('Mock comment');
        expect(request.body.noteType).to.equal('INTERNAL');
      });
    });

    it('manages History', () => {
      cy.intercept('GET', '**/user/**', mockAdmins);
      cy.intercept('GET', '**/decisions/*', mockPTErrand_base);

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
        cy.get(`[data-cy="history-event-label-${index}"]`).should('exist').should('have.text', event).click();
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
  });
});
