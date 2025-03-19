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
      cy.intercept('GET', '**/portalpersondata/personal/INTERNALUSER', mockPortalPersonData_internal).as(
        'getPortalPersonData_internal'
      );
      cy.intercept('GET', '**/portalpersondata/personal/EXTERNALUSER', mockPortalPersonData_external).as(
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
      const internalInvoiceType = invoiceSettings.invoiceTypes.find(
        (t) => (t.invoiceType = 'Extra löneutbetalning - Systemet')
      ).internal;
      const internalCustomer = invoiceSettings.customers.internal.find((c) => c.orgId[0] === mockOrgId);
      const baseData = {
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
      };
      cy.get('[data-cy="save-invoice-button"]').should('exist').click();
      cy.wait('@saveBillingRecord').should(({ request, response }) => {
        expect(request.body).to.deep.equal(baseData);
      });

      // Change description
      cy.get('[data-cy="invoice-description-input"]').select('Extra beställning');
      cy.get('[data-cy="save-invoice-button"]').click();
      cy.wait('@saveBillingRecord').should(({ request, response }) => {
        const modifiedData = structuredClone(baseData);
        const invoiceType = invoiceSettings.invoiceTypes.find((t) => t.invoiceType === 'Extra beställning').internal;
        modifiedData.invoice.description = 'Extra beställning';
        modifiedData.invoice.invoiceRows[0].costPerUnit = invoiceType.invoiceRows[0].costPerUnit;
        modifiedData.invoice.invoiceRows[0].accountInformation[0].amount = invoiceType.invoiceRows[0].costPerUnit;
        modifiedData.invoice.invoiceRows[1].costPerUnit = invoiceType.invoiceRows[1].costPerUnit;
        modifiedData.invoice.invoiceRows[1].accountInformation[0].amount = invoiceType.invoiceRows[1].costPerUnit;
        expect(request.body).to.deep.equal(modifiedData);
      });

      // Change customer
      cy.get('[data-cy="customerId-input"]').select('40');
      cy.get('[data-cy="save-invoice-button"]').click();
      cy.wait('@saveBillingRecord').should(({ request, response }) => {
        const modifiedData = structuredClone(baseData);
        const counterpart = invoiceSettings.customers.internal.find((c) => c.customerId === 40).counterpart;
        modifiedData.invoice.customerId = '40';
        modifiedData.invoice.invoiceRows[0].accountInformation[0].counterpart = counterpart;
        modifiedData.invoice.invoiceRows[1].accountInformation[0].counterpart = counterpart;
        expect(request.body).to.deep.equal(modifiedData);
      });

      // Change activity
      cy.get('[data-cy="activity-input"]').select('5757');
      cy.get('[data-cy="save-invoice-button"]').click();
      cy.wait('@saveBillingRecord').should(({ request, response }) => {
        const modifiedData = structuredClone(baseData);
        const costcenter = invoiceSettings.activities.find((a) => a.value === '5757').costCenter;
        modifiedData.invoice.invoiceRows.forEach((row) => {
          row.accountInformation[0].activity = '5757';
          row.accountInformation[0].costCenter = costcenter;
        });
        expect(request.body.invoice.invoiceRows[0].accountInformation).to.deep.equal(
          modifiedData.invoice.invoiceRows[0].accountInformation
        );
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
            customerId: mockPortalPersonData_external.data.companyId.toString(),
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
                vatCode: '00',
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
              careOf: '',
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
