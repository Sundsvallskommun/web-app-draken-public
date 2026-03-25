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
import { Role } from '@casedata/interfaces/role';
import { test, expect } from '../../fixtures/base.fixture';
import { mockAttachments } from '../fixtures/mockAttachments';
import { mockHistory } from '../fixtures/mockHistory';
import { mockPersonId } from '../fixtures/mockPersonId';
import { mockAdmins } from '../fixtures/mockAdmins';
import { mockAsset } from '../fixtures/mockAsset';
import { mockContractAttachment, mockLeaseAgreement } from '../fixtures/mockContract';
import { mockConversationMessages, mockConversations } from '../fixtures/mockConversations';
import { mockJsonSchema } from '../fixtures/mockJsonSchema';
import { mockMe } from '../fixtures/mockMe';
import { mockMessages } from '../fixtures/mockMessages';
import { mockMexErrand_base } from '../fixtures/mockMexErrand';
import { mockRelations } from '../fixtures/mockRelations';
import {
  mockEstateInfo11,
  mockEstateInfo12,
  mockSingleEstateByPropertyDesignation11,
  mockSingleEstateByPropertyDesignation12,
} from '../fixtures/mockEstateInfo';
import { mockEstatePropertyByDesignation } from '../fixtures/mockEstatePropertyByDesignation';

