/// <reference types="cypress" />

import {
  Contract,
  ContractType,
  IntervalType,
  InvoicedIn,
  LeaseType,
  StakeholderRole,
  TimeUnit,
} from '@casedata/interfaces/contracts';
import { onlyOn } from '@cypress/skip-test';
import { mockAttachments } from 'cypress/e2e/case-data/fixtures/mockAttachments';
import { mockHistory } from 'cypress/e2e/case-data/fixtures/mockHistory';
import { mockPersonId } from 'cypress/e2e/case-data/fixtures/mockPersonId';
import { mockAdmins } from '../fixtures/mockAdmins';
import { mockAsset } from '../fixtures/mockAsset';
import { mockContractAttachment, mockLeaseAgreement } from '../fixtures/mockContract';
import { mockConversationMessages, mockConversations } from '../fixtures/mockConversations';
import { mockJsonSchema } from '../fixtures/mockJsonSchema';
import { mockMe } from '../fixtures/mockMe';
import { mockMessages } from '../fixtures/mockMessages';
import { mockMexErrand_base } from '../fixtures/mockMexErrand';
import { mockRelations } from '../fixtures/mockRelations';
import { getErrandPropertyDesignations } from '@casedata/services/casedata-facilities-service';
import { IErrand } from '@casedata/interfaces/errand';

