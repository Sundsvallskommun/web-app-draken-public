/// <reference types="cypress" />

import { onlyOn } from '@cypress/skip-test';
import { mockAttachments, mockAttachmentsPT } from 'cypress/e2e/case-data/fixtures/mockAttachments';
import { mockHistory } from 'cypress/e2e/case-data/fixtures/mockHistory';
import { mockPersonId } from 'cypress/e2e/case-data/fixtures/mockPersonId';
import { mockPhrases } from 'cypress/e2e/case-data/fixtures/mockPhrases';
import { mockAdmins } from '../fixtures/mockAdmins';
import { mockAsset } from '../fixtures/mockAsset';
import { mockMe } from '../fixtures/mockMe';
import { mockMessages } from '../fixtures/mockMessages';
import { mockPermits } from '../fixtures/mockPermits';
import { mockPTErrand_base } from '../fixtures/mockPtErrand';
import dayjs from 'dayjs';

onlyOn(Cypress.env('application_name') === 'PT', () => {
  describe('Decisions tab', () => {
    beforeEach(() => {
      cy.intercept('GET', '**/messages/*', mockMessages);
      cy.intercept('POST', '**/phrases', mockPhrases);
      cy.intercept('GET', '**/users/admins', mockAdmins);
      cy.intercept('GET', '**/me', mockMe);
      cy.intercept('POST', '**/personid', mockPersonId);
      cy.intercept('GET', '**/parking-permits/', mockPermits);
      cy.intercept('GET', '**/parking-permits/?personId=aaaaaaa-bbbb-aaaa-bbbb-aaaabbbbcccc', mockPermits);
      cy.intercept('GET', /\/errand\/\d*/, mockPTErrand_base).as('getErrandById');
      cy.intercept('GET', /\/errand\/\d+\/attachments$/, mockAttachmentsPT).as('getErrandAttachments');
      cy.intercept('PATCH', '**/errands/*', { data: 'ok', message: 'ok' }).as('patchErrand');
      cy.intercept('GET', '**/errand/errandNumber/*', mockPTErrand_base).as('getErrand');
      cy.intercept('POST', '**/templates/phrases*', mockPhrases).as('getPhrases');
      cy.intercept('GET', '**/errands/*/history', mockHistory).as('getHistory');
      cy.intercept('GET', '**/assets?partyId=aaaaaaa-bbbb-aaaa-bbbb-aaaabbbbcccc&type=PARKINGPERMIT', mockAsset);
      cy.intercept('GET', '**/contract/2024-01026', mockPTErrand_base).as('getContract');

      cy.visit(`/arende/2281/${mockPTErrand_base.data.errandNumber}`);
      cy.wait('@getErrand');
      cy.get('.sk-cookie-consent-btn-wrapper').should('exist').contains('Godkänn alla').click();
      cy.get('.sk-tabs-list button').eq(6).should('have.text', 'Beslut').click({ force: true });
    });

    it('displays the correct fields', () => {
      cy.get('[data-cy="decision-outcome-select"]').should('exist');
      cy.get('[data-cy="law-select"]')
        .should('exist')
        .should('have.value', '13 kap. 8§ Parkeringstillstånd för rörelsehindrade');
      cy.get('[data-cy="validFrom-input"]').should('exist');
      cy.get('[data-cy="validTo-input"]').should('exist');
      cy.get('[data-cy="decision-richtext-wrapper"]').should('exist');
    });

    it('can edit decision fields for rejection', () => {
      cy.intercept('POST', '**/render/pdf', mockPTErrand_base).as('postRenderPdf');
      cy.intercept(
        'PUT',
        `**/decisions/${mockPTErrand_base.data.decisions.find((d) => d.decisionType === 'FINAL').id}`,
        mockPTErrand_base
      ).as('updateDecision');

      cy.get('[data-cy="decision-outcome-select"]').should('exist').select('Avslag');
      cy.get('[data-cy="law-select"]').should('exist');
      cy.get('[data-cy="validFrom-input"]').should('exist').type('2024-07-11');
      cy.get('[data-cy="validTo-input"]').should('exist').type('2024-08-11');
      cy.get('[data-cy="decision-richtext-wrapper"]').should('exist').clear().type('Mock text');
      cy.get('[data-cy="save-decision-button"]').should('exist').click();
      cy.get('button').should('exist').contains('Ja').click();

      cy.wait('@updateDecision').should(({ request }) => {
        expect(request.body.id).to.equal(1);
        expect(request.body.description).to.contain('Mock text');
        expect(request.body.decisionType).to.equal('FINAL');
        expect(request.body.decisionOutcome).to.equal('REJECTION');
        expect(request.body.decidedBy).to.deep.equal({
          type: 'PERSON',
          firstName: 'My',
          lastName: 'Testsson',
          adAccount: 'kctest',
          roles: ['ADMINISTRATOR'],
          addresses: [],
          contactInformation: [],
          extraParameters: {},
        });
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

    it('can edit decision fields for approval', () => {
      cy.intercept('POST', '**/render/pdf', mockPTErrand_base).as('postRenderPdf');
      cy.intercept(
        'PUT',
        `**/decisions/${mockPTErrand_base.data.decisions.find((d) => d.decisionType === 'FINAL').id}`,
        mockPTErrand_base
      ).as('updateDecision');

      cy.get('[data-cy="decision-outcome-select"]').should('exist').select('Bifall');
      cy.get('[data-cy="law-select"]').should('exist');
      cy.get('[data-cy="validFrom-input"]').should('exist').type('2024-07-11');
      cy.get('[data-cy="validTo-input"]').should('exist').type('2024-08-11');
      cy.get('[data-cy="decision-richtext-wrapper"]').should('exist').clear().type('Mock text');
      cy.get('[data-cy="save-decision-button"]').should('exist').click();
      cy.get('button').should('exist').contains('Ja').click();

      cy.wait('@updateDecision').should(({ request }) => {
        expect(request.body.id).to.equal(1);
        expect(request.body.description).to.contain('Mock text');
        expect(request.body.decisionType).to.equal('FINAL');
        expect(request.body.decisionOutcome).to.equal('APPROVAL');
        expect(request.body.decidedBy).to.deep.equal({
          type: 'PERSON',
          firstName: 'My',
          lastName: 'Testsson',
          adAccount: 'kctest',
          roles: ['ADMINISTRATOR'],
          addresses: [],
          contactInformation: [],
          extraParameters: {},
        });
        expect(request.body.validFrom).to.equal(dayjs('2024-07-11').startOf('day').toISOString());
        expect(request.body.validTo).to.equal(dayjs('2024-08-11').endOf('day').toISOString());
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

    it('disables save button if no decision is selected', () => {
      cy.get('[data-cy="decision-outcome-select"]').should('exist').select('Välj utfall');
      cy.get('[data-cy="validFrom-input"]').should('exist').type('2024-07-11');
      cy.get('[data-cy="validTo-input"]').should('exist').type('2024-08-11');
      cy.get('[data-cy="decision-richtext-wrapper"]').should('exist').clear().type('Mock text');
      cy.contains('Förslag till beslut måste anges').should('exist');
      cy.get('[data-cy="save-decision-button"]').should('exist').should('be.disabled');
    });

    it('disables save button if not both start and end date has been entered', () => {
      cy.get('[data-cy="decision-outcome-select"]').should('exist').select(2);
      cy.get('[data-cy="law-select"]').should('exist');
      cy.get('[data-cy="decision-outcome-select"]').should('exist');
      cy.get('[data-cy="decision-richtext-wrapper"]').should('exist').clear().type('Mock text');

      cy.get('[data-cy="validFrom-input"]').should('exist').clear();
      cy.get('[data-cy="validTo-input"]').should('exist').type('2024-08-11');
      cy.get('[data-cy="save-decision-button"]').should('exist').should('be.disabled');

      cy.get('[data-cy="validFrom-input"]').should('exist').type('2024-08-11');
      cy.get('[data-cy="validTo-input"]').should('exist').clear();
      cy.get('[data-cy="save-decision-button"]').should('exist').should('be.disabled');
    });
  });
});
