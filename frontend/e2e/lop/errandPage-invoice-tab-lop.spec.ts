import { test, expect } from '../fixtures/base.fixture';
import { invoiceSettings } from '@supportmanagement/services/invoiceSettings';
import { mockAdmins } from '../case-data/fixtures/mockAdmins';
import { mockMe } from '../case-data/fixtures/mockMe';
import { mockConversationMessages, mockConversations } from './fixtures/mockConversations';
import { mockLegalEntityResponse } from './fixtures/mockLegalEntityResponse';
import { mockMetaData } from './fixtures/mockMetadata';
import { mockPortalPersonData_external, mockPortalPersonData_internal } from './fixtures/mockPortalPersonData';
import { mockRelations } from './fixtures/mockRelations';
import { mockSupportAdminsResponse } from './fixtures/mockSupportAdmins';
import {
  mockSupportAttachments,
  mockSupportErrand,
  mockSupportErrandCommunication,
  mockSupportNotes,
} from './fixtures/mockSupportErrands';

test.describe('Invoice tab', () => {
  test.beforeEach(async ({ page, mockRoute }) => {
    await mockRoute('**/portalpersondata/personal/INTERNALUSER', mockPortalPersonData_internal, { method: 'GET' });
    await mockRoute('**/portalpersondata/personal/EXTERNALUSER', mockPortalPersonData_external, { method: 'GET' });
    await mockRoute('**/administrators', mockAdmins, { method: 'GET' });
    await mockRoute('**/users/admins', mockSupportAdminsResponse, { method: 'GET' });
    await mockRoute('**/me', mockMe, { method: 'GET' });
    await mockRoute('**/featureflags', [], { method: 'GET' });
    await mockRoute('**/supportmetadata/2281', mockMetaData, { method: 'GET' });
    await mockRoute('**/supportnotes/2281/*', mockSupportNotes, { method: 'GET' });
    await mockRoute('**/supportattachments/2281/errands/*/attachments', mockSupportAttachments, { method: 'GET' });
    await mockRoute('**/supportmessage/2281/errands/*/communication', mockSupportErrandCommunication, { method: 'GET' });
    await mockRoute('**/billingrecords', {}, { method: 'POST' });
    await mockRoute('**/organization', {
      data: {
        ...mockLegalEntityResponse.data,
        partyId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
      },
    }, { method: 'POST' });
    await mockRoute('**/sourcerelations/**/**', mockRelations, { method: 'GET' });
    await mockRoute('**/targetrelations/**/**', mockRelations, { method: 'GET' });
    await mockRoute('**/namespace/errands/**/communication/conversations', mockConversations, { method: 'GET' });
    await mockRoute('**/errands/**/communication/conversations/*/messages', mockConversationMessages, { method: 'GET' });
  });

  const goToInvoiceTab = async (page: any, mockRoute: any, dismissCookieConsent: any, mockSupportErrand_billing: any) => {
    await mockRoute('**/supporterrands/2281/c9a96dcb-24b1-479b-84cb-2cc0260bb490', mockSupportErrand_billing, { method: 'GET' });
    await mockRoute(`**/supporterrands/errandnumber/${mockSupportErrand.errandNumber}`, mockSupportErrand_billing, { method: 'GET' });
    await mockRoute('**/supporterrands/2281/c9a96dcb-24b1-479b-84cb-2cc0260bb490', mockSupportErrand_billing, { method: 'PATCH' });

    await page.goto(`arende/${mockSupportErrand.errandNumber}`);
    await page.waitForResponse((resp: any) => resp.url().includes('supporterrands/errandnumber') && resp.status() === 200);
    await dismissCookieConsent();
    await page.getByRole('button', { name: 'Fakturering' }).click();
  };

  test('saves an internal invoice correctly', async ({ page, mockRoute, dismissCookieConsent }) => {
    // FIXME During 2025 this test will fail due to updated invoiceData in 2026 - see file
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

    await goToInvoiceTab(page, mockRoute, dismissCookieConsent, mockSupportErrand_billing);

    const mockOrgId = mockPortalPersonData_internal.data.orgTree.split('|').slice(1, 2)[0];
    const internalInvoiceType = invoiceSettings.invoiceTypes.find(
      (t) => t.invoiceType === 'Extra löneutbetalning - Systemet'
    )?.internal;
    const internalCustomer = invoiceSettings.customers.internal.find((c) => c.orgId[0] === mockOrgId);
    const baseData = {
      category: 'SALARY_AND_PENSION',
      status: 'NEW',
      type: 'INTERNAL',
      invoice: {
        customerId: invoiceSettings.customers.internal.find((c) => c.orgId[0] === mockOrgId)?.customerId.toString(),
        description: 'Extra löneutbetalning - Systemet',
        customerReference: mockPortalPersonData_internal.data.referenceNumber,
        ourReference: mockMe.data.name,
        invoiceRows: [
          {
            descriptions: [`Ärendenummer: ${mockSupportErrand_billing.errandNumber}`],
            detailedDescriptions: [],
            costPerUnit: 310,
            quantity: 1,
            accountInformation: [
              {
                amount: 310,
                costCenter: internalInvoiceType?.accountInformation.costCenter,
                subaccount: internalInvoiceType?.accountInformation.subaccount,
                department: internalInvoiceType?.accountInformation.department,
                activity: '5756',
                counterpart: internalCustomer?.counterpart,
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
                costCenter: internalInvoiceType?.accountInformation.costCenter,
                subaccount: internalInvoiceType?.accountInformation.subaccount,
                department: internalInvoiceType?.accountInformation.department,
                activity: internalInvoiceType?.accountInformation.activity,
                project: '11041',
                counterpart: internalCustomer?.counterpart,
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

    const [saveResponse] = await Promise.all([
      page.waitForResponse(
        (resp: any) => resp.url().includes('billingrecords') && resp.request().method() === 'POST'
      ),
      page.locator('[data-cy="save-invoice-button"]').click(),
    ]);

    const saveRequestBody = saveResponse.request().postDataJSON();
    expect(saveRequestBody).toEqual(baseData);
    expect(saveRequestBody.category).toEqual(baseData.category);
    expect(saveRequestBody.status).toEqual(baseData.status);
    expect(saveRequestBody.type).toEqual(baseData.type);
    expect(saveRequestBody.extraParameters).toEqual(baseData.extraParameters);
    expect(saveRequestBody.invoice.customerId).toEqual(baseData.invoice.customerId);
    expect(saveRequestBody.invoice.description).toEqual(baseData.invoice.description);
    expect(saveRequestBody.invoice.customerReference).toEqual(baseData.invoice.customerReference);
    expect(saveRequestBody.invoice.ourReference).toEqual(baseData.invoice.ourReference);
    expect(saveRequestBody.invoice.invoiceRows[0]).toEqual(baseData.invoice.invoiceRows[0]);
    expect(saveRequestBody.invoice.invoiceRows[1]).toEqual(baseData.invoice.invoiceRows[1]);

    await page.waitForTimeout(500);

    // Change description
    await page.locator('[data-cy="invoice-description-input"]').selectOption('Extra beställning');
    const [descResponse] = await Promise.all([
      page.waitForResponse(
        (resp: any) => resp.url().includes('billingrecords') && resp.request().method() === 'POST'
      ),
      page.locator('[data-cy="save-invoice-button"]').click(),
    ]);

    const descRequestBody = descResponse.request().postDataJSON();
    const modifiedData = structuredClone(baseData);
    const invoiceType = invoiceSettings.invoiceTypes.find((t) => t.invoiceType === 'Extra beställning')?.internal;
    modifiedData.invoice.description = 'Extra beställning';
    if (invoiceType) {
      modifiedData.invoice.invoiceRows[0].costPerUnit = invoiceType.invoiceRows[0].costPerUnit;
      modifiedData.invoice.invoiceRows[0].accountInformation[0].amount = invoiceType.invoiceRows[0].costPerUnit;
      modifiedData.invoice.invoiceRows[1].costPerUnit = invoiceType.invoiceRows[1].costPerUnit;
      modifiedData.invoice.invoiceRows[1].accountInformation[0].amount = invoiceType.invoiceRows[1].costPerUnit;
    }
    expect(descRequestBody).toEqual(modifiedData);

    await page.waitForTimeout(500);

    // Change customer
    await page.locator('[data-cy="customerId-input"]').selectOption('40');
    const [custResponse] = await Promise.all([
      page.waitForResponse(
        (resp: any) => resp.url().includes('billingrecords') && resp.request().method() === 'POST'
      ),
      page.locator('[data-cy="save-invoice-button"]').click(),
    ]);

    const custRequestBody = custResponse.request().postDataJSON();
    const modifiedData2 = structuredClone(baseData);
    const counterpart = invoiceSettings.customers.internal.find((c) => c.customerId === 40)?.counterpart;
    modifiedData2.invoice.customerId = '40';
    if (counterpart) {
      modifiedData2.invoice.invoiceRows[0].accountInformation[0].counterpart = counterpart;
      modifiedData2.invoice.invoiceRows[1].accountInformation[0].counterpart = counterpart;
    }
    expect(custRequestBody).toEqual(modifiedData2);

    await page.waitForTimeout(500);

    // Change activity
    await page.locator('[data-cy="activity-input"]').selectOption('5757');
    const [actResponse] = await Promise.all([
      page.waitForResponse(
        (resp: any) => resp.url().includes('billingrecords') && resp.request().method() === 'POST'
      ),
      page.locator('[data-cy="save-invoice-button"]').click(),
    ]);

    const actRequestBody = actResponse.request().postDataJSON();
    const modifiedData3 = structuredClone(baseData);
    const costcenter = invoiceSettings.activities.find((a) => a.value === '5757')?.costCenter;
    modifiedData3.invoice.invoiceRows.forEach((row) => {
      row.accountInformation[0].activity = '5757';
      row.accountInformation[0].costCenter = costcenter;
    });
    expect(actRequestBody.invoice.invoiceRows[0].accountInformation).toEqual(
      modifiedData3.invoice.invoiceRows[0].accountInformation
    );
  });

  test('saves an external invoice correctly', async ({ page, mockRoute, dismissCookieConsent }) => {
    // FIXME During 2025 this test will fail due to updated invoiceData in 2026 - see file
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

    await goToInvoiceTab(page, mockRoute, dismissCookieConsent, mockSupportErrand_billing);
    await page.waitForResponse((resp: any) => resp.url().includes('organization'));

    const externalInvoiceType = invoiceSettings.invoiceTypes.find(
      (t) => (t.invoiceType = 'Extra löneutbetalning - Systemet')
    )?.external;
    const externalCustomer = invoiceSettings.customers.external.find(
      (c) => c.companyId === mockPortalPersonData_external.data.companyId
    );
    const baseData = {
      category: 'SALARY_AND_PENSION',
      status: 'NEW',
      type: 'EXTERNAL',
      invoice: {
        customerId: mockPortalPersonData_external.data.companyId.toString(),
        description: 'Extra löneutbetalning - Systemet',
        customerReference: externalCustomer?.customerReference,
        ourReference: mockMe.data.name,
        invoiceRows: [
          {
            descriptions: [`Ärendenummer: ${mockSupportErrand_billing.errandNumber}`],
            detailedDescriptions: [],
            costPerUnit: 316,
            quantity: 1,
            vatCode: '00',
            accountInformation: [
              {
                amount: 310,
                costCenter: externalInvoiceType?.accountInformation.costCenter,
                subaccount: externalInvoiceType?.accountInformation.subaccount,
                department: externalInvoiceType?.accountInformation.department,
                activity: externalInvoiceType?.accountInformation.activity,
                counterpart: externalCustomer?.counterpart,
              },
              {
                amount: 6,
                costCenter: externalInvoiceType?.accountInformation.costCenter,
                subaccount: externalInvoiceType?.accountInformation.subaccount,
                department: externalInvoiceType?.accountInformation.department,
                activity: externalInvoiceType?.accountInformation.activity,
                counterpart: externalCustomer?.counterpart,
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
    };

    const [saveResponse] = await Promise.all([
      page.waitForResponse(
        (resp: any) => resp.url().includes('billingrecords') && resp.request().method() === 'POST'
      ),
      page.locator('[data-cy="save-invoice-button"]').click(),
    ]);

    const saveRequestBody = saveResponse.request().postDataJSON();
    expect(saveRequestBody).toEqual(baseData);
    expect(saveRequestBody.category).toEqual(baseData.category);
    expect(saveRequestBody.status).toEqual(baseData.status);
    expect(saveRequestBody.type).toEqual(baseData.type);
    expect(saveRequestBody.extraParameters).toEqual(baseData.extraParameters);
    expect(saveRequestBody.invoice.customerId).toEqual(baseData.invoice.customerId);
    expect(saveRequestBody.invoice.description).toEqual(baseData.invoice.description);
    expect(saveRequestBody.invoice.customerReference).toEqual(baseData.invoice.customerReference);
    expect(saveRequestBody.invoice.ourReference).toEqual(baseData.invoice.ourReference);
    expect(saveRequestBody.invoice.invoiceRows[0]).toEqual(baseData.invoice.invoiceRows[0]);
    expect(saveRequestBody.invoice.invoiceRows[1]).toEqual(baseData.invoice.invoiceRows[1]);
  });
});