onlyOn(Cypress.env('application_name') === 'MEX', () => {
  describe('Errand page contracts tab', () => {
    beforeEach(() => {
      cy.intercept('GET', '**/messages/MEX-2024-000280*', mockMessages);
      cy.intercept('GET', '**/users/admins', mockAdmins);
      cy.intercept('GET', '**/me', mockMe);
      cy.intercept('POST', '**/personid', mockPersonId);
      cy.intercept('POST', '**/stakeholders/personNumber', mockMexErrand_base.data.stakeholders);
      cy.intercept('GET', /\/errand\/\d*/, mockMexErrand_base).as('getErrandById');
      cy.intercept('GET', /\/errand\/\d+\/attachments$/, mockAttachments).as('getErrandAttachments');
      cy.intercept('PATCH', '**/errands/*', { data: 'ok', message: 'ok' }).as('patchErrand');
      cy.intercept('GET', '**/errand/errandNumber/*', mockMexErrand_base).as('getErrand');
      cy.intercept('GET', '**/errands/*/history', mockHistory).as('getHistory');
      cy.intercept('GET', '**/stakeholders/personNumber').as('getStakeholders');
      cy.intercept('GET', /\/errand\/\d+\/messages$/, mockMessages);

      cy.intercept('GET', '**/contracts/2024-01026', mockLeaseAgreement).as('getContract');
      cy.intercept('POST', '**/contracts', contractText).as('postLandLeaseContract');
      cy.intercept('PUT', '**/contracts/2024-01026', contractText).as('putContract');
      cy.intercept('GET', '**/contracts/2281/2024-01026/attachments/1', mockContractAttachment).as(
        'getContractAttachment'
      );
      cy.intercept('DELETE', '**/contracts/2281/2024-01026/attachments/1', {}).as('deleteContractAttachment');

      cy.intercept('GET', '**/errand/errandNumber/*', mockMexErrand_base).as('getErrand');
      cy.intercept('GET', '**/sourcerelations/**/**', mockRelations).as('getSourceRelations');
      cy.intercept('GET', '**/targetrelations/**/**', mockRelations).as('getTargetRelations');
      cy.intercept('GET', '**/namespace/errands/**/communication/conversations', mockConversations).as(
        'getConversations'
      );
      cy.intercept('GET', '**/errands/**/communication/conversations/*/messages', mockConversationMessages).as(
        'getConversationMessages'
      );
      cy.intercept('GET', '**/assets**', mockAsset).as('getAssets');
      cy.intercept('PATCH', '**/errands/**/extraparameters', { data: [], message: 'ok' }).as('saveExtraParameters');
      cy.intercept('GET', '**/metadata/jsonschemas/FTErrandAssets/latest', mockJsonSchema).as('getJsonSchema');

      cy.visit(`/arende/${mockMexErrand_base.data.municipalityId}/${mockMexErrand_base.data.id}`);
      cy.wait('@getErrand');
      cy.get('.sk-cookie-consent-btn-wrapper').contains('Godkänn alla').click();
      cy.wait('@getContract');
      cy.get('.sk-tabs-list button').eq(4).should('have.text', `Avtal`).click({ force: true });

      cy.get('[data-cy="contract-type-select"]').should('exist');
    });

    const contractText = {
      data: {
        contractId: '2024-01026',
        externalReferenceId: '123123',
        status: 'ACTIVE',
        propertyDesignations: ['SUNDSVALL BLA'],
        type: 'LAND_LEASE',
      },
    };

    it('shows uploaded contracts', () => {
      cy.intercept('GET', '**/errand/101', mockMexErrand_base).as('getErrand');
      cy.intercept(
        'POST',
        `**/contracts/${mockMexErrand_base.data.municipalityId}/${contractText.data.contractId}/attachments`,
        {}
      );
      cy.get('[data-cy="signerade-disclosure"] button.sk-btn-tertiary.sk-disclosure-header-icon')
        .should('exist')
        .click();

      cy.get('[data-cy="contract-upload-field"]').should('exist');
      cy.get('[data-cy="contract-attachment-item-1"]').should('exist');
      cy.get('[data-cy="contract-attachment-item-1"]')
        .find('.sk-form-file-upload-list-item-actions-more')
        .should('exist')
        .click();
      cy.get('[data-cy="open-attachment-1"]').should('exist');
      cy.get('[data-cy="delete-attachment-1"]').should('exist').click();
      cy.get('h1.sk-dialog-confirm-heading').contains('Ta bort signerat avtal?').should('exist');
      cy.get('article.sk-dialog').find('button').contains('Nej').should('exist');
      cy.get('article.sk-dialog').find('button').contains('Ja').should('exist').click();

      cy.wait('@deleteContractAttachment').should(({ request }) => {
        expect(request.url).to.contain(contractText.data.contractId);
      });
    });

    it('shows the correct contracts information', () => {
      const landLeaseType = [
        { key: 'parties', label: 'Parter' },
        { key: 'area', label: 'Område' },
        { key: 'avtalstid', label: 'Avtalstid och uppsägning' },
        { key: 'lopande', label: 'Löpande fakturering' },
        { key: 'engangs', label: 'Engångsfakturering' },
        { key: 'signerade', label: 'Signerade avtal' },
      ];

      //land lease contracts
      landLeaseType.forEach((type) => {
        cy.get(`[data-cy="badge-${type.key}"]`).contains(type.label).should('exist');
      });

      cy.get('[data-cy="casedata-contract-form"]').find('.sk-disclosure').should('have.length', 6);
      cy.get('[data-cy="parties-disclosure"]').contains('Parter').should('exist');
      cy.get('[data-cy="area-disclosure"]').contains('Område').should('exist');
      cy.get('[data-cy="avtalstid-disclosure"]').contains('Avtalstid och uppsägning').should('exist');
      cy.get('[data-cy="lopande-disclosure"]').contains('Löpande avgift').should('exist');
      cy.get('[data-cy="engangs-disclosure"]').contains('Engångsfakturering').should('exist');
      cy.get('[data-cy="signerade-disclosure"]').contains('Signerade avtal').should('exist');
    });

    // Parter
    it('manages parties in land lease contracts', () => {
      cy.get('[data-cy="parties-disclosure"]').should('exist');
      cy.get('[data-cy="Upplåtare-table"] .sk-table-tbody-tr')
        .should('exist')
        .contains(
          `${mockLeaseAgreement.data.stakeholders.find((x) => x.roles.includes('LESSOR'))?.firstName ?? ''} ${
            mockLeaseAgreement.data.stakeholders.find((x) => x.roles.includes('LESSOR'))?.lastName ?? ''
          }`
        );

      cy.get('[data-cy="Arrendatorer-table"] .sk-table-tbody-tr')
        .should('exist')
        .contains(
          `${mockLeaseAgreement.data.stakeholders.find((x) => x.roles.includes('LESSEE'))?.firstName ?? ''} ${
            mockLeaseAgreement.data.stakeholders.find((x) => x.roles.includes('LESSEE'))?.lastName ?? ''
          }`
        );

      cy.get('[data-cy="avtalstid-disclosure"] button.sk-btn-tertiary').should('exist').click();
      cy.get('[data-cy="lessee-notice-period"]').should('exist').type('15');
      cy.get('[data-cy="lessor-notice-period"]').should('exist').type('1');

      cy.get('[data-cy="area-disclosure"] button.sk-btn-tertiary').should('exist').click();
      cy.get('[data-cy="area-disclosure"] button.sk-btn-primary').should('exist').contains('Spara').click();
      cy.wait('@putContract').should(({ request }) => {
        const leaseAgreement: Contract = request.body;
        expect(leaseAgreement.type).to.equal(ContractType.LEASE_AGREEMENT);
        expect(leaseAgreement.leaseType).to.equal(LeaseType.USUFRUCT_MOORING);
        const lessor = leaseAgreement.stakeholders.find((s) => s.roles.includes(StakeholderRole.LESSOR));
        const lessee = leaseAgreement.stakeholders.find((s) => s.roles.includes(StakeholderRole.LESSEE));
        expect(lessor.firstName).to.equal(
          mockLeaseAgreement.data.stakeholders.find((x) => x.roles.includes('LESSOR'))?.firstName ?? ''
        );
        expect(lessee.firstName).to.equal(
          mockLeaseAgreement.data.stakeholders.find((x) => x.roles.includes('LESSEE'))?.firstName ?? ''
        );
      });
    });

    // Område
    it('manages property designations in land lease contracts', () => {
      cy.intercept('GET', '**/errand/101', mockMexErrand_base).as('getErrand');
      cy.get('[data-cy="area-disclosure"] button.sk-btn-tertiary').should('exist').click();
      cy.get('[data-cy="property-designation-checkboxgroup"]').should('exist');

      const buildSelector = (p) => `[data-cy="property-designation-checkbox-${p.replace(/\s+/g, '-')}"]`;

      const errandProperties = getErrandPropertyDesignations(mockMexErrand_base.data as unknown as IErrand);
      const errandPropertiesCySelectors = errandProperties.map(buildSelector);

      const contractProperties = mockLeaseAgreement.data.propertyDesignations;
      const contractPropertiesCySelectors = contractProperties.map(buildSelector);

      errandPropertiesCySelectors.forEach((selector) => {
        cy.get(selector).should('exist').and('not.be.checked');
      });

      contractPropertiesCySelectors.forEach((selector) => {
        cy.get(selector).should('exist').and('be.checked');
      });

      // Check all and save
      errandPropertiesCySelectors.forEach((selector) => {
        cy.get(selector).should('exist').check({ force: true });
      });

      cy.get('[data-cy="avtalstid-disclosure"] button.sk-btn-tertiary').should('exist').click();
      cy.get('[data-cy="lessee-notice-period"]').should('exist').type('15');
      cy.get('[data-cy="lessor-notice-period"]').should('exist').type('1');

      cy.get('[data-cy="area-disclosure"] button.sk-btn-primary').contains('Spara').should('exist').click();
      cy.wait('@putContract').should(({ request }) => {
        const leaseAgreement: Contract = request.body;
        expect(leaseAgreement.propertyDesignations).to.deep.equal([...errandProperties, ...contractProperties]);
      });
    });

    // Avtalstid och uppsägning
    it('manages tenancy period automatically in land lease contracts', () => {
      cy.intercept('GET', '**/errand/101', mockMexErrand_base).as('getErrand');
      cy.get('[data-cy="avtalstid-disclosure"] button.sk-btn-tertiary').should('exist').click();

      cy.get('[data-cy="avtalstid-start"]').should('exist').type('2024-12-01');
      cy.get('[data-cy="avtalstid-end"]').should('exist').type('2025-12-01');

      cy.get('[data-cy="lessee-notice-unit"]').should('exist').select(TimeUnit.DAYS);
      cy.get('[data-cy="lessee-notice-period"]').should('exist').type('15');
      cy.get('[data-cy="lessee-notice-party"]').should('have.value', 'LESSEE');

      cy.get('[data-cy="lessor-notice-unit"]').should('exist').select(TimeUnit.MONTHS);
      cy.get('[data-cy="lessor-notice-period"]').should('exist').type('1');
      cy.get('[data-cy="lessor-notice-party"]').should('have.value', 'LESSOR');

      cy.get('[data-cy="autoextend-true-radiobutton"]').should('exist').check({ force: true });
      cy.get('[data-cy="extension-unit-selector"]').should('exist').select(TimeUnit.YEARS);
      cy.get('[data-cy="extension-input"]').should('exist').type('180');

      cy.get('[data-cy="avtalstid-disclosure"] button.sk-btn-primary').contains('Spara').should('exist').click();
      cy.wait('@putContract').should(({ request }) => {
        const leaseAgreement: Contract = request.body;
        expect(leaseAgreement.notices).to.deep.equal([
          { party: 'LESSEE', periodOfNotice: '15', unit: TimeUnit.DAYS },
          { party: 'LESSOR', periodOfNotice: '1', unit: TimeUnit.MONTHS },
        ]);
        expect(leaseAgreement.extension).to.deep.equal({
          autoExtend: true,
          unit: TimeUnit.YEARS,
          leaseExtension: '180',
        });
      });
    });

    // Löpande avgift
    it('manages lease fee automatically in land lease contracts', () => {
      cy.intercept('GET', '**/errand/101', mockMexErrand_base).as('getErrand');
      cy.get('[data-cy="lopande-disclosure"] button.sk-btn-tertiary').should('exist').click();

      cy.get('[data-cy="generate-invoice-true-radiobutton"]').should('exist');
      cy.get('[data-cy="generate-invoice-false-radiobutton"]').should('exist');

      cy.get('[data-cy="fees-yearly-input"]').should('exist').type('120');

      cy.get('[data-cy="indexed-true-radiobutton"]').should('exist');
      cy.get('[data-cy="indexed-false-radiobutton"]').should('exist');

      cy.get('[data-cy="invoice-interval-yearly-radiobutton"]').should('exist');
      cy.get('[data-cy="invoice-interval-halfyearly-radiobutton"]').should('exist');
      cy.get('[data-cy="invoice-interval-quarterly-radiobutton"]').should('exist').check({ force: true });

      cy.get('[data-cy="invoice-in-advance-radiobutton"]').should('exist').check({ force: true });
      cy.get('[data-cy="invoice-in-arrears-radiobutton"]').should('exist');

      cy.get('[data-cy="invoice-markup-input"]').should('exist');

      cy.get('[data-cy="fees-additional-information-0-input"]').should('exist');
      cy.get('[data-cy="fees-additional-information-1-input"]').should('exist').type('Foobar');

      cy.get('[data-cy="avtalstid-disclosure"] button.sk-btn-tertiary').should('exist').click();
      cy.get('[data-cy="lessee-notice-period"]').should('exist').type('15');
      cy.get('[data-cy="lessor-notice-period"]').should('exist').type('1');

      cy.get('[data-cy="lopande-disclosure"] button.sk-btn-primary').contains('Spara').should('exist').click();
      cy.wait('@putContract').should(({ request }) => {
        const leaseAgreement: Contract = request.body;
        expect(leaseAgreement.invoicing).to.deep.equal({
          invoiceInterval: IntervalType.QUARTERLY,
          invoicedIn: InvoicedIn.ADVANCE,
        });
        expect(leaseAgreement.fees).to.deep.equal({
          currency: 'SEK',
          monthly: 0,
          yearly: 120,
          total: 120,
          additionalInformation: ['Avgift, båtplats', 'Foobar'],
        });
      });
    });
  });
});
