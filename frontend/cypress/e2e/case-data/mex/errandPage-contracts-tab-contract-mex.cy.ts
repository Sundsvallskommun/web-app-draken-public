/// <reference types="cypress" />

import {
  Contract,
  ContractType,
  IntervalType,
  InvoicedIn,
  LeaseType,
  Stakeholder,
  StakeholderRole,
  Status,
  TimeUnit,
} from '@casedata/interfaces/contracts';
import { onlyOn } from '@cypress/skip-test';
import { mockAttachments } from 'cypress/e2e/case-data/fixtures/mockAttachments';
import { mockHistory } from 'cypress/e2e/case-data/fixtures/mockHistory';
import { mockPersonId } from 'cypress/e2e/case-data/fixtures/mockPersonId';
import { mockAdmins } from '../fixtures/mockAdmins';
import { mockAsset } from '../fixtures/mockAsset';
import { mockContractAttachment, mockLeaseAgreement } from '../fixtures/mockContract';
import { mockContractInvoices } from '../fixtures/mockContractsList';
import { mockConversationMessages, mockConversations } from '../fixtures/mockConversations';
import {
  mockEstateInfo11,
  mockEstateInfo12,
  mockSingleEstateByPropertyDesignation11,
  mockSingleEstateByPropertyDesignation12,
} from '../fixtures/mockEstateInfo';
import { mockEstatePropertyByDesignation } from '../fixtures/mockEstatePropertyByDesignation';
import { mockFeatureFlags } from '../fixtures/mockFeatureFlags';
import { mockJsonSchema } from '../fixtures/mockJsonSchema';
import { mockMe } from '../fixtures/mockMe';
import { mockMessages } from '../fixtures/mockMessages';
import { mockMexErrand_base } from '../fixtures/mockMexErrand';
import { mockRelations } from '../fixtures/mockRelations';

