/// <reference types="cypress" />

import { onlyOn } from '@cypress/skip-test';
import { mockAddress } from 'cypress/e2e/case-data/fixtures/mockAddress';
import { mockAttachments } from 'cypress/e2e/case-data/fixtures/mockAttachments';
import { mockHistory } from 'cypress/e2e/case-data/fixtures/mockHistory';
import { mockPersonId } from 'cypress/e2e/case-data/fixtures/mockPersonId';
import { mockAdmins } from '../fixtures/mockAdmins';
import { mockAsset } from '../fixtures/mockAsset';
import { mockPurchaseAgreement } from '../fixtures/mockContract';
import { mockMe } from '../fixtures/mockMe';
import { mockMessages } from '../fixtures/mockMessages';
import { modifyField } from '../fixtures/mockMexErrand';
import { mockPTErrand_base } from '../fixtures/mockPtErrand';

onlyOn(Cypress.env('application_name') === 'PT', () => {
  describe('Errand details tab', () => {
    beforeEach(() => {
      cy.intercept('GET', '**/messages/*', mockMessages);
      cy.intercept('POST', '**/messages', mockMessages);
      cy.intercept('POST', '**/personid', mockPersonId);
      cy.intercept('GET', '**/users/admins', mockAdmins);
      cy.intercept('GET', '**/me', mockMe).as('mockMe');
      cy.intercept('GET', '**/featureflags', []);
      cy.intercept('GET', '**/assets/', mockAsset);
      cy.intercept('GET', '**/assets?partyId=aaaaaaa-bbbb-aaaa-bbbb-aaaabbbbcccc&type=PARKINGPERMIT', mockAsset);
      cy.intercept('GET', /\/errand\/\d*/, mockPTErrand_base).as('getErrandById');
      cy.intercept('GET', /\/errand\/\d+\/attachments$/, mockAttachments).as('getErrandAttachments');
      cy.intercept('POST', '**/stakeholders/personNumber', mockPTErrand_base.data.stakeholders);
      cy.intercept('GET', '**/contract/**', mockPurchaseAgreement).as('getContract');
      cy.intercept('GET', '**/errands/*/history', mockHistory).as('getHistory');
      cy.intercept('POST', '**/address', mockAddress).as('postAddress');
      cy.intercept('PATCH', '**/errands/*', mockPTErrand_base).as('patchErrand');
      cy.intercept('POST', '**/errands/*/facilities', mockPTErrand_base);
    });

    const goToErrandInformationTab = () => {
      cy.visit('/arende/2281/PRH-2022-000019');
      cy.get('.sk-cookie-consent-btn-wrapper').contains('Godkänn alla').click();
      cy.get('button').contains('Ärendeuppgifter').should('exist').click();
    };

    it('shows the correct fields for a new parking permit', () => {
      cy.intercept(
        'GET',
        '**/errand/errandNumber/*',
        modifyField(mockPTErrand_base, {
          facilities: [],
        })
      ).as('getErrand');
      goToErrandInformationTab();

      cy.get('input[name="application@applicant@capacity"][value="DRIVER"]').should('exist').should('be.checked');
      cy.get('input[name="application@applicant@capacity"][value="PASSENGER"]')
        .should('exist')
        .should('not.be.checked');

      cy.get('[data-cy="application.reason-textarea"]').should('exist').and('have.value', 'Kan inte gå');

      cy.get('input[name="CRUTCH"]').should('exist').should('not.be.checked');
      cy.get('input[name="CRUTCH"]').should('exist').should('not.be.checked');
      cy.get('input[name="ROLLER"]').should('exist').should('be.checked');
      cy.get('input[name="WHEELCHAIR"]').should('exist').should('not.be.checked');
      cy.get('input[name="EWHEELCHAIR"]').should('exist').should('be.checked');
      cy.get('input[name="NONE"]').should('exist').should('not.be.checked');

      cy.get('input[name="disability@walkingAbility"][value="true"]').should('exist').should('not.be.checked');
      cy.get('input[name="disability@walkingAbility"][value="false"]').should('exist').should('be.checked');

      cy.get('input[name="disability@walkingDistance@beforeRest"]').should('exist').and('have.value', '85');

      cy.get('input[name="disability@walkingDistance@max"]').should('exist').and('have.value', '150');

      cy.get('[data-cy="disability.duration-select"]').should('exist').and('have.value', 'P0Y');

      cy.get('input[name="consent@contact@doctor"][value="true"]').should('exist').should('not.be.checked');
      cy.get('input[name="consent@contact@doctor"][value="false"]').should('exist').should('be.checked');

      cy.get('input[name="consent@view@transportationServiceDetails"][value="true"]')
        .should('exist')
        .should('not.be.checked');
      cy.get('input[name="consent@view@transportationServiceDetails"][value="false"]')
        .should('exist')
        .should('be.checked');

      cy.get('input[name="application@applicant@signingAbility"][value="true"]').should('exist').should('be.checked');
      cy.get('input[name="application@applicant@signingAbility"][value="false"]')
        .should('exist')
        .should('not.be.checked');
    });

    it('shows the correct fields for a renewal of parking permit', () => {
      cy.intercept(
        'GET',
        '**/errand/errandNumber/*',
        modifyField(mockPTErrand_base, {
          caseType: 'PARKING_PERMIT_RENEWAL',
          facilities: [],
        })
      ).as('getErrand');
      goToErrandInformationTab();

      cy.get('input[name="application@renewal@changedCircumstances"][value="Y"]').should('exist').should('be.checked');
      cy.get('input[name="application@renewal@changedCircumstances"][value="N"]')
        .should('exist')
        .should('not.be.checked');

      cy.get('input[name="application@renewal@expirationDate"]').should('exist').and('have.value', '2023-12-14');

      cy.get('input[name="application@renewal@medicalConfirmationRequired"][value="yes"]')
        .should('exist')
        .should('be.checked');
      cy.get('input[name="application@renewal@medicalConfirmationRequired"][value="no"]')
        .should('exist')
        .should('not.be.checked');
    });

    it('shows the correct fields for a lost parking permit', () => {
      cy.intercept(
        'GET',
        '**/errand/errandNumber/*',
        modifyField(mockPTErrand_base, {
          caseType: 'LOST_PARKING_PERMIT',
          facilities: [],
        })
      ).as('getErrand');
      goToErrandInformationTab();

      cy.get('input[name="application@lostPermit@policeReportNumber"]').should('exist').and('have.value', '123456');
    });
  });
});
