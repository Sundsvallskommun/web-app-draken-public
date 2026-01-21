/// <reference types="cypress" />

import { Role } from '@casedata/interfaces/role';
import { onlyOn } from '@cypress/skip-test';
import { mockAttachments } from 'cypress/e2e/case-data/fixtures/mockAttachments';
import { mockHistory } from 'cypress/e2e/case-data/fixtures/mockHistory';
import { mockPersonId } from 'cypress/e2e/case-data/fixtures/mockPersonId';
import { mockPhrases } from 'cypress/e2e/case-data/fixtures/mockPhrases';
import { mockAdmins } from '../fixtures/mockAdmins';
import { mockAsset } from '../fixtures/mockAsset';
import { mockMe } from '../fixtures/mockMe';
import { mockMessages } from '../fixtures/mockMessages';
import { mockPermits } from '../fixtures/mockPermits';
import { mockPTErrand_base } from '../fixtures/mockPtErrand';
import { mockRelations } from '../fixtures/mockRelations';
import { mockConversationMessages, mockConversations } from '../fixtures/mockConversations';

onlyOn(Cypress.env('application_name') === 'PT', () => {
  describe('Investigation tab', () => {
    beforeEach(() => {
      cy.intercept('GET', '**/metadata/jsonschemas/*/latest', { data: { id: 'mock-schema-id', schema: {} } });
      cy.intercept('POST', '**/messages', mockMessages);
      cy.intercept('GET', '**/messages/*', mockMessages);
      cy.intercept('POST', '**/phrases', mockPhrases);
      cy.intercept('GET', '**/users/admins', mockAdmins);
      cy.intercept('GET', '**/me', mockMe);
      cy.intercept('GET', '**/featureflags', []);
      cy.intercept('POST', '**/personid', mockPersonId);
      cy.intercept('GET', '**/parking-permits/', mockPermits);
      cy.intercept('GET', '**/parking-permits/?personId=aaaaaaa-bbbb-aaaa-bbbb-aaaabbbbcccc', mockPermits);
      cy.intercept('GET', /\/errand\/\d*/, mockPTErrand_base).as('getErrandById');
      cy.intercept('GET', /\/errand\/\d+\/attachments$/, mockAttachments).as('getErrandAttachments');
      cy.intercept('PATCH', '**/errands/*', { data: 'ok', message: 'ok' }).as('patchErrand');
      cy.intercept('GET', '**/errand/errandNumber/*', mockPTErrand_base).as('getErrand');
      cy.intercept('POST', '**/templates/phrases*', mockPhrases).as('getPhrases');
      cy.intercept('GET', '**/errands/*/history', mockHistory).as('getHistory');
      cy.intercept('GET', '**/assets?partyId=aaaaaaa-bbbb-aaaa-bbbb-aaaabbbbcccc&type=PARKINGPERMIT', mockAsset);
      cy.intercept('PUT', '**/errands/*/decisions/*', mockPTErrand_base).as('updateDecision');
      cy.intercept('GET', '**/contracts/2024-01026', mockPTErrand_base).as('getContract');
      cy.intercept('GET', '**/assets?**', {}).as('getAssets');
      cy.intercept('GET', /\/errand\/\d+\/messages$/, mockMessages);

      cy.intercept('GET', '**/sourcerelations/**/**', mockRelations).as('getSourceRelations');
      cy.intercept('GET', '**/targetrelations/**/**', mockRelations).as('getTargetRelations');
      cy.intercept('GET', '**/namespace/errands/**/communication/conversations', mockConversations).as(
        'getConversations'
      );
      cy.intercept('GET', '**/errands/**/communication/conversations/*/messages', mockConversationMessages).as(
        'getConversationMessages'
      );

      cy.visit(`/arende/${mockPTErrand_base.data.municipalityId}/${mockPTErrand_base.data.errandNumber}`);
      cy.wait('@getErrand');
      cy.get('.sk-cookie-consent-btn-wrapper').contains('Godkänn alla').click();
      cy.get('.sk-tabs-list button').eq(5).should('have.text', 'Utredning').click({ force: true });
    });

    it('displays the correct data', () => {
      cy.get('[data-cy="recommended-decision"]')
        .should('exist')
        .should(
          'have.text',
          mockPTErrand_base.data.decisions.find((d) => d.decisionType === 'RECOMMENDED')?.description
        );
      cy.get('[data-cy="investigation-law-select"]').should('exist').should('have.value', '');
      cy.get('[data-cy="investigation-law-select"]').select('13 kap. 8§ Parkeringstillstånd för rörelsehindrade');
      cy.get('[data-cy="outcome-select"]').should('exist').should('have.value', 'APPROVAL');
      cy.get('[data-cy="utredning-richtext-wrapper"]').should('exist').contains('Utredningstext');
    });

    it('can edit investigation fields', () => {
      cy.intercept('PATCH', '**/errands/**/extraparameters', {});
      cy.intercept('POST', '**/render/pdf', mockPTErrand_base).as('postRenderPdf');

      cy.get('[data-cy="investigation-law-select"]')
        .should('exist')
        .select('13 kap. 8§ Parkeringstillstånd för rörelsehindrade');
      cy.get('[data-cy="outcome-select"]').should('exist').select('REJECTION');
      cy.get('button').should('exist').contains('Ja').click();
      cy.get('[data-cy="utredning-richtext-wrapper"]').should('exist').clear().type('Mock text');
      cy.get('[data-cy="save-utredning-button"]').should('exist').click();
      cy.get('button').should('exist').contains('Ja').click();

      const decidedBy = mockPTErrand_base.data.stakeholders.find((s) => s.roles.includes(Role.ADMINISTRATOR))!;

      const { id, created, updated, personId, personalNumber, ...sanitizedStakeholder } = decidedBy;

      cy.wait('@updateDecision').should(({ request }) => {
        expect(request.body.id).to.equal(29);
        expect(request.body.description).to.contain('Mock text');
        expect(request.body.decisionType).to.equal('PROPOSED');
        expect(request.body.decisionOutcome).to.equal('REJECTION');
        expect(request.body.decidedBy).to.deep.equal(sanitizedStakeholder);
        expect(request.body.law).to.deep.equal([
          {
            heading: '13 kap. 8§ Parkeringstillstånd för rörelsehindrade',
            sfs: 'Trafikförordningen (1998:1276)',
            chapter: '13',
            article: '8',
          },
        ]);
      });
    });

    it('disables save button if investigation text is empty', () => {
      cy.get('[data-cy="utredning-richtext-wrapper"]').should('exist').clear();
      cy.get('[data-cy="save-utredning-button"]').should('exist').should('be.disabled');
    });
  });
});