onlyOn(Cypress.env('application_name') === 'MEX', () => {
  describe('Errand page contracts tab', () => {
    beforeEach(() => {
      cy.intercept('GET', '**/messages/MEX-2024-000280*', mockMessages);
      cy.intercept('GET', '**/users/admins', mockAdmins);
      cy.intercept('GET', '**/me', mockMe);
      cy.intercept('GET', '**/featureflags', []);
      cy.intercept('POST', '**/personid', mockPersonId);
      cy.intercept('POST', '**/stakeholders/personNumber', mockMexErrand_base.data.stakeholders);

      cy.intercept('GET', /\/errand\/\d+\/attachments$/, mockAttachments).as('getErrandAttachments');
      cy.intercept('PATCH', '**/errands/*', { data: 'ok', message: 'ok' }).as('patchErrand');
      cy.intercept('GET', '**/estateByPropertyDesignation/**', mockEstatePropertyByDesignation).as(
        'getEstatePropertyByDesignation'
      );

      cy.intercept('GET', '**/errands/*/history', mockHistory).as('getHistory');
      cy.intercept('GET', '**/stakeholders/personNumber').as('getStakeholders');
      cy.intercept('GET', /\/errand\/\d+\/messages$/, mockMessages);

      cy.intercept('GET', '**/contracts/2024-01026', mockLeaseAgreement).as('getContract');
      cy.intercept('POST', '**/contracts', contractText).as('postLandLeaseContract');
      cy.intercept('PUT', '**/contracts/2024-01026', contractText).as('putContract');
      cy.intercept('POST', '**/contracts', contractText).as('postContract');
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
      cy.intercept('GET', '**/schemas/FTErrandAssets/latest', mockJsonSchema).as('getJsonSchema');
      cy.intercept('GET', '**/schemas/*/ui-schema', {
        data: { id: 'mock-ui-schema-id', value: {} },
        message: 'success',
      }).as('getUiSchema');
      cy.intercept('GET', '**/estateInfo/**1:1', mockEstateInfo11).as('getEstateInfo');
      cy.intercept('GET', '**/estateInfo/**1:2', mockEstateInfo12).as('getEstateInfo');
      cy.intercept('GET', '**/singleEstateByPropertyDesignation/**1:1', mockSingleEstateByPropertyDesignation11).as(
        'getEstateInfo'
      );
      cy.intercept('GET', '**/singleEstateByPropertyDesignation/**1:2', mockSingleEstateByPropertyDesignation12).as(
        'getEstateInfo'
      );
      cy.intercept('GET', '**/billing/**/contracts/**/invoices*', mockContractInvoices).as('getContractInvoices');
      cy.intercept('GET', '**/featureflags', mockFeatureFlags).as('getFeatureFlags');
    });

    const contractText: { data: Contract } = {
      data: {
        contractId: '2024-01026',
        externalReferenceId: '123123',
        status: Status.ACTIVE,
        propertyDesignations: [],
        type: ContractType.LEASE_AGREEMENT,
      },
    };

    const visitErrandContractTab = () => {
      cy.intercept('GET', '**/errand/101', mockMexErrand_base).as('getErrandById');
      cy.intercept('GET', '**/errand/errandNumber/*', mockMexErrand_base).as('getErrand');
      cy.visit(`/arende/${mockMexErrand_base.data.id}`);
      cy.wait('@getErrand');
      cy.get('.sk-cookie-consent-btn-wrapper').contains('Godkänn alla').click();
      cy.wait('@getContract');
      cy.get('.sk-tabs-list button').contains(`Avtal`).click({ force: true });
      cy.get('[data-cy="contract-type-select"]').should('exist');
    };

    const visitErrandWithoutContract = () => {
      const mockMexErrand_base_without_contract = { ...mockMexErrand_base };
      mockMexErrand_base_without_contract.data.extraParameters = mockMexErrand_base.data.extraParameters.filter(
        (p) => p.key !== 'contractId'
      );
      cy.intercept('GET', '**/errand/101', mockMexErrand_base_without_contract).as('getErrandByIdNoContract');
      cy.intercept('GET', '**/errand/errandNumber/*', mockMexErrand_base_without_contract).as('getErrandNoContract');
      cy.visit(`/arende/${mockMexErrand_base.data.id}`);
      cy.wait('@getErrandNoContract');
      cy.get('.sk-cookie-consent-btn-wrapper').contains('Godkänn alla').click();
      cy.get('.sk-tabs-list button').contains(`Avtal`).click({ force: true });
      cy.get('[data-cy="contract-type-select"]').should('exist');
    };

    it('shows uploaded contracts', () => {
      cy.intercept('GET', '**/errand/101', mockMexErrand_base).as('getErrand');
      cy.intercept(
        'POST',
        `**/contracts/${mockMexErrand_base.data.municipalityId}/${contractText.data.contractId}/attachments`,
        {}
      );
      visitErrandContractTab();
      cy.get('[data-cy="bilagor-disclosure"] .sk-disclosure-header button.sk-btn-tertiary').should('exist').click();

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
      visitErrandContractTab();
      const landLeaseType = [
        { key: 'parties', label: 'Parter' },
        { key: 'area', label: 'Område' },
        { key: 'avtalstid', label: 'Avtalstid och uppsägning' },
        { key: 'lopande', label: 'Löpande avgift' },
        { key: 'bilagor', label: 'Avtalsbilagor' },
      ];

      //lease agreements
      landLeaseType.forEach((type) => {
        cy.get(`[data-cy="badge-${type.key}"]`).contains(type.label).should('exist');
      });

      cy.get('[data-cy="casedata-contract-form"]').find('.sk-disclosure').should('have.length', 6);
      cy.get('[data-cy="parties-disclosure"]').contains('Parter').should('exist');
      cy.get('[data-cy="area-disclosure"]').contains('Område').should('exist');
      cy.get('[data-cy="avtalstid-disclosure"]').contains('Avtalstid och uppsägning').should('exist');
      cy.get('[data-cy="lopande-disclosure"]').contains('Löpande avgift').should('exist');
      cy.get('[data-cy="bilagor-disclosure"]').contains('Avtalsbilagor').should('exist');
      // takeElementSnapshot('contract-wrapper');
    });

    // Parter
    it('manages parties in lease agreements', () => {
      visitErrandContractTab();
      cy.get('[data-cy="parties-disclosure"]').should('exist');

      // Verify parties are shown in the unified table
      cy.get('[data-cy="parties-table"]').should('exist');
      cy.get('[data-cy="parties-table"]')
        .find('[data-cy="party-row-0"]')
        .should('exist')
        .within(() => {
          cy.get('[data-cy="party-0-name"]').should(
            'contain.text',
            `${mockLeaseAgreement.data.stakeholders.find((x) => x.roles.includes('LESSOR'))?.firstName ?? ''} ${
              mockLeaseAgreement.data.stakeholders.find((x) => x.roles.includes('LESSOR'))?.lastName ?? ''
            }`
          );
          cy.get('[data-cy="party-0-role"]').should('contain.text', 'Upplåtare');
        });

      cy.get('[data-cy="parties-table"]')
        .find('[data-cy="party-row-1"]')
        .should('exist')
        .within(() => {
          cy.get('[data-cy="party-1-name"]').should(
            'contain.text',
            `${mockLeaseAgreement.data.stakeholders.find((x) => x.roles.includes('LESSEE'))?.firstName ?? ''} ${
              mockLeaseAgreement.data.stakeholders.find((x) => x.roles.includes('LESSEE'))?.lastName ?? ''
            }`
          );
          cy.get('[data-cy="party-1-role"]').should('contain.text', 'Arrendator');
        });

      cy.get('[data-cy="avtalstid-disclosure"] button.sk-btn-tertiary').should('exist').click();
      cy.get('[data-cy="avtalstid-start"]').should('exist').clear().type('2029-01-01');
      cy.get('[data-cy="all-notice-period"]').should('exist').clear().type('15');

      cy.get('[data-cy="area-disclosure"] button.sk-btn-tertiary').should('exist').click();
      cy.get('[data-cy="area-disclosure"] button.sk-btn-primary').should('exist').contains('Spara').click();

      cy.wait('@putContract').should(({ request }) => {
        const leaseAgreement: Contract = request.body;
        expect(leaseAgreement.type).to.equal(ContractType.LEASE_AGREEMENT);
        expect(leaseAgreement.leaseType).to.equal(LeaseType.LAND_LEASE_MISC);
        const lessor = leaseAgreement.stakeholders.find((s: Stakeholder) => s.roles.includes(StakeholderRole.LESSOR));
        const lessee = leaseAgreement.stakeholders.find((s: Stakeholder) => s.roles.includes(StakeholderRole.LESSEE));
        expect(lessor.firstName).to.equal(
          mockLeaseAgreement.data.stakeholders.find((x) => x.roles.includes('LESSOR'))?.firstName ?? ''
        );
        expect(lessee.firstName).to.equal(
          mockLeaseAgreement.data.stakeholders.find((x) => x.roles.includes('LESSEE'))?.firstName ?? ''
        );
      });
    });

    // Område
    it('manages property designations in lease agreements', () => {
      visitErrandContractTab();
      cy.intercept('GET', '**/errand/101', mockMexErrand_base).as('getErrand');
      cy.get('[data-cy="area-disclosure"] button.sk-btn-tertiary').should('exist').click();
      cy.get('[data-cy="contract-property-designation-checkboxgroup"]').should('exist');

      const buildSelector = (p: { name: string; district?: string }) =>
        `[data-cy="property-designation-checkbox-${p.name.replace(/\s+/g, '-')}"]`;

      // const errandProperties = getErrandPropertyDesignations(mockMexErrand_base.data as unknown as IErrand);
      const errandProperties = mockMexErrand_base.data.facilities
        .filter((facility) => facility.address)
        .map((f) => {
          return { name: f.address?.propertyDesignation || '', district: 'Låtsasdistrikt' };
        });
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
      cy.get('[data-cy="avtalstid-start"]').should('exist').clear().type('2029-01-01');
      cy.get('[data-cy="all-notice-period"]').should('exist').clear().type('15');

      // takeElementSnapshot('area-disclosure');

      cy.get('[data-cy="area-disclosure"] button.sk-btn-primary').contains('Spara').should('exist').click();
      cy.wait('@putContract').should(({ request }) => {
        const leaseAgreement: Contract = request.body;
        expect(leaseAgreement.propertyDesignations).to.deep.equal([...contractProperties, ...errandProperties]);
      });
    });

    // Avtalstid och uppsägning
    it('manages tenancy period automatically in lease agreements', () => {
      visitErrandContractTab();
      cy.intercept('GET', '**/errand/101', mockMexErrand_base).as('getErrand');
      cy.get('[data-cy="avtalstid-disclosure"] button.sk-btn-tertiary').should('exist').click();

      cy.get('[data-cy="avtalstid-start"]').should('exist').clear().type('2024-12-01');
      cy.get('[data-cy="avtalstid-end"]').should('exist').clear().type('2025-12-01');

      cy.get('[data-cy="all-notice-unit"]').should('exist').select(TimeUnit.DAYS);
      cy.get('[data-cy="all-notice-period"]').should('exist').clear().type('15');
      cy.get('[data-cy="all-notice-party"]').should('have.value', 'ALL');

      cy.get('[data-cy="avtalstid-disclosure"] button.sk-btn-primary').contains('Spara').should('exist').click();
      cy.wait('@putContract').should(({ request }) => {
        const leaseAgreement: Contract = request.body;
        expect(leaseAgreement.notice.terms).to.deep.equal([
          { party: 'ALL', periodOfNotice: '15', unit: TimeUnit.DAYS },
        ]);
        expect(leaseAgreement.extension).to.deep.equal({
          autoExtend: false,
          unit: TimeUnit.DAYS,
        });
      });
    });

    // Löpande avgift
    it('manages lease fee automatically in lease agreements', () => {
      visitErrandContractTab();
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

      cy.get('[data-cy="invoice-markup-input"]').should('exist').type('TEST markup');

      cy.get('[data-cy="fees-additional-information-0-input"]').should('exist');
      cy.get('[data-cy="fees-additional-information-1-input"]').should('exist').type('Foobar');

      cy.get('[data-cy="avtalstid-disclosure"] button.sk-btn-tertiary').should('exist').click();
      cy.get('[data-cy="avtalstid-start"]').should('exist').clear().type('2024-01-01');
      cy.get('[data-cy="all-notice-period"]').should('exist').clear().type('1');

      // takeElementSnapshot('lopande-disclosure');

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
          additionalInformation: [
            'Avgift, lägenhetsarrende. Fastigheter: AVTALSFASTIGHET 1:123, AVTALSFASTIGHET 2:456',
            'Foobar',
          ],
        });
      });
    });

    it('manages creating a new lease agreement with manual party selection', () => {
      visitErrandWithoutContract();
      cy.get('[data-cy="contract-type-select"]').should('exist').select(ContractType.LEASE_AGREEMENT);
      cy.get('[data-cy="contract-subtype-select"]').should('exist').select(LeaseType.LAND_LEASE_MISC);

      // Verify parties table exists but is empty initially
      cy.get('[data-cy="parties-table"]').should('exist');
      cy.get('[data-cy="parties-table"]').should('contain.text', 'Inga parter tillagda');

      // Add lessor via party modal
      cy.get('[data-cy="add-party-button"]').should('exist').click();
      cy.get('[data-cy="party-modal-stakeholder-select"]').should('exist').select('2260');
      cy.get('[data-cy="party-modal-role-LESSOR"]').check({ force: true });
      cy.get('[data-cy="party-modal-save-button"]').click();

      // Verify lessor was added
      cy.get('[data-cy="parties-table"]')
        .find('[data-cy="party-row-0"]')
        .should('exist')
        .within(() => {
          cy.get('[data-cy="party-0-name"]').should('contain.text', 'Test Upplåtarsson');
          cy.get('[data-cy="party-0-role"]').should('contain.text', 'Upplåtare');
        });

      // Add lessee with billing role via party modal
      cy.get('[data-cy="add-party-button"]').click();
      cy.get('[data-cy="party-modal-stakeholder-select"]').should('exist').select('2280');
      cy.get('[data-cy="party-modal-role-LESSEE"]').check({ force: true });
      cy.get('[data-cy="party-modal-role-PRIMARY_BILLING_PARTY"]').check({ force: true });
      cy.get('[data-cy="party-modal-save-button"]').click();

      // Verify lessee was added with both roles
      cy.get('[data-cy="parties-table"]')
        .find('[data-cy="party-row-1"]')
        .should('exist')
        .within(() => {
          cy.get('[data-cy="party-1-name"]').should('contain.text', 'Test Arrendatorsson');
          cy.get('[data-cy="party-1-role"]').should('contain.text', 'Arrendator');
          cy.get('[data-cy="party-1-role"]').should('contain.text', 'Fakturamottagare');
        });

      // Fill required fields before saving
      cy.get('[data-cy="avtalstid-disclosure"] button.sk-btn-tertiary').should('exist').click();
      cy.get('[data-cy="avtalstid-start"]').should('exist').type('2024-01-01');
      cy.get('[data-cy="all-notice-period"]').should('exist').clear().type('3');

      // Save the contract
      cy.get('[data-cy="parties-disclosure"]').find('[data-cy="save-contract-button"]').should('exist').click();

      cy.wait('@postContract').should(({ request }) => {
        const leaseAgreement: Contract = request.body;
        expect(leaseAgreement.type).to.equal(ContractType.LEASE_AGREEMENT);
        expect(leaseAgreement.leaseType).to.equal(LeaseType.LAND_LEASE_MISC);
        const lessor = leaseAgreement.stakeholders.find((s: Stakeholder) => s.roles.includes(StakeholderRole.LESSOR));
        const lessee = leaseAgreement.stakeholders.find((s: Stakeholder) => s.roles.includes(StakeholderRole.LESSEE));
        expect(lessor).to.exist;
        expect(lessee).to.exist;
        expect(lessor.firstName).to.equal('Test');
        expect(lessor.lastName).to.equal('Upplåtarsson');
        expect(lessee.firstName).to.equal('Test');
        expect(lessee.lastName).to.equal('Arrendatorsson');
        // Lessee should also have PRIMARY_BILLING_PARTY role
        expect(lessee.roles).to.include(StakeholderRole.PRIMARY_BILLING_PARTY);
      });
    });

    it('manages creating a new purchase agreement with manual party selection', () => {
      visitErrandWithoutContract();

      // Switch to PURCHASE_AGREEMENT
      cy.get('[data-cy="contract-type-select"]').should('exist').select(ContractType.PURCHASE_AGREEMENT);

      // Verify parties table exists but is empty
      cy.get('[data-cy="parties-table"]').should('exist');
      cy.get('[data-cy="parties-table"]').should('contain.text', 'Inga parter tillagda');

      // Add seller via party modal
      cy.get('[data-cy="add-party-button"]').should('exist').click();
      cy.get('[data-cy="party-modal-stakeholder-select"]').should('exist').select('2290');
      cy.get('[data-cy="party-modal-role-SELLER"]').check({ force: true });
      cy.get('[data-cy="party-modal-save-button"]').click();

      // Verify seller was added
      cy.get('[data-cy="parties-table"]')
        .find('[data-cy="party-row-0"]')
        .should('exist')
        .within(() => {
          cy.get('[data-cy="party-0-name"]').should('contain.text', 'Daniella Testarsson');
          cy.get('[data-cy="party-0-role"]').should('contain.text', 'Säljare');
        });

      // Add buyer via party modal
      cy.get('[data-cy="add-party-button"]').click();
      cy.get('[data-cy="party-modal-stakeholder-select"]').should('exist').select('2106');
      cy.get('[data-cy="party-modal-role-BUYER"]').check({ force: true });
      cy.get('[data-cy="party-modal-save-button"]').click();

      // Verify buyer was added
      cy.get('[data-cy="parties-table"]')
        .find('[data-cy="party-row-1"]')
        .should('exist')
        .within(() => {
          cy.get('[data-cy="party-1-name"]').should('contain.text', 'Test Köparsson');
          cy.get('[data-cy="party-1-role"]').should('contain.text', 'Köpare');
        });

      cy.get('[data-cy="parties-disclosure"]').find('[data-cy="save-contract-button"]').should('exist').click();

      cy.wait('@postContract').should(({ request }) => {
        const purchaseAgreement: Contract = request.body;
        expect(purchaseAgreement.type).to.equal(ContractType.PURCHASE_AGREEMENT);
        expect(purchaseAgreement.leaseType).to.be.undefined;
        const seller = purchaseAgreement.stakeholders.find((s: Stakeholder) =>
          s.roles.includes(StakeholderRole.SELLER)
        );
        const buyer = purchaseAgreement.stakeholders.find((s: Stakeholder) => s.roles.includes(StakeholderRole.BUYER));
        expect(seller).to.exist;
        expect(buyer).to.exist;
        expect(seller.firstName).to.equal('Daniella');
        expect(seller.lastName).to.equal('Testarsson');
        expect(buyer.firstName).to.equal('Test');
        expect(buyer.lastName).to.equal('Köparsson');
      });
    });

    it('manages creating a new LAND_LEASE_PUBLIC contract with manual party selection', () => {
      visitErrandWithoutContract();

      // Select the new contract type
      cy.get('[data-cy="contract-type-select"]').should('exist').select(ContractType.LAND_LEASE_PUBLIC);

      // Verify NO lease subtype dropdown is shown (only for LEASE_AGREEMENT)
      cy.get('[data-cy="contract-subtype-select"]').should('not.exist');

      // Verify parties table exists but is empty
      cy.get('[data-cy="parties-table"]').should('exist');
      cy.get('[data-cy="parties-table"]').should('contain.text', 'Inga parter tillagda');

      // Add lessor via party modal
      cy.get('[data-cy="add-party-button"]').should('exist').click();
      cy.get('[data-cy="party-modal-stakeholder-select"]').should('exist').select('2260');
      cy.get('[data-cy="party-modal-role-LESSOR"]').check({ force: true });
      cy.get('[data-cy="party-modal-save-button"]').click();

      // Verify lessor was added
      cy.get('[data-cy="parties-table"]')
        .find('[data-cy="party-row-0"]')
        .should('exist')
        .within(() => {
          cy.get('[data-cy="party-0-name"]').should('contain.text', 'Test Upplåtarsson');
          cy.get('[data-cy="party-0-role"]').should('contain.text', 'Upplåtare');
        });

      // Add lessee via party modal
      cy.get('[data-cy="add-party-button"]').click();
      cy.get('[data-cy="party-modal-stakeholder-select"]').should('exist').select('2280');
      cy.get('[data-cy="party-modal-role-LESSEE"]').check({ force: true });
      cy.get('[data-cy="party-modal-save-button"]').click();

      // Verify lessee was added
      cy.get('[data-cy="parties-table"]')
        .find('[data-cy="party-row-1"]')
        .should('exist')
        .within(() => {
          cy.get('[data-cy="party-1-name"]').should('contain.text', 'Test Arrendatorsson');
          cy.get('[data-cy="party-1-role"]').should('contain.text', 'Arrendator');
        });

      // Fill required fields before saving
      cy.get('[data-cy="avtalstid-disclosure"] button.sk-btn-tertiary').should('exist').click();
      cy.get('[data-cy="avtalstid-start"]').should('exist').type('2024-01-01');
      cy.get('[data-cy="all-notice-period"]').should('exist').clear().type('3');

      // Save and verify contract type in request
      cy.get('[data-cy="parties-disclosure"]').find('[data-cy="save-contract-button"]').should('exist').click();

      cy.wait('@postContract').should(({ request }) => {
        const contract: Contract = request.body;
        expect(contract.type).to.equal(ContractType.LAND_LEASE_PUBLIC);
        // Verify no leaseType is set
        expect(contract.leaseType).to.be.undefined;
        // Verify it has lease agreement structure (lessors/lessees)
        expect(contract.stakeholders.some((s: Stakeholder) => s.roles.includes(StakeholderRole.LESSOR))).to.be.true;
        expect(contract.stakeholders.some((s: Stakeholder) => s.roles.includes(StakeholderRole.LESSEE))).to.be.true;
      });
    });

    it('manages creating a new SHORT_TERM_LEASE_AGREEMENT contract with manual party selection', () => {
      visitErrandWithoutContract();

      // Select the new contract type
      cy.get('[data-cy="contract-type-select"]').should('exist').select(ContractType.SHORT_TERM_LEASE_AGREEMENT);

      // Verify NO lease subtype dropdown is shown (only for LEASE_AGREEMENT)
      cy.get('[data-cy="contract-subtype-select"]').should('not.exist');

      // Verify parties table exists but is empty
      cy.get('[data-cy="parties-table"]').should('exist');
      cy.get('[data-cy="parties-table"]').should('contain.text', 'Inga parter tillagda');

      // Add lessor via party modal
      cy.get('[data-cy="add-party-button"]').should('exist').click();
      cy.get('[data-cy="party-modal-stakeholder-select"]').should('exist').select('2260');
      cy.get('[data-cy="party-modal-role-LESSOR"]').check({ force: true });
      cy.get('[data-cy="party-modal-save-button"]').click();

      // Verify lessor was added
      cy.get('[data-cy="parties-table"]')
        .find('[data-cy="party-row-0"]')
        .should('exist')
        .within(() => {
          cy.get('[data-cy="party-0-name"]').should('contain.text', 'Test Upplåtarsson');
          cy.get('[data-cy="party-0-role"]').should('contain.text', 'Upplåtare');
        });

      // Add lessee via party modal
      cy.get('[data-cy="add-party-button"]').click();
      cy.get('[data-cy="party-modal-stakeholder-select"]').should('exist').select('2280');
      cy.get('[data-cy="party-modal-role-LESSEE"]').check({ force: true });
      cy.get('[data-cy="party-modal-save-button"]').click();

      // Verify lessee was added
      cy.get('[data-cy="parties-table"]')
        .find('[data-cy="party-row-1"]')
        .should('exist')
        .within(() => {
          cy.get('[data-cy="party-1-name"]').should('contain.text', 'Test Arrendatorsson');
          cy.get('[data-cy="party-1-role"]').should('contain.text', 'Arrendator');
        });

      // Fill required fields before saving
      cy.get('[data-cy="avtalstid-disclosure"] button.sk-btn-tertiary').should('exist').click();
      cy.get('[data-cy="avtalstid-start"]').should('exist').type('2024-01-01');
      cy.get('[data-cy="all-notice-period"]').should('exist').clear().type('3');

      // Save and verify contract type in request
      cy.get('[data-cy="parties-disclosure"]').find('[data-cy="save-contract-button"]').should('exist').click();

      cy.wait('@postContract').should(({ request }) => {
        const contract: Contract = request.body;
        expect(contract.type).to.equal(ContractType.SHORT_TERM_LEASE_AGREEMENT);
        // Verify no leaseType is set
        expect(contract.leaseType).to.be.undefined;
        // Verify it has lease agreement structure (lessors/lessees)
        expect(contract.stakeholders.some((s: Stakeholder) => s.roles.includes(StakeholderRole.LESSOR))).to.be.true;
        expect(contract.stakeholders.some((s: Stakeholder) => s.roles.includes(StakeholderRole.LESSEE))).to.be.true;
      });
    });

    describe('Manual party selection with stakeholders without partyId', () => {
      // Mock errand with a stakeholder that has no personalNumber/personId (manually added)
      const mockMexErrandWithManualStakeholder = {
        ...mockMexErrand_base,
        data: {
          ...mockMexErrand_base.data,
          stakeholders: [
            ...mockMexErrand_base.data.stakeholders,
            {
              id: 9999, // Has id but no personalNumber/personId
              version: 1,
              created: '2024-05-17T10:50:17.25221+02:00',
              updated: '2024-05-17T10:50:17.252221+02:00',
              type: 'PERSON',
              // No personalNumber - manually added stakeholder
              firstName: 'Manual',
              lastName: 'Stakeholder',
              roles: ['CONTACT_PERSON'],
              addresses: [
                {
                  addressCategory: 'POSTAL_ADDRESS',
                  street: 'Manual Street 1',
                  postalCode: '12345',
                  city: 'TestCity',
                  careOf: '',
                },
              ],
              address: {
                streetAddress: '',
              },
              contactInformation: [
                {
                  contactType: 'EMAIL',
                  value: 'manual@example.com',
                },
              ],
              extraParameters: {},
            },
          ],
          extraParameters: mockMexErrand_base.data.extraParameters.filter((p) => p.key !== 'contractId'),
        },
      };

      it('allows selecting stakeholders without partyId as billing parties', () => {
        // Override the errand intercept for this test
        cy.intercept('GET', '**/errand/101', mockMexErrandWithManualStakeholder).as('getErrandByIdManual');
        cy.intercept('GET', '**/errand/errandNumber/*', mockMexErrandWithManualStakeholder).as('getErrandManual');
        cy.visit(`/arende/${mockMexErrand_base.data.id}`);
        cy.wait('@getErrandManual');
        cy.get('.sk-cookie-consent-btn-wrapper').contains('Godkänn alla').click();
        cy.get('.sk-tabs-list button').contains(`Avtal`).click({ force: true });
        cy.get('[data-cy="contract-type-select"]').should('exist').select(ContractType.LEASE_AGREEMENT);

        // Add lessor via party modal
        cy.get('[data-cy="add-party-button"]').should('exist').click();
        cy.get('[data-cy="party-modal-stakeholder-select"]').should('exist').select('2260');
        cy.get('[data-cy="party-modal-role-LESSOR"]').check({ force: true });
        cy.get('[data-cy="party-modal-save-button"]').click();

        // Add lessee (Test Arrendatorsson)
        cy.get('[data-cy="add-party-button"]').click();
        cy.get('[data-cy="party-modal-stakeholder-select"]').should('exist').select('2280');
        cy.get('[data-cy="party-modal-role-LESSEE"]').check({ force: true });
        cy.get('[data-cy="party-modal-save-button"]').click();

        // Add manual stakeholder (without partyId) as lessee + billing party
        cy.get('[data-cy="add-party-button"]').click();
        cy.get('[data-cy="party-modal-stakeholder-select"]').should('exist').select('9999');
        cy.get('[data-cy="party-modal-role-LESSEE"]').check({ force: true });
        cy.get('[data-cy="party-modal-role-PRIMARY_BILLING_PARTY"]').check({ force: true });
        cy.get('[data-cy="party-modal-save-button"]').click();

        // Verify all parties were added
        cy.get('[data-cy="parties-table"]').find('[data-cy="party-row-0"]').should('exist');
        cy.get('[data-cy="parties-table"]').find('[data-cy="party-row-1"]').should('exist');
        cy.get('[data-cy="parties-table"]').find('[data-cy="party-row-2"]').should('exist');

        // Verify the manual stakeholder has billing role
        cy.get('[data-cy="parties-table"]').should('contain.text', 'Manual Stakeholder');
        cy.get('[data-cy="parties-table"]').should('contain.text', 'Fakturamottagare');

        // Fill required fields before saving
        cy.get('[data-cy="avtalstid-disclosure"] button.sk-btn-tertiary').should('exist').click();
        cy.get('[data-cy="avtalstid-start"]').should('exist').type('2024-01-01');
        cy.get('[data-cy="all-notice-period"]').should('exist').clear().type('3');

        // Save the contract and verify the stakeholder is included with PRIMARY_BILLING_PARTY role
        cy.get('[data-cy="parties-disclosure"]').find('[data-cy="save-contract-button"]').click();

        cy.wait('@postContract').should(({ request }) => {
          const contract: Contract = request.body;
          const manualStakeholder = contract.stakeholders.find(
            (s: Stakeholder) => s.firstName === 'Manual' && s.lastName === 'Stakeholder'
          );
          expect(manualStakeholder).to.exist;
          expect(manualStakeholder.roles).to.include(StakeholderRole.LESSEE);
          expect(manualStakeholder.roles).to.include(StakeholderRole.PRIMARY_BILLING_PARTY);
          // The manual stakeholder should NOT have a meaningful partyId since it was added without personnummer
          expect(manualStakeholder.partyId).to.not.be.ok;
        });
      });
    });

    describe('Non-DRAFT contract restrictions', () => {
      it('does not show warning banner for DRAFT contracts', () => {
        visitErrandWithoutContract();
        cy.get('[data-cy="non-draft-warning-banner"]').should('not.exist');
        // For DRAFT contracts, add party button should be available
        cy.get('[data-cy="add-party-button"]').should('exist');
      });

      describe('ACTIVE contract', () => {
        // Use a different contract ID to avoid caching issues from earlier tests
        const activeContractId = '2024-ACTIVE-001';

        const mockActiveLeaseAgreement = {
          ...mockLeaseAgreement,
          data: {
            ...mockLeaseAgreement.data,
            contractId: activeContractId,
            status: 'ACTIVE',
            notice: {
              terms: [
                { party: 'LESSEE', periodOfNotice: 3, unit: 'MONTHS' },
                { party: 'LESSOR', periodOfNotice: 3, unit: 'MONTHS' },
              ],
            },
            fees: {
              currency: 'SEK',
              monthly: 0,
              yearly: 1000,
              total: 1000,
              additionalInformation: ['Avgift, lägenhetsarrende. Fastigheter: AVTALSFASTIGHET 1:123', ''],
            },
            invoicing: {
              invoiceInterval: 'YEARLY',
              invoicedIn: 'ADVANCE',
            },
            extraParameters: [
              { name: 'errandId', parameters: { errandId: '101' } },
              { name: 'InvoiceInfo', parameters: { markup: 'REF123' } },
            ],
            generateInvoice: 'true',
          },
        };

        // Mock errand with different contract ID
        const mockMexErrandWithActiveContract = {
          ...mockMexErrand_base,
          data: {
            ...mockMexErrand_base.data,
            extraParameters: mockMexErrand_base.data.extraParameters.map((p) =>
              p.key === 'contractId' ? { ...p, values: [activeContractId] } : p
            ),
          },
        };

        beforeEach(() => {
          // Override errand intercept to use errand with ACTIVE contract ID
          cy.intercept('GET', '**/errand/errandNumber/*', mockMexErrandWithActiveContract).as('getErrand');
          cy.intercept('GET', `**/contracts/${activeContractId}`, mockActiveLeaseAgreement).as('getActiveContract');
          // Intercept contract attachments for the ACTIVE contract
          cy.intercept('GET', `**/contracts/2281/${activeContractId}/attachments/*`, mockContractAttachment).as(
            'getActiveContractAttachment'
          );

          // Visit and wait for page load
          cy.visit(`/arende/${mockMexErrand_base.data.id}`);
          cy.wait('@getErrand');
          cy.get('.sk-cookie-consent-btn-wrapper').contains('Godkänn alla').click();
          cy.wait('@getActiveContract');
          cy.get('.sk-tabs-list button').contains(`Avtal`).click({ force: true });
          cy.get('[data-cy="contract-type-select"]').should('exist');
        });

        it('shows warning banner for ACTIVE contracts', () => {
          cy.get('[data-cy="non-draft-warning-banner"]').should('exist');
          cy.get('[data-cy="non-draft-warning-banner"]').should(
            'contain.text',
            'Avtalet är inte längre ett utkast. Endast fakturareferens och fakturamottagare kan ändras.'
          );
        });

        it('restricts editing of general fields for ACTIVE contracts', () => {
          cy.get('[data-cy="non-draft-warning-banner"]').should('exist');

          // Old contract ID should be read-only
          cy.get('[data-cy="old-contract-id-input"]').should('have.attr', 'readonly');

          // Open area disclosure and check property designations are disabled
          cy.get('[data-cy="area-disclosure"] button.sk-btn-tertiary').should('exist').click();
          cy.get('[data-cy="contract-property-designation-checkboxgroup"] input[type="checkbox"]').each(($checkbox) => {
            cy.wrap($checkbox).should('be.disabled');
          });

          // Open avtalstid disclosure and check fields are read-only/disabled
          cy.get('[data-cy="avtalstid-disclosure"] button.sk-btn-tertiary').should('exist').click();
          cy.get('[data-cy="avtalstid-start"]').should('have.attr', 'readonly');
          cy.get('[data-cy="avtalstid-end"]').should('have.attr', 'readonly');
          cy.get('[data-cy="lessee-notice-unit"]').should('be.disabled');
          cy.get('[data-cy="lessee-notice-period"]').should('have.attr', 'readonly');
          cy.get('[data-cy="lessor-notice-unit"]').should('be.disabled');
          cy.get('[data-cy="lessor-notice-period"]').should('have.attr', 'readonly');

          // Open lopande disclosure and check fields are read-only/disabled
          cy.get('[data-cy="lopande-disclosure"] button.sk-btn-tertiary').should('exist').click();
          cy.get('[data-cy="generate-invoice-true-radiobutton"]').should('be.disabled');
          cy.get('[data-cy="generate-invoice-false-radiobutton"]').should('be.disabled');
          cy.get('[data-cy="fees-yearly-input"]').should('have.attr', 'readonly');
          cy.get('[data-cy="indexed-true-radiobutton"]').should('be.disabled');
          cy.get('[data-cy="indexed-false-radiobutton"]').should('be.disabled');
          cy.get('[data-cy="invoice-interval-yearly-radiobutton"]').should('be.disabled');
          cy.get('[data-cy="invoice-interval-halfyearly-radiobutton"]').should('be.disabled');
          cy.get('[data-cy="invoice-interval-quarterly-radiobutton"]').should('be.disabled');
        });

        it('allows editing of invoice reference and supplementary text for ACTIVE contracts', () => {
          cy.get('[data-cy="non-draft-warning-banner"]').should('exist');

          // Open lopande disclosure
          cy.get('[data-cy="lopande-disclosure"] button.sk-btn-tertiary').should('exist').click();

          // Invoice reference (markup) should still be editable
          cy.get('[data-cy="invoice-markup-input"]').should('not.have.attr', 'readonly');
          cy.get('[data-cy="invoice-markup-input"]').clear().type('NEW-REF-456');
          cy.get('[data-cy="invoice-markup-input"]').should('have.value', 'NEW-REF-456');

          // Kompletterande avitext should still be editable
          cy.get('[data-cy="fees-additional-information-1-input"]').should('not.have.attr', 'readonly');
          cy.get('[data-cy="fees-additional-information-1-input"]').clear().type('Extra info');
          cy.get('[data-cy="fees-additional-information-1-input"]').should('have.value', 'Extra info');
        });

        it('does not allow adding or removing parties for ACTIVE contracts but allows editing roles', () => {
          cy.get('[data-cy="non-draft-warning-banner"]').should('exist');

          // For ACTIVE contracts, add party button should not exist
          cy.get('[data-cy="add-party-button"]').should('not.exist');
          // Remove button should not exist for non-DRAFT contracts
          cy.get('[data-cy="party-0-remove-button"]').should('not.exist');
          // Edit button should still exist (for editing roles like billing party)
          cy.get('[data-cy="party-0-edit-button"]').should('exist');
        });
      });
    });
  });
});
