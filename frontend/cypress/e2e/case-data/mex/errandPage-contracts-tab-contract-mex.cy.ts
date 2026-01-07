/// <reference types="cypress" />

import {
  Contract,
  ContractType,
  IntervalType,
  InvoicedIn,
  LeaseType,
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
import { mockConversationMessages, mockConversations } from '../fixtures/mockConversations';
import { mockJsonSchema } from '../fixtures/mockJsonSchema';
import { mockMe } from '../fixtures/mockMe';
import { mockMessages } from '../fixtures/mockMessages';
import { mockMexErrand_base } from '../fixtures/mockMexErrand';
import { mockRelations } from '../fixtures/mockRelations';
import { getErrandPropertyDesignations } from '@casedata/services/casedata-facilities-service';
import { IErrand } from '@casedata/interfaces/errand';
import { Role } from '@casedata/interfaces/role';

const takeElementSnapshot = (dataCySelector: string) => {
  cy.get(`[data-cy="${dataCySelector}"]`).scrollIntoView().matchImageSnapshot(dataCySelector);
};

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
      cy.intercept('GET', '**/metadata/jsonschemas/FTErrandAssets/latest', mockJsonSchema).as('getJsonSchema');
    });

    const contractText = {
      data: {
        contractId: '2024-01026',
        externalReferenceId: '123123',
        status: 'ACTIVE',
        propertyDesignations: ['SUNDSVALL BLA'],
        type: 'LEASE_AGREEMENT',
      },
    };

    const visitErrandContractTab = () => {
      cy.intercept('GET', '**/errand/101', mockMexErrand_base).as('getErrandById');
      cy.intercept('GET', '**/errand/errandNumber/*', mockMexErrand_base).as('getErrand');
      cy.visit(`/arende/${mockMexErrand_base.data.municipalityId}/${mockMexErrand_base.data.id}`);
      cy.wait('@getErrand');
      cy.get('.sk-cookie-consent-btn-wrapper').contains('Godkänn alla').click();
      cy.wait('@getContract');
      cy.get('.sk-tabs-list button').eq(4).should('have.text', `Avtal`).click({ force: true });
      cy.get('[data-cy="contract-type-select"]').should('exist');
    };

    const visitErrandWithoutContract = () => {
      const mockMexErrand_base_without_contract = { ...mockMexErrand_base };
      mockMexErrand_base_without_contract.data.extraParameters = mockMexErrand_base.data.extraParameters.filter(
        (p) => p.key !== 'contractId'
      );
      cy.intercept('GET', '**/errand/101', mockMexErrand_base_without_contract).as('getErrandByIdNoContract');
      cy.intercept('GET', '**/errand/errandNumber/*', mockMexErrand_base_without_contract).as('getErrandNoContract');
      cy.visit(`/arende/${mockMexErrand_base.data.municipalityId}/${mockMexErrand_base.data.id}`);
      cy.wait('@getErrandNoContract');
      cy.get('.sk-cookie-consent-btn-wrapper').contains('Godkänn alla').click();
      cy.get('.sk-tabs-list button').eq(4).should('have.text', `Avtal`).click({ force: true });
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
      visitErrandContractTab();
      const landLeaseType = [
        { key: 'parties', label: 'Parter' },
        { key: 'area', label: 'Område' },
        { key: 'avtalstid', label: 'Avtalstid och uppsägning' },
        { key: 'lopande', label: 'Löpande avgift' },
        { key: 'engangs', label: 'Engångsfakturering' },
        { key: 'signerade', label: 'Signerade avtal' },
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
      cy.get('[data-cy="engangs-disclosure"]').contains('Engångsfakturering').should('exist');
      cy.get('[data-cy="signerade-disclosure"]').contains('Signerade avtal').should('exist');
      takeElementSnapshot('contract-wrapper');
    });

    // Parter
    it('manages parties in lease agreements', () => {
      visitErrandContractTab();
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
      cy.get('[data-cy="lessee-notice-period"]').should('exist').clear().type('15');
      cy.get('[data-cy="lessor-notice-period"]').should('exist').clear().type('1');

      cy.get('[data-cy="area-disclosure"] button.sk-btn-tertiary').should('exist').click();
      cy.get('[data-cy="area-disclosure"] button.sk-btn-primary').should('exist').contains('Spara').click();

      takeElementSnapshot('parties-disclosure');

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
    it('manages property designations in lease agreements', () => {
      visitErrandContractTab();
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
      cy.get('[data-cy="lessee-notice-period"]').should('exist').clear().type('15');
      cy.get('[data-cy="lessor-notice-period"]').should('exist').clear().type('1');

      takeElementSnapshot('area-disclosure');

      cy.get('[data-cy="area-disclosure"] button.sk-btn-primary').contains('Spara').should('exist').click();
      cy.wait('@putContract').should(({ request }) => {
        const leaseAgreement: Contract = request.body;
        expect(leaseAgreement.propertyDesignations).to.deep.equal([...errandProperties, ...contractProperties]);
      });
    });

    // Avtalstid och uppsägning
    it('manages tenancy period automatically in lease agreements', () => {
      visitErrandContractTab();
      cy.intercept('GET', '**/errand/101', mockMexErrand_base).as('getErrand');
      cy.get('[data-cy="avtalstid-disclosure"] button.sk-btn-tertiary').should('exist').click();

      cy.get('[data-cy="avtalstid-start"]').should('exist').type('2024-12-01');
      cy.get('[data-cy="avtalstid-end"]').should('exist').type('2025-12-01');

      cy.get('[data-cy="lessee-notice-unit"]').should('exist').select(TimeUnit.DAYS);
      cy.get('[data-cy="lessee-notice-period"]').should('exist').clear().type('15');
      cy.get('[data-cy="lessee-notice-party"]').should('have.value', 'LESSEE');

      cy.get('[data-cy="lessor-notice-unit"]').should('exist').select(TimeUnit.MONTHS);
      cy.get('[data-cy="lessor-notice-period"]').should('exist').clear().type('1');
      cy.get('[data-cy="lessor-notice-party"]').should('have.value', 'LESSOR');

      cy.get('[data-cy="autoextend-true-radiobutton"]').should('exist').check({ force: true });
      cy.get('[data-cy="extension-unit-selector"]').should('exist').select(TimeUnit.YEARS);
      cy.get('[data-cy="extension-input"]').should('exist').type('180');

      takeElementSnapshot('avtalstid-disclosure');

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

      cy.get('[data-cy="invoice-markup-input"]').should('exist');

      cy.get('[data-cy="fees-additional-information-0-input"]').should('exist');
      cy.get('[data-cy="fees-additional-information-1-input"]').should('exist').type('Foobar');

      cy.get('[data-cy="avtalstid-disclosure"] button.sk-btn-tertiary').should('exist').click();
      cy.get('[data-cy="lessee-notice-period"]').should('exist').clear().type('15');
      cy.get('[data-cy="lessor-notice-period"]').should('exist').clear().type('1');

      takeElementSnapshot('lopande-disclosure');

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

    it('manages creating a new lease agreement with correct default values', () => {
      visitErrandWithoutContract();
      cy.get('[data-cy="contract-type-select"]').should('exist').select(ContractType.LEASE_AGREEMENT);
      cy.get('[data-cy="contract-subtype-select"]').should('exist').select(LeaseType.USUFRUCT_MOORING);

      cy.get('[data-cy="Upplåtare-table"]').should('exist');

      cy.get('[data-cy="Upplåtare-table"]')
        .should('exist')
        .find('[data-cy="Upplåtare-row-0"]')
        .should('exist')
        .within(() => {
          cy.get('[data-cy="party-0-name"]').should('exist').and('contain.text', 'Test Upplåtarsson');
          cy.get('[data-cy="party-0-address"]').should('exist').and('contain.text', 'Testgata 1');
          cy.get('[data-cy="party-0-role"]').should('exist').and('contain.text', 'Upplåtare');
        });

      cy.get('[data-cy="Arrendatorer-table"]').should('exist');

      cy.get('[data-cy="Arrendatorer-table"]')
        .should('exist')
        .find('[data-cy="Arrendatorer-row-0"]')
        .should('exist')
        .within(() => {
          cy.get('[data-cy="party-0-name"]').should('exist').and('contain.text', 'Test Arrendatorsson');
          cy.get('[data-cy="party-0-address"]').should('exist').and('contain.text', 'Testgata 41');
          cy.get('[data-cy="party-0-role"]').should('exist').and('contain.text', 'Arrendator');
          cy.get('[data-cy="party-0-role"]').should('exist').and('contain.text', 'Fakturamottagare');
        });

      cy.get('[data-cy="parties-disclosure"]').find('[data-cy="save-contract-button"]').should('exist').click();

      cy.wait('@postContract').should(({ request }) => {
        const leaseAgreement: Contract = request.body;
        expect(leaseAgreement.type).to.equal(ContractType.LEASE_AGREEMENT);
        expect(leaseAgreement.leaseType).to.equal(LeaseType.USUFRUCT_MOORING);
        const lessor = leaseAgreement.stakeholders.find((s) => s.roles.includes(StakeholderRole.LESSOR));
        const lessee = leaseAgreement.stakeholders.find((s) => s.roles.includes(StakeholderRole.LESSEE));
        expect(lessor.firstName).to.equal(
          mockMexErrand_base.data.stakeholders.find((x) => x.roles.includes(Role.PROPERTY_OWNER))?.firstName ?? ''
        );
        expect(lessee.firstName).to.equal(
          mockMexErrand_base.data.stakeholders.find((x) => x.roles.includes(Role.LEASEHOLDER))?.firstName ?? ''
        );
        expect(leaseAgreement.notices).to.deep.equal([
          { party: 'LESSEE', periodOfNotice: 3, unit: TimeUnit.MONTHS },
          { party: 'LESSOR', periodOfNotice: 3, unit: TimeUnit.MONTHS },
        ]);
        expect(leaseAgreement.extension).to.deep.equal({
          unit: TimeUnit.DAYS,
        });
        expect(leaseAgreement).to.deep.equal({
          extension: { unit: 'DAYS' },
          fees: {
            yearly: null,
            monthly: 0,
            total: null,
            currency: 'SEK',
            additionalInformation: ['Avgift, båtplats', ''],
          },
          invoicing: { invoicedIn: 'ADVANCE' },
          start: '',
          end: '',
          notices: [
            { party: 'LESSEE', periodOfNotice: 3, unit: 'MONTHS' },
            { party: 'LESSOR', periodOfNotice: 3, unit: 'MONTHS' },
          ],
          propertyDesignations: [],
          contractId: '',
          type: 'LEASE_AGREEMENT',
          leaseType: 'USUFRUCT_MOORING',
          status: 'DRAFT',
          externalReferenceId: '',
          stakeholders: [
            {
              type: 'PERSON',
              roles: ['CONTACT_PERSON', 'LESSEE', 'PRIMARY_BILLING_PARTY'],
              firstName: 'Test',
              lastName: 'Arrendatorsson',
              parameters: [{ key: 'extraParameter', values: [''] }],
              phone: { value: '0701740635' },
              email: { value: 'a@example.com' },
              address: {
                type: 'POSTAL_ADDRESS',
                streetAddress: 'Testgata 41',
                postalCode: '12345',
                town: 'Staden',
                country: '',
                attention: '',
                careOf: '',
              },
            },
            {
              type: 'PERSON',
              roles: ['CONTACT_PERSON', 'LESSOR'],
              firstName: 'Test',
              lastName: 'Upplåtarsson',
              parameters: [{ key: 'extraParameter', values: [''] }],
              phone: { value: '0701740635' },
              email: { value: 'a@example.com' },
              address: {
                type: 'POSTAL_ADDRESS',
                streetAddress: 'Testgata 1',
                postalCode: '12345',
                town: 'Staden',
                country: '',
                attention: '',
                careOf: '',
              },
            },
          ],
          extraParameters: [{ name: 'errandId', parameters: { errandId: '101' } }],
        });
      });
    });

    it('manages creating a new purchase agreement with correct default values', () => {
      visitErrandWithoutContract();

      // Switch to PURCHASE_AGREEMENT
      cy.get('[data-cy="contract-type-select"]').should('exist').select(ContractType.PURCHASE_AGREEMENT);

      cy.get('[data-cy="Upplåtare-table"]').should('not.exist');
      cy.get('[data-cy="Arrendatorer-table"]').should('not.exist');
      cy.get('[data-cy="Köpare-table"]').should('exist');
      cy.get('[data-cy="Säljare-table"]').should('exist');

      cy.get('[data-cy="Köpare-table"]')
        .should('exist')
        .find('[data-cy="Köpare-row-0"]')
        .should('exist')
        .within(() => {
          cy.get('[data-cy="party-0-name"]').should('exist').and('contain.text', 'Test Köparsson');
          cy.get('[data-cy="party-0-address"]').should('exist').and('contain.text', 'Testgata 2');
          cy.get('[data-cy="party-0-role"]').should('exist').and('contain.text', 'Köpare');
        });

      cy.get('[data-cy="Säljare-table"]')
        .should('exist')
        .find('[data-cy="Säljare-row-0"]')
        .should('exist')
        .within(() => {
          cy.get('[data-cy="party-0-name"]').should('exist').and('contain.text', 'Daniella Testarsson');
          cy.get('[data-cy="party-0-address"]').should('exist').and('contain.text', 'Testgata 41');
          cy.get('[data-cy="party-0-role"]').should('exist').and('contain.text', 'Säljare');
        });

      cy.get('[data-cy="parties-disclosure"]').find('[data-cy="save-contract-button"]').should('exist').click();

      cy.wait('@postContract').should(({ request }) => {
        const purchaseAgreement: Contract = request.body;
        expect(purchaseAgreement.type).to.equal(ContractType.PURCHASE_AGREEMENT);
        expect(purchaseAgreement.start).to.equal('');
        expect(purchaseAgreement.leaseType).to.be.undefined;
        const seller = purchaseAgreement.stakeholders.find((s) => s.roles.includes(StakeholderRole.SELLER));
        const buyer = purchaseAgreement.stakeholders.find((s) => s.roles.includes(StakeholderRole.BUYER));
        expect(seller.firstName).to.equal(
          mockMexErrand_base.data.stakeholders.find((x) => x.roles.includes(Role.SELLER))?.firstName ?? ''
        );
        expect(buyer.firstName).to.equal(
          mockMexErrand_base.data.stakeholders.find((x) => x.roles.includes(Role.BUYER))?.firstName ?? ''
        );
        expect(purchaseAgreement).to.deep.equal({
          contractId: '',
          externalReferenceId: '',
          propertyDesignations: [],
          extraParameters: [
            {
              name: 'errandId',
              parameters: {
                errandId: '101',
              },
            },
          ],
          status: Status.DRAFT,
          type: ContractType.PURCHASE_AGREEMENT,
          start: '',
          stakeholders: [
            {
              type: 'PERSON',
              roles: ['BUYER'],
              firstName: 'Test',
              lastName: 'Köparsson',
              parameters: [{ key: 'extraParameter', values: [''] }],
              phone: { value: '0701740635' },
              email: { value: 'a@example.com' },
              address: {
                type: 'POSTAL_ADDRESS',
                streetAddress: 'Testgata 2',
                postalCode: '12345',
                town: 'Staden',
                country: '',
                attention: '',
                careOf: '',
              },
            },
            {
              type: 'PERSON',
              roles: ['SELLER'],
              firstName: 'Daniella',
              lastName: 'Testarsson',
              parameters: [{ key: 'extraParameter', values: [''] }],
              phone: { value: '0701740635' },
              email: { value: 'a@example.com' },
              address: {
                type: 'POSTAL_ADDRESS',
                streetAddress: 'Testgata 41',
                postalCode: '12345',
                town: 'Staden',
                country: '',
                attention: '',
                careOf: '',
              },
            },
          ],
        });
      });
    });
  });
});