test.describe('Errand page contracts tab', () => {
  const contractText: { data: Contract } = {
    data: {
      contractId: '2024-01026',
      externalReferenceId: '123123',
      status: Status.ACTIVE,
      propertyDesignations: [],
      type: ContractType.LEASE_AGREEMENT,
    },
  };

  test.beforeEach(async ({ page, mockRoute }) => {
    await mockRoute('**/messages/MEX-2024-000280*', mockMessages, { method: 'GET' });
    await mockRoute('**/users/admins', mockAdmins, { method: 'GET' });
    await mockRoute('**/me', mockMe, { method: 'GET' });
    await mockRoute('**/featureflags', [], { method: 'GET' });
    await mockRoute('**/personid', mockPersonId, { method: 'POST' });
    await mockRoute('**/stakeholders/personNumber', mockMexErrand_base.data.stakeholders, { method: 'POST' });

    await page.route(/\/errand\/\d+\/attachments$/, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockAttachments) });
    }); // @getErrandAttachments
    await mockRoute('**/errands/*', { data: 'ok', message: 'ok' }, { method: 'PATCH' }); // @patchErrand
    await mockRoute('**/estateByPropertyDesignation/**', mockEstatePropertyByDesignation, { method: 'GET' }); // @getEstatePropertyByDesignation

    await mockRoute('**/errands/*/history', mockHistory, { method: 'GET' }); // @getHistory
    await page.route(/\/errand\/\d+\/messages$/, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockMessages) });
    });

    await mockRoute('**/contracts/2024-01026', mockLeaseAgreement, { method: 'GET' }); // @getContract
    await mockRoute('**/contracts', contractText, { method: 'POST' }); // @postContract
    await mockRoute('**/contracts/2024-01026', contractText, { method: 'PUT' }); // @putContract
    await mockRoute('**/contracts/2281/2024-01026/attachments/1', mockContractAttachment, { method: 'GET' }); // @getContractAttachment
    await mockRoute('**/contracts/2281/2024-01026/attachments/1', {}, { method: 'DELETE' }); // @deleteContractAttachment

    await mockRoute('**/errand/errandNumber/*', mockMexErrand_base, { method: 'GET' }); // @getErrand
    await mockRoute('**/sourcerelations/**/**', mockRelations, { method: 'GET' }); // @getSourceRelations
    await mockRoute('**/targetrelations/**/**', mockRelations, { method: 'GET' }); // @getTargetRelations
    await mockRoute('**/namespace/errands/**/communication/conversations', mockConversations, { method: 'GET' }); // @getConversations
    await mockRoute('**/errands/**/communication/conversations/*/messages', mockConversationMessages, { method: 'GET' }); // @getConversationMessages
    await mockRoute('**/assets**', mockAsset, { method: 'GET' }); // @getAssets
    await mockRoute('**/errands/**/extraparameters', { data: [], message: 'ok' }, { method: 'PATCH' }); // @saveExtraParameters
    await mockRoute('**/schemas/FTErrandAssets/latest', mockJsonSchema, { method: 'GET' }); // @getJsonSchema
    await mockRoute('**/schemas/*/ui-schema', { data: { id: 'mock-ui-schema-id', value: {} }, message: 'success' }, { method: 'GET' }); // @getUiSchema
    await mockRoute('**/estateInfo/**1:1', mockEstateInfo11, { method: 'GET' }); // @getEstateInfo
    await mockRoute('**/estateInfo/**1:2', mockEstateInfo12, { method: 'GET' }); // @getEstateInfo
    await mockRoute('**/singleEstateByPropertyDesignation/**1:1', mockSingleEstateByPropertyDesignation11, { method: 'GET' }); // @getEstateInfo
    await mockRoute('**/singleEstateByPropertyDesignation/**1:2', mockSingleEstateByPropertyDesignation12, { method: 'GET' }); // @getEstateInfo
  });

  const visitErrandContractTab = async (page, mockRoute, dismissCookieConsent) => {
    await mockRoute('**/errand/101', mockMexErrand_base, { method: 'GET' }); // @getErrandById
    await mockRoute('**/errand/errandNumber/*', mockMexErrand_base, { method: 'GET' }); // @getErrand
    await page.goto(`arende/${mockMexErrand_base.data.id}`);
    await page.waitForResponse((resp) => resp.url().includes('/errand/errandNumber/') && resp.status() === 200);
    await dismissCookieConsent();
    await page.waitForResponse((resp) => resp.url().includes('/contracts/2024-01026') && resp.status() === 200);
    const tab = page.locator('.sk-tabs-list button').nth(4);
    await expect(tab).toHaveText('Avtal');
    await tab.click({ force: true });
    await expect(page.locator('[data-cy="contract-type-select"]')).toBeVisible();
  };

  const visitErrandWithoutContract = async (page, mockRoute, dismissCookieConsent) => {
    const mockMexErrand_base_without_contract = { ...mockMexErrand_base };
    mockMexErrand_base_without_contract.data.extraParameters = mockMexErrand_base.data.extraParameters.filter(
      (p) => p.key !== 'contractId'
    );
    await mockRoute('**/errand/101', mockMexErrand_base_without_contract, { method: 'GET' }); // @getErrandByIdNoContract
    await mockRoute('**/errand/errandNumber/*', mockMexErrand_base_without_contract, { method: 'GET' }); // @getErrandNoContract
    await page.goto(`arende/${mockMexErrand_base.data.id}`);
    await page.waitForResponse((resp) => resp.url().includes('/errand/errandNumber/') && resp.status() === 200);
    await dismissCookieConsent();
    const tab = page.locator('.sk-tabs-list button').nth(4);
    await expect(tab).toHaveText('Avtal');
    await tab.click({ force: true });
    await expect(page.locator('[data-cy="contract-type-select"]')).toBeVisible();
  };

  test('shows uploaded contracts', async ({ page, mockRoute, dismissCookieConsent }) => {
    await mockRoute('**/errand/101', mockMexErrand_base, { method: 'GET' }); // @getErrand
    await mockRoute(
      `**/contracts/${mockMexErrand_base.data.municipalityId}/${contractText.data.contractId}/attachments`,
      {},
      { method: 'POST' }
    );
    await visitErrandContractTab(page, mockRoute, dismissCookieConsent);
    await page.locator('[data-cy="bilagor-disclosure"] button.sk-btn-tertiary').click();

    await expect(page.locator('[data-cy="contract-upload-field"]')).toBeVisible();
    await expect(page.locator('[data-cy="contract-attachment-item-1"]')).toBeVisible();
    await page.locator('[data-cy="contract-attachment-item-1"]').locator('.sk-form-file-upload-list-item-actions-more').click();
    await expect(page.locator('[data-cy="open-attachment-1"]')).toBeVisible();
    await page.locator('[data-cy="delete-attachment-1"]').click();
    await expect(page.locator('h1.sk-dialog-confirm-heading').filter({ hasText: 'Ta bort signerat avtal?' })).toBeVisible();
    await expect(page.locator('article.sk-dialog').locator('button').filter({ hasText: 'Nej' })).toBeVisible();
    await page.locator('article.sk-dialog').locator('button').filter({ hasText: 'Ja' }).click();

    const deleteRequest = await page.waitForRequest(
      (req) => req.url().includes('/attachments/1') && req.method() === 'DELETE'
    );
    expect(deleteRequest.url()).toContain(contractText.data.contractId);
  });

  test('shows the correct contracts information', async ({ page, mockRoute, dismissCookieConsent }) => {
    await visitErrandContractTab(page, mockRoute, dismissCookieConsent);
    const landLeaseType = [
      { key: 'parties', label: 'Parter' },
      { key: 'area', label: 'Område' },
      { key: 'avtalstid', label: 'Avtalstid och uppsägning' },
      { key: 'lopande', label: 'Löpande avgift' },
      { key: 'bilagor', label: 'Avtalsbilagor' },
    ];

    // lease agreements
    for (const type of landLeaseType) {
      await expect(page.locator(`[data-cy="badge-${type.key}"]`).filter({ hasText: type.label })).toBeVisible();
    }

    await expect(page.locator('[data-cy="casedata-contract-form"]').locator('.sk-disclosure')).toHaveCount(6);
    await expect(page.locator('[data-cy="parties-disclosure"]').getByText('Parter')).toBeVisible();
    await expect(page.locator('[data-cy="area-disclosure"]').getByText('Område')).toBeVisible();
    await expect(page.locator('[data-cy="avtalstid-disclosure"]').getByText('Avtalstid och uppsägning')).toBeVisible();
    await expect(page.locator('[data-cy="lopande-disclosure"]').getByText('Löpande avgift')).toBeVisible();
    await expect(page.locator('[data-cy="bilagor-disclosure"]').getByText('Avtalsbilagor')).toBeVisible();
  });

  // Parter
  test('manages parties in lease agreements', async ({ page, mockRoute, dismissCookieConsent }) => {
    await visitErrandContractTab(page, mockRoute, dismissCookieConsent);
    await expect(page.locator('[data-cy="parties-disclosure"]')).toBeVisible();
    await expect(
      page.locator('[data-cy="Upplåtare-table"] .sk-table-tbody-tr').getByText(
        `${mockLeaseAgreement.data.stakeholders.find((x) => x.roles.includes('LESSOR'))?.firstName ?? ''} ${
          mockLeaseAgreement.data.stakeholders.find((x) => x.roles.includes('LESSOR'))?.lastName ?? ''
        }`
      )
    ).toBeVisible();

    await expect(
      page.locator('[data-cy="Arrendatorer-table"] .sk-table-tbody-tr').getByText(
        `${mockLeaseAgreement.data.stakeholders.find((x) => x.roles.includes('LESSEE'))?.firstName ?? ''} ${
          mockLeaseAgreement.data.stakeholders.find((x) => x.roles.includes('LESSEE'))?.lastName ?? ''
        }`
      )
    ).toBeVisible();

    await page.locator('[data-cy="avtalstid-disclosure"] button.sk-btn-tertiary').click();
    await page.locator('[data-cy="lessee-notice-period"]').clear();
    await page.locator('[data-cy="lessee-notice-period"]').fill('15');
    await page.locator('[data-cy="lessor-notice-period"]').clear();
    await page.locator('[data-cy="lessor-notice-period"]').fill('1');

    await page.locator('[data-cy="area-disclosure"] button.sk-btn-tertiary').click();
    await page.locator('[data-cy="area-disclosure"] button.sk-btn-primary').filter({ hasText: 'Spara' }).click();

    const putContractRequest = await page.waitForRequest(
      (req) => req.url().includes('/contracts/2024-01026') && req.method() === 'PUT'
    );
    const leaseAgreement: Contract = putContractRequest.postDataJSON();
    expect(leaseAgreement.type).toBe(ContractType.LEASE_AGREEMENT);
    expect(leaseAgreement.leaseType).toBe(LeaseType.USUFRUCT_MOORING);
    const lessor = leaseAgreement.stakeholders.find((s) => s.roles.includes(StakeholderRole.LESSOR));
    const lessee = leaseAgreement.stakeholders.find((s) => s.roles.includes(StakeholderRole.LESSEE));
    expect(lessor.firstName).toBe(
      mockLeaseAgreement.data.stakeholders.find((x) => x.roles.includes('LESSOR'))?.firstName ?? ''
    );
    expect(lessee.firstName).toBe(
      mockLeaseAgreement.data.stakeholders.find((x) => x.roles.includes('LESSEE'))?.firstName ?? ''
    );
  });

  // Område
  test('manages property designations in lease agreements', async ({ page, mockRoute, dismissCookieConsent }) => {
    await visitErrandContractTab(page, mockRoute, dismissCookieConsent);
    await mockRoute('**/errand/101', mockMexErrand_base, { method: 'GET' }); // @getErrand
    await page.locator('[data-cy="area-disclosure"] button.sk-btn-tertiary').click();
    await expect(page.locator('[data-cy="property-designation-checkboxgroup"]')).toBeVisible();

    const buildSelector = (p: { name: string; district?: string }) =>
      `[data-cy="property-designation-checkbox-${p.name.replace(/\s+/g, '-')}"]`;

    const errandProperties = mockMexErrand_base.data.facilities
      .filter((facility) => facility.address)
      .map((f) => {
        return { name: f.address?.propertyDesignation || '', district: 'Låtsasdistrikt' };
      });
    const errandPropertiesCySelectors = errandProperties.map(buildSelector);

    const contractProperties = mockLeaseAgreement.data.propertyDesignations;
    const contractPropertiesCySelectors = contractProperties.map(buildSelector);

    for (const selector of errandPropertiesCySelectors) {
      await expect(page.locator(selector)).toBeVisible();
      await expect(page.locator(selector)).not.toBeChecked();
    }

    for (const selector of contractPropertiesCySelectors) {
      await expect(page.locator(selector)).toBeVisible();
      await expect(page.locator(selector)).toBeChecked();
    }

    // Check all and save
    for (const selector of errandPropertiesCySelectors) {
      await page.locator(selector).check({ force: true });
    }

    await page.locator('[data-cy="avtalstid-disclosure"] button.sk-btn-tertiary').click();
    await page.locator('[data-cy="lessee-notice-period"]').clear();
    await page.locator('[data-cy="lessee-notice-period"]').fill('15');
    await page.locator('[data-cy="lessor-notice-period"]').clear();
    await page.locator('[data-cy="lessor-notice-period"]').fill('1');

    await page.locator('[data-cy="area-disclosure"] button.sk-btn-primary').filter({ hasText: 'Spara' }).click();
    const putContractRequest = await page.waitForRequest(
      (req) => req.url().includes('/contracts/2024-01026') && req.method() === 'PUT'
    );
    const leaseAgreement: Contract = putContractRequest.postDataJSON();
    expect(leaseAgreement.propertyDesignations).toEqual([...contractProperties, ...errandProperties]);
  });

  // Avtalstid och uppsägning
  test('manages tenancy period automatically in lease agreements', async ({ page, mockRoute, dismissCookieConsent }) => {
    await visitErrandContractTab(page, mockRoute, dismissCookieConsent);
    await mockRoute('**/errand/101', mockMexErrand_base, { method: 'GET' }); // @getErrand
    await page.locator('[data-cy="avtalstid-disclosure"] button.sk-btn-tertiary').click();

    await page.locator('[data-cy="avtalstid-start"]').fill('2024-12-01');
    await page.locator('[data-cy="avtalstid-end"]').fill('2025-12-01');

    await page.locator('[data-cy="lessee-notice-unit"]').selectOption(TimeUnit.DAYS);
    await page.locator('[data-cy="lessee-notice-period"]').clear();
    await page.locator('[data-cy="lessee-notice-period"]').fill('15');
    await expect(page.locator('[data-cy="lessee-notice-party"]')).toHaveValue('LESSEE');

    await page.locator('[data-cy="lessor-notice-unit"]').selectOption(TimeUnit.MONTHS);
    await page.locator('[data-cy="lessor-notice-period"]').clear();
    await page.locator('[data-cy="lessor-notice-period"]').fill('1');
    await expect(page.locator('[data-cy="lessor-notice-party"]')).toHaveValue('LESSOR');

    await page.locator('[data-cy="autoextend-true-radiobutton"]').check({ force: true });
    await page.locator('[data-cy="extension-unit-selector"]').selectOption(TimeUnit.YEARS);
    await page.locator('[data-cy="extension-input"]').fill('180');

    await page.locator('[data-cy="avtalstid-disclosure"] button.sk-btn-primary').filter({ hasText: 'Spara' }).click();
    const putContractRequest = await page.waitForRequest(
      (req) => req.url().includes('/contracts/2024-01026') && req.method() === 'PUT'
    );
    const leaseAgreement: Contract = putContractRequest.postDataJSON();
    expect(leaseAgreement.notice.terms).toEqual([
      { party: 'LESSEE', periodOfNotice: '15', unit: TimeUnit.DAYS },
      { party: 'LESSOR', periodOfNotice: '1', unit: TimeUnit.MONTHS },
    ]);
    expect(leaseAgreement.extension).toEqual({
      autoExtend: true,
      unit: TimeUnit.YEARS,
      leaseExtension: '180',
    });
  });

  // Löpande avgift
  test('manages lease fee automatically in lease agreements', async ({ page, mockRoute, dismissCookieConsent }) => {
    await visitErrandContractTab(page, mockRoute, dismissCookieConsent);
    await mockRoute('**/errand/101', mockMexErrand_base, { method: 'GET' }); // @getErrand
    await page.locator('[data-cy="lopande-disclosure"] button.sk-btn-tertiary').click();

    await expect(page.locator('[data-cy="generate-invoice-true-radiobutton"]')).toBeVisible();
    await expect(page.locator('[data-cy="generate-invoice-false-radiobutton"]')).toBeVisible();

    await page.locator('[data-cy="fees-yearly-input"]').fill('120');

    await expect(page.locator('[data-cy="indexed-true-radiobutton"]')).toBeVisible();
    await expect(page.locator('[data-cy="indexed-false-radiobutton"]')).toBeVisible();

    await expect(page.locator('[data-cy="invoice-interval-yearly-radiobutton"]')).toBeVisible();
    await expect(page.locator('[data-cy="invoice-interval-halfyearly-radiobutton"]')).toBeVisible();
    await page.locator('[data-cy="invoice-interval-quarterly-radiobutton"]').check({ force: true });

    await expect(page.locator('[data-cy="invoice-markup-input"]')).toBeVisible();

    await expect(page.locator('[data-cy="fees-additional-information-0-input"]')).toBeVisible();
    await page.locator('[data-cy="fees-additional-information-1-input"]').fill('Foobar');

    await page.locator('[data-cy="avtalstid-disclosure"] button.sk-btn-tertiary').click();
    await page.locator('[data-cy="lessee-notice-period"]').clear();
    await page.locator('[data-cy="lessee-notice-period"]').fill('15');
    await page.locator('[data-cy="lessor-notice-period"]').clear();
    await page.locator('[data-cy="lessor-notice-period"]').fill('1');

    await page.locator('[data-cy="lopande-disclosure"] button.sk-btn-primary').filter({ hasText: 'Spara' }).click();
    const putContractRequest = await page.waitForRequest(
      (req) => req.url().includes('/contracts/2024-01026') && req.method() === 'PUT'
    );
    const leaseAgreement: Contract = putContractRequest.postDataJSON();
    expect(leaseAgreement.invoicing).toEqual({
      invoiceInterval: IntervalType.QUARTERLY,
      invoicedIn: InvoicedIn.ADVANCE,
    });
    expect(leaseAgreement.fees).toEqual({
      currency: 'SEK',
      monthly: 0,
      yearly: 120,
      total: 120,
      additionalInformation: [
        'Avgift, båtplats. Fastigheter: AVTALSFASTIGHET 1:123, AVTALSFASTIGHET 2:456',
        'Foobar',
      ],
    });
  });

  test('manages creating a new lease agreement with correct default values', async ({ page, mockRoute, dismissCookieConsent }) => {
    await visitErrandWithoutContract(page, mockRoute, dismissCookieConsent);
    await page.locator('[data-cy="contract-type-select"]').selectOption(ContractType.LEASE_AGREEMENT);
    await page.locator('[data-cy="contract-subtype-select"]').selectOption(LeaseType.USUFRUCT_MOORING);

    await expect(page.locator('[data-cy="Upplåtare-table"]')).toBeVisible();

    const upplatareRow = page.locator('[data-cy="Upplåtare-table"]').locator('[data-cy="Upplåtare-row-0"]');
    await expect(upplatareRow).toBeVisible();
    await expect(upplatareRow.locator('[data-cy="party-0-name"]')).toContainText('Test Upplåtarsson');
    await expect(upplatareRow.locator('[data-cy="party-0-address"]')).toContainText('Testgata 1');
    await expect(upplatareRow.locator('[data-cy="party-0-role"]')).toContainText('Upplåtare');

    await expect(page.locator('[data-cy="Arrendatorer-table"]')).toBeVisible();

    const arrendatorerRow = page.locator('[data-cy="Arrendatorer-table"]').locator('[data-cy="Arrendatorer-row-0"]');
    await expect(arrendatorerRow).toBeVisible();
    await expect(arrendatorerRow.locator('[data-cy="party-0-name"]')).toContainText('Test Arrendatorsson');
    await expect(arrendatorerRow.locator('[data-cy="party-0-address"]')).toContainText('Testgata 41');
    await expect(arrendatorerRow.locator('[data-cy="party-0-role"]')).toContainText('Arrendator');
    await expect(arrendatorerRow.locator('[data-cy="party-0-role"]')).toContainText('Fakturamottagare');

    await page.locator('[data-cy="parties-disclosure"]').locator('[data-cy="save-contract-button"]').click();

    const postContractRequest = await page.waitForRequest(
      (req) => req.url().includes('/contracts') && req.method() === 'POST'
    );
    const leaseAgreement: Contract = postContractRequest.postDataJSON();
    expect(leaseAgreement.type).toBe(ContractType.LEASE_AGREEMENT);
    expect(leaseAgreement.leaseType).toBe(LeaseType.USUFRUCT_MOORING);
    const lessor = leaseAgreement.stakeholders.find((s) => s.roles.includes(StakeholderRole.LESSOR));
    const lessee = leaseAgreement.stakeholders.find((s) => s.roles.includes(StakeholderRole.LESSEE));
    expect(lessor.firstName).toBe(
      mockMexErrand_base.data.stakeholders.find((x) => x.roles.includes(Role.PROPERTY_OWNER))?.firstName ?? ''
    );
    expect(lessee.firstName).toBe(
      mockMexErrand_base.data.stakeholders.find((x) => x.roles.includes(Role.LEASEHOLDER))?.firstName ?? ''
    );
  });

  test('manages creating a new purchase agreement with correct default values', async ({ page, mockRoute, dismissCookieConsent }) => {
    await visitErrandWithoutContract(page, mockRoute, dismissCookieConsent);

    // Switch to PURCHASE_AGREEMENT
    await page.locator('[data-cy="contract-type-select"]').selectOption(ContractType.PURCHASE_AGREEMENT);

    await expect(page.locator('[data-cy="Upplåtare-table"]')).not.toBeVisible();
    await expect(page.locator('[data-cy="Arrendatorer-table"]')).not.toBeVisible();
    await expect(page.locator('[data-cy="Köpare-table"]')).toBeVisible();
    await expect(page.locator('[data-cy="Säljare-table"]')).toBeVisible();

    const kopareRow = page.locator('[data-cy="Köpare-table"]').locator('[data-cy="Köpare-row-0"]');
    await expect(kopareRow).toBeVisible();
    await expect(kopareRow.locator('[data-cy="party-0-name"]')).toContainText('Test Köparsson');
    await expect(kopareRow.locator('[data-cy="party-0-address"]')).toContainText('Testgata 2');
    await expect(kopareRow.locator('[data-cy="party-0-role"]')).toContainText('Köpare');

    const saljareRow = page.locator('[data-cy="Säljare-table"]').locator('[data-cy="Säljare-row-0"]');
    await expect(saljareRow).toBeVisible();
    await expect(saljareRow.locator('[data-cy="party-0-name"]')).toContainText('Daniella Testarsson');
    await expect(saljareRow.locator('[data-cy="party-0-address"]')).toContainText('Testgata 41');
    await expect(saljareRow.locator('[data-cy="party-0-role"]')).toContainText('Säljare');

    await page.locator('[data-cy="parties-disclosure"]').locator('[data-cy="save-contract-button"]').click();

    const postContractRequest = await page.waitForRequest(
      (req) => req.url().includes('/contracts') && req.method() === 'POST'
    );
    const purchaseAgreement: Contract = postContractRequest.postDataJSON();
    expect(purchaseAgreement.type).toBe(ContractType.PURCHASE_AGREEMENT);
    expect(purchaseAgreement.startDate).toBe('');
    expect(purchaseAgreement.leaseType).toBeUndefined();
    const seller = purchaseAgreement.stakeholders.find((s) => s.roles.includes(StakeholderRole.SELLER));
    const buyer = purchaseAgreement.stakeholders.find((s) => s.roles.includes(StakeholderRole.BUYER));
    expect(seller.firstName).toBe(
      mockMexErrand_base.data.stakeholders.find((x) => x.roles.includes(Role.SELLER))?.firstName ?? ''
    );
    expect(buyer.firstName).toBe(
      mockMexErrand_base.data.stakeholders.find((x) => x.roles.includes(Role.BUYER))?.firstName ?? ''
    );
  });

  test('manages creating a new LAND_LEASE_PUBLIC contract with correct default values', async ({ page, mockRoute, dismissCookieConsent }) => {
    await visitErrandWithoutContract(page, mockRoute, dismissCookieConsent);

    await page.locator('[data-cy="contract-type-select"]').selectOption(ContractType.LAND_LEASE_PUBLIC);

    // Verify NO lease subtype dropdown is shown
    await expect(page.locator('[data-cy="contract-subtype-select"]')).not.toBeVisible();

    // Verify lease agreement UI is shown
    await expect(page.locator('[data-cy="Upplåtare-table"]')).toBeVisible();
    await expect(page.locator('[data-cy="Arrendatorer-table"]')).toBeVisible();
    await expect(page.locator('[data-cy="Köpare-table"]')).not.toBeVisible();
    await expect(page.locator('[data-cy="Säljare-table"]')).not.toBeVisible();

    const upplatareRow = page.locator('[data-cy="Upplåtare-table"]').locator('[data-cy="Upplåtare-row-0"]');
    await expect(upplatareRow).toBeVisible();
    await expect(upplatareRow.locator('[data-cy="party-0-name"]')).toContainText('Test Upplåtarsson');
    await expect(upplatareRow.locator('[data-cy="party-0-role"]')).toContainText('Upplåtare');

    const arrendatorerRow = page.locator('[data-cy="Arrendatorer-table"]').locator('[data-cy="Arrendatorer-row-0"]');
    await expect(arrendatorerRow).toBeVisible();
    await expect(arrendatorerRow.locator('[data-cy="party-0-name"]')).toContainText('Test Arrendatorsson');
    await expect(arrendatorerRow.locator('[data-cy="party-0-role"]')).toContainText('Arrendator');

    await page.locator('[data-cy="parties-disclosure"]').locator('[data-cy="save-contract-button"]').click();

    const postContractRequest = await page.waitForRequest(
      (req) => req.url().includes('/contracts') && req.method() === 'POST'
    );
    const contract: Contract = postContractRequest.postDataJSON();
    expect(contract.type).toBe(ContractType.LAND_LEASE_PUBLIC);
    expect(contract.leaseType).toBeUndefined();
    expect(contract.stakeholders.some((s) => s.roles.includes(StakeholderRole.LESSOR))).toBe(true);
    expect(contract.stakeholders.some((s) => s.roles.includes(StakeholderRole.LESSEE))).toBe(true);
  });

  test('manages creating a new SHORT_TERM_LEASE_AGREEMENT contract with correct default values', async ({ page, mockRoute, dismissCookieConsent }) => {
    await visitErrandWithoutContract(page, mockRoute, dismissCookieConsent);

    await page.locator('[data-cy="contract-type-select"]').selectOption(ContractType.SHORT_TERM_LEASE_AGREEMENT);

    await expect(page.locator('[data-cy="contract-subtype-select"]')).not.toBeVisible();

    await expect(page.locator('[data-cy="Upplåtare-table"]')).toBeVisible();
    await expect(page.locator('[data-cy="Arrendatorer-table"]')).toBeVisible();
    await expect(page.locator('[data-cy="Köpare-table"]')).not.toBeVisible();
    await expect(page.locator('[data-cy="Säljare-table"]')).not.toBeVisible();

    const upplatareRow = page.locator('[data-cy="Upplåtare-table"]').locator('[data-cy="Upplåtare-row-0"]');
    await expect(upplatareRow).toBeVisible();
    await expect(upplatareRow.locator('[data-cy="party-0-name"]')).toContainText('Test Upplåtarsson');
    await expect(upplatareRow.locator('[data-cy="party-0-role"]')).toContainText('Upplåtare');

    const arrendatorerRow = page.locator('[data-cy="Arrendatorer-table"]').locator('[data-cy="Arrendatorer-row-0"]');
    await expect(arrendatorerRow).toBeVisible();
    await expect(arrendatorerRow.locator('[data-cy="party-0-name"]')).toContainText('Test Arrendatorsson');
    await expect(arrendatorerRow.locator('[data-cy="party-0-role"]')).toContainText('Arrendator');

    await page.locator('[data-cy="parties-disclosure"]').locator('[data-cy="save-contract-button"]').click();

    const postContractRequest = await page.waitForRequest(
      (req) => req.url().includes('/contracts') && req.method() === 'POST'
    );
    const contract: Contract = postContractRequest.postDataJSON();
    expect(contract.type).toBe(ContractType.SHORT_TERM_LEASE_AGREEMENT);
    expect(contract.leaseType).toBeUndefined();
    expect(contract.stakeholders.some((s) => s.roles.includes(StakeholderRole.LESSOR))).toBe(true);
    expect(contract.stakeholders.some((s) => s.roles.includes(StakeholderRole.LESSEE))).toBe(true);
  });

  test.describe('Non-DRAFT contract restrictions', () => {
    test.describe('ACTIVE contract', () => {
      const activeContractId = '2024-ACTIVE-001';

      const mockActiveLeaseAgreement = {
        ...mockLeaseAgreement,
        data: {
          ...mockLeaseAgreement.data,
          contractId: activeContractId,
          status: 'ACTIVE',
          notice: { terms: [{ party: 'LESSEE', periodOfNotice: 3, unit: 'MONTHS' }, { party: 'LESSOR', periodOfNotice: 3, unit: 'MONTHS' }] },
          fees: { currency: 'SEK', monthly: 0, yearly: 1000, total: 1000, additionalInformation: ['Avgift, båtplats. Fastigheter: AVTALSFASTIGHET 1:123', ''] },
          invoicing: { invoiceInterval: 'YEARLY', invoicedIn: 'ADVANCE' },
          extraParameters: [{ name: 'errandId', parameters: { errandId: '101' } }, { name: 'InvoiceInfo', parameters: { markup: 'REF123' } }],
          generateInvoice: 'true',
        },
      };

      const mockMexErrandWithActiveContract = {
        ...mockMexErrand_base,
        data: {
          ...mockMexErrand_base.data,
          extraParameters: mockMexErrand_base.data.extraParameters.map((p) =>
            p.key === 'contractId' ? { ...p, values: [activeContractId] } : p
          ),
        },
      };

      test.beforeEach(async ({ page, mockRoute, dismissCookieConsent }) => {
        await mockRoute('**/errand/errandNumber/*', mockMexErrandWithActiveContract, { method: 'GET' }); // @getErrand
        await mockRoute(`**/contracts/${activeContractId}`, mockActiveLeaseAgreement, { method: 'GET' }); // @getActiveContract
        await mockRoute(`**/contracts/2281/${activeContractId}/attachments/*`, mockContractAttachment, { method: 'GET' }); // @getActiveContractAttachment

        await page.goto(`arende/${mockMexErrand_base.data.id}`);
        await page.waitForResponse((resp) => resp.url().includes('/errand/errandNumber/') && resp.status() === 200);
        await dismissCookieConsent();
        await page.waitForResponse((resp) => resp.url().includes(`/contracts/${activeContractId}`) && resp.status() === 200);
        const tab = page.locator('.sk-tabs-list button').nth(4);
        await expect(tab).toHaveText('Avtal');
        await tab.click({ force: true });
        await expect(page.locator('[data-cy="contract-type-select"]')).toBeVisible();
      });

      test('shows warning banner for ACTIVE contracts', async ({ page }) => {
        await expect(page.locator('[data-cy="non-draft-warning-banner"]')).toBeVisible();
        await expect(page.locator('[data-cy="non-draft-warning-banner"]')).toContainText(
          'Avtalet är inte längre ett utkast. Endast fakturareferens och fakturamottagare kan ändras.'
        );
      });

      test('restricts editing of general fields for ACTIVE contracts', async ({ page }) => {
        await expect(page.locator('[data-cy="non-draft-warning-banner"]')).toBeVisible();

        await expect(page.locator('[data-cy="old-contract-id-input"]')).toHaveAttribute('readonly');

        await page.locator('[data-cy="area-disclosure"] button.sk-btn-tertiary').click();
        const checkboxes = page.locator('[data-cy="property-designation-checkboxgroup"] input[type="checkbox"]');
        const count = await checkboxes.count();
        for (let i = 0; i < count; i++) {
          await expect(checkboxes.nth(i)).toBeDisabled();
        }

        await page.locator('[data-cy="avtalstid-disclosure"] button.sk-btn-tertiary').click();
        await expect(page.locator('[data-cy="avtalstid-start"]')).toHaveAttribute('readonly');
        await expect(page.locator('[data-cy="avtalstid-end"]')).toHaveAttribute('readonly');
        await expect(page.locator('[data-cy="lessee-notice-unit"]')).toBeDisabled();
        await expect(page.locator('[data-cy="lessee-notice-period"]')).toHaveAttribute('readonly');
        await expect(page.locator('[data-cy="lessor-notice-unit"]')).toBeDisabled();
        await expect(page.locator('[data-cy="lessor-notice-period"]')).toHaveAttribute('readonly');

        await page.locator('[data-cy="lopande-disclosure"] button.sk-btn-tertiary').click();
        await expect(page.locator('[data-cy="generate-invoice-true-radiobutton"]')).toBeDisabled();
        await expect(page.locator('[data-cy="generate-invoice-false-radiobutton"]')).toBeDisabled();
        await expect(page.locator('[data-cy="fees-yearly-input"]')).toHaveAttribute('readonly');
        await expect(page.locator('[data-cy="indexed-true-radiobutton"]')).toBeDisabled();
        await expect(page.locator('[data-cy="indexed-false-radiobutton"]')).toBeDisabled();
        await expect(page.locator('[data-cy="invoice-interval-yearly-radiobutton"]')).toBeDisabled();
        await expect(page.locator('[data-cy="invoice-interval-halfyearly-radiobutton"]')).toBeDisabled();
        await expect(page.locator('[data-cy="invoice-interval-quarterly-radiobutton"]')).toBeDisabled();
      });

      test('allows editing of invoice reference and supplementary text for ACTIVE contracts', async ({ page }) => {
        await expect(page.locator('[data-cy="non-draft-warning-banner"]')).toBeVisible();

        await page.locator('[data-cy="lopande-disclosure"] button.sk-btn-tertiary').click();

        await expect(page.locator('[data-cy="invoice-markup-input"]')).not.toHaveAttribute('readonly');
        await page.locator('[data-cy="invoice-markup-input"]').clear();
        await page.locator('[data-cy="invoice-markup-input"]').fill('NEW-REF-456');
        await expect(page.locator('[data-cy="invoice-markup-input"]')).toHaveValue('NEW-REF-456');

        await expect(page.locator('[data-cy="fees-additional-information-1-input"]')).not.toHaveAttribute('readonly');
        await page.locator('[data-cy="fees-additional-information-1-input"]').clear();
        await page.locator('[data-cy="fees-additional-information-1-input"]').fill('Extra info');
        await expect(page.locator('[data-cy="fees-additional-information-1-input"]')).toHaveValue('Extra info');
      });

      test('shows "Uppdatera fakturamottagare" button for ACTIVE contracts', async ({ page }) => {
        await expect(page.locator('[data-cy="non-draft-warning-banner"]')).toBeVisible();

        await expect(page.locator('[data-cy="update-contract-parties"]')).toBeVisible();
        await expect(page.locator('[data-cy="update-contract-parties"]')).toContainText('Uppdatera fakturamottagare');
      });
    });

    test('does not show warning banner for DRAFT contracts', async ({ page, mockRoute, dismissCookieConsent }) => {
      // Uses default beforeEach intercept with DRAFT status
      await page.goto(`arende/${mockMexErrand_base.data.id}`);
      await page.waitForResponse((resp) => resp.url().includes('/errand/errandNumber/') && resp.status() === 200);
      await dismissCookieConsent();
      const tab = page.locator('.sk-tabs-list button').nth(4);
      await expect(tab).toHaveText('Avtal');
      await tab.click({ force: true });
      await expect(page.locator('[data-cy="contract-type-select"]')).toBeVisible();
      await expect(page.locator('[data-cy="non-draft-warning-banner"]')).not.toBeVisible();
      await expect(page.locator('[data-cy="update-contract-parties"]')).toContainText('Uppdatera parter');
    });
  });
});
