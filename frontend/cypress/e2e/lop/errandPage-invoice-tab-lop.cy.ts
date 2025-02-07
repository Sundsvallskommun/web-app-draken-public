/// <reference types="cypress" />

import { onlyOn } from '@cypress/skip-test';
import { invoiceSettings } from '@supportmanagement/services/invoiceSettings';
import { mockAdmins } from '../case-data/fixtures/mockAdmins';
import { mockMe } from '../case-data/fixtures/mockMe';
import { mockLegalEntityResponse } from './fixtures/mockLegalEntityResponse';
import { mockMetaData } from './fixtures/mockMetadata';
import { mockPortalPersonData_external, mockPortalPersonData_internal } from './fixtures/mockPortalPersonData';
import { mockSupportAdminsResponse } from './fixtures/mockSupportAdmins';
import {
  mockSupportAttachments,
  mockSupportErrand,
  mockSupportErrandCommunication,
  mockSupportNotes,
} from './fixtures/mockSupportErrands';
import { mock } from 'node:test';

onlyOn(Cypress.env('application_name') === 'LOP', () => {
  describe('Invoice tab', () => {
    beforeEach(() => {
      cy.intercept('GET', '**/portalpersondata/PERSONAL/INTERNALUSER', mockPortalPersonData_internal).as(
        'getPortalPersonData_internal'
      );
      cy.intercept('GET', '**/portalpersondata/PERSONAL/EXTERNALUSER', mockPortalPersonData_external).as(
        'getPortalPersonData_external'
      );
      cy.intercept('GET', '**/administrators', mockAdmins);
      cy.intercept('GET', '**/users/admins', mockSupportAdminsResponse);
      cy.intercept('GET', '**/me', mockMe);
      cy.intercept('GET', '**/supportmetadata/2281', mockMetaData).as('getSupportMetadata');
      cy.intercept('GET', '**/supportnotes/2281/*', mockSupportNotes).as('getNotes');
      cy.intercept('GET', '**/supportattachments/2281/errands/*/attachments', mockSupportAttachments);
      cy.intercept('GET', '**/supportmessage/2281/errands/*/communication', mockSupportErrandCommunication).as(
        'getMessages'
      );
      cy.intercept('POST', '**/billingrecords', {}).as('saveBillingRecord');
      cy.intercept('POST', '**/organization', {
        data: {
          ...mockLegalEntityResponse.data,
          partyId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        },
      }).as('getOrganization');
    });

    const goToInvoiceTab = () => {
      cy.visit('arende/2281/c9a96dcb-24b1-479b-84cb-2cc0260bb490');
      cy.wait('@getSupportErrand');
      cy.get('.sk-cookie-consent-btn-wrapper').should('exist').contains('Godkänn alla').click();
      cy.get('button').contains('Fakturering').should('exist').click();
    };

    it('saves an internal invoice correctly', () => {
      const mockSupportErrand_billing = mockSupportErrand;
      mockSupportErrand_billing.stakeholders = mockSupportErrand_billing.stakeholders.slice(0, 1);
      mockSupportErrand_billing.stakeholders.forEach((stakeholder: any) => {
        stakeholder.role = 'MANAGER';
        stakeholder.parameters = [
          {
            key: 'username',
            displayName: 'Användarnamn',
            values: ['INTERNALUSER'],
          },
        ];
      });
      cy.intercept('GET', '**/supporterrands/2281/c9a96dcb-24b1-479b-84cb-2cc0260bb490', mockSupportErrand_billing).as(
        'getSupportErrand'
      );
      cy.intercept(
        'PATCH',
        '**/supporterrands/2281/c9a96dcb-24b1-479b-84cb-2cc0260bb490',
        mockSupportErrand_billing
      ).as('updateSupportErrand');
      goToInvoiceTab();
      const mockOrgId = mockPortalPersonData_internal.data.orgTree.split('|').slice(1, 2)[0];
      cy.get('[data-cy="save-invoice-button"]').should('exist').click();
      cy.wait('@saveBillingRecord').should(({ request, response }) => {
        const internalInvoiceType = invoiceSettings.invoiceTypes.find(
          (t) => (t.invoiceType = 'Extra löneutbetalning - Systemet')
        ).internal;
        const internalCustomer = invoiceSettings.customers.internal.find((c) => c.orgId[0] === mockOrgId);
        expect(request.body).to.deep.equal({
          category: 'SALARY_AND_PENSION',
          status: 'NEW',
          type: 'INTERNAL',
          invoice: {
            customerId: invoiceSettings.customers.internal.find((c) => c.orgId[0] === mockOrgId).customerId.toString(),
            description: 'Extra löneutbetalning - Systemet',
            customerReference: mockPortalPersonData_internal.data.referenceNumber,
            ourReference: mockMe.data.name,
            referenceId: 'N/A',
            invoiceRows: [
              {
                descriptions: [`Ärendenummer: ${mockSupportErrand_billing.errandNumber}`],
                detailedDescriptions: [],
                costPerUnit: 300,
                quantity: 1,
                accountInformation: [
                  {
                    amount: 300,
                    costCenter: internalInvoiceType.accountInformation.costCenter,
                    subaccount: internalInvoiceType.accountInformation.subaccount,
                    department: internalInvoiceType.accountInformation.department,
                    activity: '5756',
                    counterpart: internalCustomer.counterpart,
                  },
                ],
              },
              {
                descriptions: ['Utvecklingskostnad 2%'],
                detailedDescriptions: [],
                costPerUnit: 6,
                quantity: 1,
                accountInformation: [
                  {
                    amount: 6,
                    costCenter: internalInvoiceType.accountInformation.costCenter,
                    subaccount: internalInvoiceType.accountInformation.subaccount,
                    department: internalInvoiceType.accountInformation.department,
                    activity: internalInvoiceType.accountInformation.activity,
                    counterpart: internalCustomer.counterpart,
                  },
                ],
              },
            ],
          },
          extraParameters: {
            errandNumber: mockSupportErrand_billing.errandNumber,
            errandId: mockSupportErrand_billing.id,
            referenceName: `${mockSupportErrand_billing.stakeholders[0].firstName} ${mockSupportErrand_billing.stakeholders[0].lastName}`,
          },
        });
      });
    });

    it('saves an external invoice correctly', () => {
      const mockSupportErrand_billing = mockSupportErrand;
      mockSupportErrand_billing.stakeholders = mockSupportErrand_billing.stakeholders.slice(0, 1);
      mockSupportErrand_billing.stakeholders.forEach((stakeholder: any) => {
        stakeholder.role = 'MANAGER';
        stakeholder.parameters = [
          {
            key: 'username',
            displayName: 'Användarnamn',
            values: ['EXTERNALUSER'],
          },
        ];
      });
      cy.intercept('GET', '**/supporterrands/2281/c9a96dcb-24b1-479b-84cb-2cc0260bb490', mockSupportErrand_billing).as(
        'getSupportErrand'
      );
      cy.intercept(
        'PATCH',
        '**/supporterrands/2281/c9a96dcb-24b1-479b-84cb-2cc0260bb490',
        mockSupportErrand_billing
      ).as('updateSupportErrand');
      goToInvoiceTab();
      cy.wait('@getOrganization');
      const externalInvoiceType = invoiceSettings.invoiceTypes.find(
        (t) => (t.invoiceType = 'Extra löneutbetalning - Systemet')
      ).external;
      const externalCustomer = invoiceSettings.customers.external.find(
        (c) => c.companyId === mockPortalPersonData_external.data.companyId
      );
      cy.get('[data-cy="save-invoice-button"]').should('exist').click();
      cy.wait('@saveBillingRecord').should(({ request, response }) => {
        expect(request.body).to.deep.equal({
          category: 'SALARY_AND_PENSION',
          status: 'NEW',
          type: 'EXTERNAL',
          invoice: {
            customerId: mockPortalPersonData_external.data.company,
            description: 'Extra löneutbetalning - Systemet',
            customerReference: externalCustomer.customerReference,
            ourReference: mockMe.data.name,
            referenceId: 'N/A',
            invoiceRows: [
              {
                descriptions: [`Ärendenummer: ${mockSupportErrand_billing.errandNumber}`],
                detailedDescriptions: [],
                costPerUnit: 306,
                quantity: 1,
                vatCode: '25',
                accountInformation: [
                  {
                    amount: 300,
                    costCenter: externalInvoiceType.accountInformation.costCenter,
                    subaccount: externalInvoiceType.accountInformation.subaccount,
                    department: externalInvoiceType.accountInformation.department,
                    activity: externalInvoiceType.accountInformation.activity,
                    counterpart: externalCustomer.counterpart,
                  },
                  {
                    amount: 6,
                    costCenter: externalInvoiceType.accountInformation.costCenter,
                    subaccount: externalInvoiceType.accountInformation.subaccount,
                    department: externalInvoiceType.accountInformation.department,
                    activity: externalInvoiceType.accountInformation.activity,
                    counterpart: externalCustomer.counterpart,
                    project: '11041',
                  },
                ],
              },
            ],
          },
          recipient: {
            partyId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
            organizationName: 'Sundsvall Elnät AB',
            addressDetails: {
              street: mockLegalEntityResponse.data.address.addressArea,
              careOf: mockLegalEntityResponse.data.postAddress.coAdress,
              city: mockLegalEntityResponse.data.address.city,
              postalCode: mockLegalEntityResponse.data.postAddress.postalCode,
            },
          },
          extraParameters: {
            errandId: mockSupportErrand_billing.id,
            errandNumber: mockSupportErrand_billing.errandNumber,
            referenceName: `${mockSupportErrand_billing.stakeholders[0].firstName} ${mockSupportErrand_billing.stakeholders[0].lastName}`,
          },
        });
      });
    });
  });
});
