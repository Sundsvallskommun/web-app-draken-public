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
    const errandResponse = page.waitForResponse(
      (resp) => resp.url().includes('/errand/errandNumber/') && resp.status() === 200
    );
    const contractResponse = page.waitForResponse(
      (resp) => resp.url().includes('/contracts/2024-01026') && resp.status() === 200
    );
    await page.goto(`arende/${mockMexErrand_base.data.id}`);
    await errandResponse;
    await contractResponse;
    await dismissCookieConsent();
    const tab = page.getByRole('tab', { name: 'Avtal', exact: true });
    await tab.click({ force: true });
    await expect(page.locator('[data-cy="contract-type-select"]')).toBeVisible();
  };

  const visitErrandWithoutContract = async (page, mockRoute, dismissCookieConsent) => {
    // Deep clone so filtering extraParameters does not mutate the shared
    // mockMexErrand_base fixture (which other tests/files reuse).
    const mockMexErrand_base_without_contract = structuredClone(mockMexErrand_base);
    mockMexErrand_base_without_contract.data.extraParameters =
      mockMexErrand_base_without_contract.data.extraParameters.filter((p) => p.key !== 'contractId');
    await mockRoute('**/errand/101', mockMexErrand_base_without_contract, { method: 'GET' }); // @getErrandByIdNoContract
    await mockRoute('**/errand/errandNumber/*', mockMexErrand_base_without_contract, { method: 'GET' }); // @getErrandNoContract
    const errandResponse = page.waitForResponse(
      (resp) => resp.url().includes('/errand/errandNumber/') && resp.status() === 200
    );
    await page.goto(`arende/${mockMexErrand_base.data.id}`);
    await errandResponse;
    await dismissCookieConsent();
    const tab = page.getByRole('tab', { name: 'Avtal', exact: true });
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
    await page.locator('[data-cy="bilagor-disclosure"] button.sk-disclosure-header-button').click();

    await expect(page.locator('[data-cy="contract-upload-field"]')).toBeVisible();
    await expect(page.locator('[data-cy="contract-attachment-item-1"]')).toBeVisible();
    await page.locator('[data-cy="contract-attachment-item-1"]').locator('.sk-form-file-upload-list-item-actions-more').click();
    await expect(page.locator('[data-cy="open-attachment-1"]')).toBeVisible();
    await page.locator('[data-cy="delete-attachment-1"]').click();
    await expect(page.locator('h1.sk-dialog-confirm-heading').filter({ hasText: 'Ta bort signerat avtal?' })).toBeVisible();
    await expect(page.locator('article.sk-dialog').locator('button').filter({ hasText: 'Nej' })).toBeVisible();
    const deleteRequest = page.waitForRequest(
      (req) => req.url().includes('/attachments/1') && req.method() === 'DELETE'
    );
    await page.locator('article.sk-dialog').locator('button').filter({ hasText: 'Ja' }).click();
    expect((await deleteRequest).url()).toContain(contractText.data.contractId);
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

    await expect(
      page.locator('[data-cy="parties-disclosure"] .sk-disclosure-header-title').getByText('Parter')
    ).toBeVisible();
    await expect(
      page.locator('[data-cy="area-disclosure"] .sk-disclosure-header-title').getByText('Område')
    ).toBeVisible();
    await expect(
      page.locator('[data-cy="avtalstid-disclosure"] .sk-disclosure-header-title').getByText('Avtalstid')
    ).toBeVisible();
    await expect(
      page.locator('[data-cy="lopande-disclosure"] .sk-disclosure-header-title').getByText('Löpande avgift')
    ).toBeVisible();
    await expect(
      page.locator('[data-cy="bilagor-disclosure"] .sk-disclosure-header-title').getByText('Avtalsbilagor')
    ).toBeVisible();
  });

  // Parter
  test('manages parties in lease agreements', async ({ page, mockRoute, dismissCookieConsent }) => {
    await visitErrandContractTab(page, mockRoute, dismissCookieConsent);
    await expect(page.locator('[data-cy="parties-disclosure"]')).toBeVisible();

    const partiesTable = page.locator('[data-cy="parties-table"]');
    const lessorParty = mockLeaseAgreement.data.stakeholders.find((x) => x.roles.includes('LESSOR'));
    const lesseeParty = mockLeaseAgreement.data.stakeholders.find((x) => x.roles.includes('LESSEE'));
    await expect(
      partiesTable.getByText(`${lessorParty?.firstName ?? ''} ${lessorParty?.lastName ?? ''}`)
    ).toBeVisible();
    await expect(
      partiesTable.getByText(`${lesseeParty?.firstName ?? ''} ${lesseeParty?.lastName ?? ''}`)
    ).toBeVisible();

    await page.locator('[data-cy="avtalstid-disclosure"] button.sk-disclosure-header-button').click();
    await page.locator('[data-cy="all-notice-period"]').clear();
    await page.locator('[data-cy="all-notice-period"]').fill('15');

    const putContractRequest = page.waitForRequest(
      (req) => req.url().includes('/contracts/2024-01026') && req.method() === 'PUT'
    );
    await page.locator('[data-cy="avtalstid-disclosure"] button.sk-btn-primary').filter({ hasText: 'Spara' }).click();

    const leaseAgreement: Contract = (await putContractRequest).postDataJSON();
    expect(leaseAgreement.type).toBe(ContractType.LEASE_AGREEMENT);
    expect(leaseAgreement.leaseType).toBe(LeaseType.LAND_LEASE_MISC);
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
    await page.locator('[data-cy="area-disclosure"] button.sk-disclosure-header-button').click();
    await expect(page.locator('[data-cy="contract-property-designation-checkboxgroup"]')).toBeVisible();

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

    const putContractRequest = page.waitForRequest(
      (req) => req.url().includes('/contracts/2024-01026') && req.method() === 'PUT'
    );
    await page.locator('[data-cy="area-disclosure"] button.sk-btn-primary').filter({ hasText: 'Spara' }).click();
    const leaseAgreement: Contract = (await putContractRequest).postDataJSON();
    expect(leaseAgreement.propertyDesignations).toEqual([...contractProperties, ...errandProperties]);
  });

  // Avtalstid och uppsägning
  test('manages tenancy period automatically in lease agreements', async ({ page, mockRoute, dismissCookieConsent }) => {
    await visitErrandContractTab(page, mockRoute, dismissCookieConsent);
    await mockRoute('**/errand/101', mockMexErrand_base, { method: 'GET' }); // @getErrand
    await page.locator('[data-cy="avtalstid-disclosure"] button.sk-disclosure-header-button').click();

    await page.locator('[data-cy="avtalstid-start"]').fill('2024-12-01');
    await page.locator('[data-cy="avtalstid-end"]').fill('2025-12-01');

    await page.locator('[data-cy="all-notice-unit"]').selectOption(TimeUnit.DAYS);
    await page.locator('[data-cy="all-notice-period"]').clear();
    await page.locator('[data-cy="all-notice-period"]').fill('15');
    await expect(page.locator('[data-cy="all-notice-party"]')).toHaveValue('ALL');

    await page.locator('[data-cy="autoextend-true-radiobutton"]').check({ force: true });
    await page.locator('[data-cy="extension-unit-selector"]').selectOption(TimeUnit.YEARS);
    await page.locator('[data-cy="extension-input"]').fill('180');

    const putContractRequest = page.waitForRequest(
      (req) => req.url().includes('/contracts/2024-01026') && req.method() === 'PUT'
    );
    await page.locator('[data-cy="avtalstid-disclosure"] button.sk-btn-primary').filter({ hasText: 'Spara' }).click();
    const leaseAgreement: Contract = (await putContractRequest).postDataJSON();
    expect(leaseAgreement.notice.terms).toEqual([{ party: 'ALL', periodOfNotice: '15', unit: TimeUnit.DAYS }]);
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
    await page.locator('[data-cy="lopande-disclosure"] button.sk-disclosure-header-button').click();

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

    await page.locator('[data-cy="avtalstid-disclosure"] button.sk-disclosure-header-button').click();
    await page.locator('[data-cy="all-notice-period"]').clear();
    await page.locator('[data-cy="all-notice-period"]').fill('15');

    const putContractRequest = page.waitForRequest(
      (req) => req.url().includes('/contracts/2024-01026') && req.method() === 'PUT'
    );
    await page.locator('[data-cy="lopande-disclosure"] button.sk-btn-primary').filter({ hasText: 'Spara' }).click();
    const leaseAgreement: Contract = (await putContractRequest).postDataJSON();
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
        'Avgift, lägenhetsarrende. AVTALSFASTIGHET 1:123, AVTALSFASTIGHET 2:456',
        'Foobar',
      ],
    });
  });

  test('manages creating a new lease agreement with correct default values', async ({ page, mockRoute, dismissCookieConsent }) => {
    await visitErrandWithoutContract(page, mockRoute, dismissCookieConsent);
    await page.locator('[data-cy="contract-type-select"]').selectOption(ContractType.LEASE_AGREEMENT);
    await page.locator('[data-cy="contract-subtype-select"]').selectOption(LeaseType.LAND_LEASE_RESIDENTIAL);

    // A new lease agreement starts with an empty parties table; parties are added manually
    const partiesTable = page.locator('[data-cy="parties-table"]');
    await expect(partiesTable).toBeVisible();
    await expect(partiesTable).toContainText('Inga parter tillagda');

    // Lease-agreement specific disclosures should be present
    await expect(page.locator('[data-cy="area-disclosure"]')).toBeVisible();
    await expect(page.locator('[data-cy="avtalstid-disclosure"]')).toBeVisible();
    await expect(page.locator('[data-cy="lopande-disclosure"]')).toBeVisible();
    await expect(page.locator('[data-cy="add-party-button"]')).toBeVisible();
  });

  test('manages creating a new purchase agreement with correct default values', async ({ page, mockRoute, dismissCookieConsent }) => {
    await visitErrandWithoutContract(page, mockRoute, dismissCookieConsent);

    // Switch to PURCHASE_AGREEMENT
    await page.locator('[data-cy="contract-type-select"]').selectOption(ContractType.PURCHASE_AGREEMENT);

    // Purchase agreements have no lease subtype
    await expect(page.locator('[data-cy="contract-subtype-select"]')).not.toBeVisible();

    // A new purchase agreement starts with an empty parties table
    const partiesTable = page.locator('[data-cy="parties-table"]');
    await expect(partiesTable).toBeVisible();
    await expect(partiesTable).toContainText('Inga parter tillagda');
    await expect(page.locator('[data-cy="add-party-button"]')).toBeVisible();
  });

  test('manages creating a new LAND_LEASE_PUBLIC contract with correct default values', async ({ page, mockRoute, dismissCookieConsent }) => {
    await visitErrandWithoutContract(page, mockRoute, dismissCookieConsent);

    await page.locator('[data-cy="contract-type-select"]').selectOption(ContractType.LAND_LEASE_PUBLIC);

    // Verify NO lease subtype dropdown is shown
    await expect(page.locator('[data-cy="contract-subtype-select"]')).not.toBeVisible();

    // A new contract starts with an empty parties table; lease-style disclosures are present
    const partiesTable = page.locator('[data-cy="parties-table"]');
    await expect(partiesTable).toBeVisible();
    await expect(partiesTable).toContainText('Inga parter tillagda');
    await expect(page.locator('[data-cy="area-disclosure"]')).toBeVisible();
    await expect(page.locator('[data-cy="avtalstid-disclosure"]')).toBeVisible();
    await expect(page.locator('[data-cy="add-party-button"]')).toBeVisible();
  });

  test('manages creating a new SHORT_TERM_LEASE_AGREEMENT contract with correct default values', async ({ page, mockRoute, dismissCookieConsent }) => {
    await visitErrandWithoutContract(page, mockRoute, dismissCookieConsent);

    await page.locator('[data-cy="contract-type-select"]').selectOption(ContractType.SHORT_TERM_LEASE_AGREEMENT);

    await expect(page.locator('[data-cy="contract-subtype-select"]')).not.toBeVisible();

    // A new contract starts with an empty parties table; lease-style disclosures are present
    const partiesTable = page.locator('[data-cy="parties-table"]');
    await expect(partiesTable).toBeVisible();
    await expect(partiesTable).toContainText('Inga parter tillagda');
    await expect(page.locator('[data-cy="area-disclosure"]')).toBeVisible();
    await expect(page.locator('[data-cy="avtalstid-disclosure"]')).toBeVisible();
    await expect(page.locator('[data-cy="add-party-button"]')).toBeVisible();
  });

  test('manages creating a new lease agreement with manual party selection', async ({ page, mockRoute, dismissCookieConsent }) => {
    await visitErrandWithoutContract(page, mockRoute, dismissCookieConsent);
    await page.locator('[data-cy="contract-type-select"]').selectOption(ContractType.LEASE_AGREEMENT);
    await page.locator('[data-cy="contract-subtype-select"]').selectOption(LeaseType.LAND_LEASE_MISC);

    // Verify parties table exists but is empty initially
    await expect(page.locator('[data-cy="parties-table"]')).toBeVisible();
    await expect(page.locator('[data-cy="parties-table"]')).toContainText('Inga parter tillagda');

    // Add lessor via party modal
    await page.locator('[data-cy="add-party-button"]').click();
    await expect(page.locator('[data-cy="party-modal-stakeholder-select"]')).toBeVisible();
    await page.locator('[data-cy="party-modal-stakeholder-select"]').selectOption('2260');
    await page.locator('[data-cy="party-modal-role-LESSOR"]').check({ force: true });
    await expect(page.locator('[data-cy="party-modal-save-button"]')).toBeEnabled();
    await page.locator('[data-cy="party-modal-save-button"]').click();
    await expect(page.locator('[data-cy="party-modal-stakeholder-select"]')).toBeHidden();

    // Verify lessor was added
    const lessorRow = page.locator('[data-cy="parties-table"]').locator('[data-cy="party-row-0"]');
    await expect(lessorRow).toBeVisible();
    await expect(lessorRow.locator('[data-cy="party-0-name"]')).toContainText('Test Upplåtarsson');
    await expect(lessorRow.locator('[data-cy="party-0-role"]')).toContainText('Upplåtare');

    // Add lessee with billing role via party modal
    await page.locator('[data-cy="add-party-button"]').click();
    await expect(page.locator('[data-cy="party-modal-stakeholder-select"]')).toBeVisible();
    await page.locator('[data-cy="party-modal-stakeholder-select"]').selectOption('2280');
    await page.locator('[data-cy="party-modal-role-LESSEE"]').check({ force: true });
    await page.locator('[data-cy="party-modal-role-PRIMARY_BILLING_PARTY"]').check({ force: true });
    await expect(page.locator('[data-cy="party-modal-save-button"]')).toBeEnabled();
    await page.locator('[data-cy="party-modal-save-button"]').click();
    await expect(page.locator('[data-cy="party-modal-stakeholder-select"]')).toBeHidden();

    // Verify lessee was added with both roles
    const lesseeRow = page.locator('[data-cy="parties-table"]').locator('[data-cy="party-row-1"]');
    await expect(lesseeRow).toBeVisible();
    await expect(lesseeRow.locator('[data-cy="party-1-name"]')).toContainText('Test Arrendatorsson');
    await expect(lesseeRow.locator('[data-cy="party-1-role"]')).toContainText('Arrendator');
    await expect(lesseeRow.locator('[data-cy="party-1-role"]')).toContainText('Fakturamottagare');

    // Fill required fields before saving
    await page.locator('[data-cy="avtalstid-disclosure"] button.sk-disclosure-header-button').click();
    await page.locator('[data-cy="avtalstid-start"]').fill('2024-01-01');
    await page.locator('[data-cy="all-notice-period"]').clear();
    await page.locator('[data-cy="all-notice-period"]').fill('3');

    // Save the contract
    const postContractRequest = page.waitForRequest(
      (req) => req.url().includes('/contracts') && req.method() === 'POST'
    );
    await page.locator('[data-cy="parties-disclosure"]').locator('[data-cy="save-contract-button"]').click();
    const leaseAgreement: Contract = (await postContractRequest).postDataJSON();
    expect(leaseAgreement.type).toBe(ContractType.LEASE_AGREEMENT);
    expect(leaseAgreement.leaseType).toBe(LeaseType.LAND_LEASE_MISC);
    const lessor = leaseAgreement.stakeholders.find((s) => s.roles.includes(StakeholderRole.LESSOR));
    const lessee = leaseAgreement.stakeholders.find((s) => s.roles.includes(StakeholderRole.LESSEE));
    expect(lessor).toBeTruthy();
    expect(lessee).toBeTruthy();
    expect(lessor.firstName).toBe('Test');
    expect(lessor.lastName).toBe('Upplåtarsson');
    expect(lessee.firstName).toBe('Test');
    expect(lessee.lastName).toBe('Arrendatorsson');
    // Lessee should also have PRIMARY_BILLING_PARTY role
    expect(lessee.roles).toContain(StakeholderRole.PRIMARY_BILLING_PARTY);
  });

  test('manages creating a new purchase agreement with manual party selection', async ({ page, mockRoute, dismissCookieConsent }) => {
    await visitErrandWithoutContract(page, mockRoute, dismissCookieConsent);

    // Switch to PURCHASE_AGREEMENT
    await page.locator('[data-cy="contract-type-select"]').selectOption(ContractType.PURCHASE_AGREEMENT);

    // Verify parties table exists but is empty
    await expect(page.locator('[data-cy="parties-table"]')).toBeVisible();
    await expect(page.locator('[data-cy="parties-table"]')).toContainText('Inga parter tillagda');

    // Add seller via party modal
    await page.locator('[data-cy="add-party-button"]').click();
    await expect(page.locator('[data-cy="party-modal-stakeholder-select"]')).toBeVisible();
    await page.locator('[data-cy="party-modal-stakeholder-select"]').selectOption('2290');
    await page.locator('[data-cy="party-modal-role-SELLER"]').check({ force: true });
    await expect(page.locator('[data-cy="party-modal-save-button"]')).toBeEnabled();
    await page.locator('[data-cy="party-modal-save-button"]').click();
    await expect(page.locator('[data-cy="party-modal-stakeholder-select"]')).toBeHidden();

    // Verify seller was added
    const sellerRow = page.locator('[data-cy="parties-table"]').locator('[data-cy="party-row-0"]');
    await expect(sellerRow).toBeVisible();
    await expect(sellerRow.locator('[data-cy="party-0-name"]')).toContainText('Daniella Testarsson');
    await expect(sellerRow.locator('[data-cy="party-0-role"]')).toContainText('Säljare');

    // Add buyer via party modal
    await page.locator('[data-cy="add-party-button"]').click();
    await expect(page.locator('[data-cy="party-modal-stakeholder-select"]')).toBeVisible();
    await page.locator('[data-cy="party-modal-stakeholder-select"]').selectOption('2106');
    await page.locator('[data-cy="party-modal-role-BUYER"]').check({ force: true });
    await expect(page.locator('[data-cy="party-modal-save-button"]')).toBeEnabled();
    await page.locator('[data-cy="party-modal-save-button"]').click();
    await expect(page.locator('[data-cy="party-modal-stakeholder-select"]')).toBeHidden();

    // Verify buyer was added
    const buyerRow = page.locator('[data-cy="parties-table"]').locator('[data-cy="party-row-1"]');
    await expect(buyerRow).toBeVisible();
    await expect(buyerRow.locator('[data-cy="party-1-name"]')).toContainText('Test Köparsson');
    await expect(buyerRow.locator('[data-cy="party-1-role"]')).toContainText('Köpare');

    const postContractRequest = page.waitForRequest(
      (req) => req.url().includes('/contracts') && req.method() === 'POST'
    );
    await page.locator('[data-cy="parties-disclosure"]').locator('[data-cy="save-contract-button"]').click();
    const purchaseAgreement: Contract = (await postContractRequest).postDataJSON();
    expect(purchaseAgreement.type).toBe(ContractType.PURCHASE_AGREEMENT);
    expect(purchaseAgreement.leaseType).toBeUndefined();
    const seller = purchaseAgreement.stakeholders.find((s) => s.roles.includes(StakeholderRole.SELLER));
    const buyer = purchaseAgreement.stakeholders.find((s) => s.roles.includes(StakeholderRole.BUYER));
    expect(seller).toBeTruthy();
    expect(buyer).toBeTruthy();
    expect(seller.firstName).toBe('Daniella');
    expect(seller.lastName).toBe('Testarsson');
    expect(buyer.firstName).toBe('Test');
    expect(buyer.lastName).toBe('Köparsson');
  });

  test('manages creating a new LAND_LEASE_PUBLIC contract with manual party selection', async ({ page, mockRoute, dismissCookieConsent }) => {
    await visitErrandWithoutContract(page, mockRoute, dismissCookieConsent);

    // Select the new contract type
    await page.locator('[data-cy="contract-type-select"]').selectOption(ContractType.LAND_LEASE_PUBLIC);

    // Verify NO lease subtype dropdown is shown (only for LEASE_AGREEMENT)
    await expect(page.locator('[data-cy="contract-subtype-select"]')).not.toBeVisible();

    // Verify parties table exists but is empty
    await expect(page.locator('[data-cy="parties-table"]')).toBeVisible();
    await expect(page.locator('[data-cy="parties-table"]')).toContainText('Inga parter tillagda');

    // Add lessor via party modal
    await page.locator('[data-cy="add-party-button"]').click();
    await expect(page.locator('[data-cy="party-modal-stakeholder-select"]')).toBeVisible();
    await page.locator('[data-cy="party-modal-stakeholder-select"]').selectOption('2260');
    await page.locator('[data-cy="party-modal-role-LESSOR"]').check({ force: true });
    await expect(page.locator('[data-cy="party-modal-save-button"]')).toBeEnabled();
    await page.locator('[data-cy="party-modal-save-button"]').click();
    await expect(page.locator('[data-cy="party-modal-stakeholder-select"]')).toBeHidden();

    // Verify lessor was added
    const lessorRow = page.locator('[data-cy="parties-table"]').locator('[data-cy="party-row-0"]');
    await expect(lessorRow).toBeVisible();
    await expect(lessorRow.locator('[data-cy="party-0-name"]')).toContainText('Test Upplåtarsson');
    await expect(lessorRow.locator('[data-cy="party-0-role"]')).toContainText('Upplåtare');

    // Add lessee via party modal
    await page.locator('[data-cy="add-party-button"]').click();
    await expect(page.locator('[data-cy="party-modal-stakeholder-select"]')).toBeVisible();
    await page.locator('[data-cy="party-modal-stakeholder-select"]').selectOption('2280');
    await page.locator('[data-cy="party-modal-role-LESSEE"]').check({ force: true });
    await expect(page.locator('[data-cy="party-modal-save-button"]')).toBeEnabled();
    await page.locator('[data-cy="party-modal-save-button"]').click();
    await expect(page.locator('[data-cy="party-modal-stakeholder-select"]')).toBeHidden();

    // Verify lessee was added
    const lesseeRow = page.locator('[data-cy="parties-table"]').locator('[data-cy="party-row-1"]');
    await expect(lesseeRow).toBeVisible();
    await expect(lesseeRow.locator('[data-cy="party-1-name"]')).toContainText('Test Arrendatorsson');
    await expect(lesseeRow.locator('[data-cy="party-1-role"]')).toContainText('Arrendator');

    // Fill required fields before saving
    await page.locator('[data-cy="avtalstid-disclosure"] button.sk-disclosure-header-button').click();
    await page.locator('[data-cy="avtalstid-start"]').fill('2024-01-01');
    await page.locator('[data-cy="all-notice-period"]').clear();
    await page.locator('[data-cy="all-notice-period"]').fill('3');

    // Save and verify contract type in request
    const postContractRequest = page.waitForRequest(
      (req) => req.url().includes('/contracts') && req.method() === 'POST'
    );
    await page.locator('[data-cy="parties-disclosure"]').locator('[data-cy="save-contract-button"]').click();
    const contract: Contract = (await postContractRequest).postDataJSON();
    expect(contract.type).toBe(ContractType.LAND_LEASE_PUBLIC);
    expect(contract.leaseType).toBeUndefined();
    expect(contract.stakeholders.some((s) => s.roles.includes(StakeholderRole.LESSOR))).toBe(true);
    expect(contract.stakeholders.some((s) => s.roles.includes(StakeholderRole.LESSEE))).toBe(true);
  });

  test('manages creating a new SHORT_TERM_LEASE_AGREEMENT contract with manual party selection', async ({ page, mockRoute, dismissCookieConsent }) => {
    await visitErrandWithoutContract(page, mockRoute, dismissCookieConsent);

    // Select the new contract type
    await page.locator('[data-cy="contract-type-select"]').selectOption(ContractType.SHORT_TERM_LEASE_AGREEMENT);

    // Verify NO lease subtype dropdown is shown (only for LEASE_AGREEMENT)
    await expect(page.locator('[data-cy="contract-subtype-select"]')).not.toBeVisible();

    // Verify parties table exists but is empty
    await expect(page.locator('[data-cy="parties-table"]')).toBeVisible();
    await expect(page.locator('[data-cy="parties-table"]')).toContainText('Inga parter tillagda');

    // Add lessor via party modal
    await page.locator('[data-cy="add-party-button"]').click();
    await expect(page.locator('[data-cy="party-modal-stakeholder-select"]')).toBeVisible();
    await page.locator('[data-cy="party-modal-stakeholder-select"]').selectOption('2260');
    await page.locator('[data-cy="party-modal-role-LESSOR"]').check({ force: true });
    await expect(page.locator('[data-cy="party-modal-save-button"]')).toBeEnabled();
    await page.locator('[data-cy="party-modal-save-button"]').click();
    await expect(page.locator('[data-cy="party-modal-stakeholder-select"]')).toBeHidden();

    // Verify lessor was added
    const lessorRow = page.locator('[data-cy="parties-table"]').locator('[data-cy="party-row-0"]');
    await expect(lessorRow).toBeVisible();
    await expect(lessorRow.locator('[data-cy="party-0-name"]')).toContainText('Test Upplåtarsson');
    await expect(lessorRow.locator('[data-cy="party-0-role"]')).toContainText('Upplåtare');

    // Add lessee via party modal
    await page.locator('[data-cy="add-party-button"]').click();
    await expect(page.locator('[data-cy="party-modal-stakeholder-select"]')).toBeVisible();
    await page.locator('[data-cy="party-modal-stakeholder-select"]').selectOption('2280');
    await page.locator('[data-cy="party-modal-role-LESSEE"]').check({ force: true });
    await expect(page.locator('[data-cy="party-modal-save-button"]')).toBeEnabled();
    await page.locator('[data-cy="party-modal-save-button"]').click();
    await expect(page.locator('[data-cy="party-modal-stakeholder-select"]')).toBeHidden();

    // Verify lessee was added
    const lesseeRow = page.locator('[data-cy="parties-table"]').locator('[data-cy="party-row-1"]');
    await expect(lesseeRow).toBeVisible();
    await expect(lesseeRow.locator('[data-cy="party-1-name"]')).toContainText('Test Arrendatorsson');
    await expect(lesseeRow.locator('[data-cy="party-1-role"]')).toContainText('Arrendator');

    // Fill required fields before saving
    await page.locator('[data-cy="avtalstid-disclosure"] button.sk-disclosure-header-button').click();
    await page.locator('[data-cy="avtalstid-start"]').fill('2024-01-01');
    await page.locator('[data-cy="all-notice-period"]').clear();
    await page.locator('[data-cy="all-notice-period"]').fill('3');

    // Save and verify contract type in request
    const postContractRequest = page.waitForRequest(
      (req) => req.url().includes('/contracts') && req.method() === 'POST'
    );
    await page.locator('[data-cy="parties-disclosure"]').locator('[data-cy="save-contract-button"]').click();
    const contract: Contract = (await postContractRequest).postDataJSON();
    expect(contract.type).toBe(ContractType.SHORT_TERM_LEASE_AGREEMENT);
    expect(contract.leaseType).toBeUndefined();
    expect(contract.stakeholders.some((s) => s.roles.includes(StakeholderRole.LESSOR))).toBe(true);
    expect(contract.stakeholders.some((s) => s.roles.includes(StakeholderRole.LESSEE))).toBe(true);
  });

  test.describe('Manual party selection with stakeholders without partyId', () => {
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

    test('allows selecting stakeholders without partyId as billing parties', async ({ page, mockRoute, dismissCookieConsent }) => {
      // Override the errand intercept for this test
      await mockRoute('**/errand/101', mockMexErrandWithManualStakeholder, { method: 'GET' }); // @getErrandByIdManual
      await mockRoute('**/errand/errandNumber/*', mockMexErrandWithManualStakeholder, { method: 'GET' }); // @getErrandManual
      const errandResponse = page.waitForResponse(
        (resp) => resp.url().includes('/errand/errandNumber/') && resp.status() === 200
      );
      await page.goto(`arende/${mockMexErrand_base.data.id}`);
      await errandResponse;
      await dismissCookieConsent();
      const tab = page.getByRole('tab', { name: 'Avtal', exact: true });
      await tab.click({ force: true });
      await page.locator('[data-cy="contract-type-select"]').selectOption(ContractType.LEASE_AGREEMENT);

      // Add lessor via party modal
      await page.locator('[data-cy="add-party-button"]').click();
      await expect(page.locator('[data-cy="party-modal-stakeholder-select"]')).toBeVisible();
      await page.locator('[data-cy="party-modal-stakeholder-select"]').selectOption('2260');
      await page.locator('[data-cy="party-modal-role-LESSOR"]').check({ force: true });
      await expect(page.locator('[data-cy="party-modal-save-button"]')).toBeEnabled();
      await page.locator('[data-cy="party-modal-save-button"]').click();
      await expect(page.locator('[data-cy="party-modal-stakeholder-select"]')).toBeHidden();

      // Add lessee (Test Arrendatorsson)
      await page.locator('[data-cy="add-party-button"]').click();
      await expect(page.locator('[data-cy="party-modal-stakeholder-select"]')).toBeVisible();
      await page.locator('[data-cy="party-modal-stakeholder-select"]').selectOption('2280');
      await page.locator('[data-cy="party-modal-role-LESSEE"]').check({ force: true });
      await expect(page.locator('[data-cy="party-modal-save-button"]')).toBeEnabled();
      await page.locator('[data-cy="party-modal-save-button"]').click();
      await expect(page.locator('[data-cy="party-modal-stakeholder-select"]')).toBeHidden();

      // Add manual stakeholder (without partyId) as lessee + billing party
      await page.locator('[data-cy="add-party-button"]').click();
      await expect(page.locator('[data-cy="party-modal-stakeholder-select"]')).toBeVisible();
      await page.locator('[data-cy="party-modal-stakeholder-select"]').selectOption('9999');
      await page.locator('[data-cy="party-modal-role-LESSEE"]').check({ force: true });
      await page.locator('[data-cy="party-modal-role-PRIMARY_BILLING_PARTY"]').check({ force: true });
      await expect(page.locator('[data-cy="party-modal-save-button"]')).toBeEnabled();
      await page.locator('[data-cy="party-modal-save-button"]').click();
      await expect(page.locator('[data-cy="party-modal-stakeholder-select"]')).toBeHidden();

      // Verify all parties were added
      await expect(page.locator('[data-cy="parties-table"]').locator('[data-cy="party-row-0"]')).toBeVisible();
      await expect(page.locator('[data-cy="parties-table"]').locator('[data-cy="party-row-1"]')).toBeVisible();
      await expect(page.locator('[data-cy="parties-table"]').locator('[data-cy="party-row-2"]')).toBeVisible();

      // Verify the manual stakeholder has billing role
      await expect(page.locator('[data-cy="parties-table"]')).toContainText('Manual Stakeholder');
      await expect(page.locator('[data-cy="parties-table"]')).toContainText('Fakturamottagare');

      // Fill required fields before saving
      await page.locator('[data-cy="avtalstid-disclosure"] button.sk-disclosure-header-button').click();
      await page.locator('[data-cy="avtalstid-start"]').fill('2024-01-01');
      await page.locator('[data-cy="all-notice-period"]').clear();
      await page.locator('[data-cy="all-notice-period"]').fill('3');

      // Save the contract and verify the stakeholder is included with PRIMARY_BILLING_PARTY role
      const postContractRequest = page.waitForRequest(
        (req) => req.url().includes('/contracts') && req.method() === 'POST'
      );
      await page.locator('[data-cy="parties-disclosure"]').locator('[data-cy="save-contract-button"]').click();
      const contract: Contract = (await postContractRequest).postDataJSON();
      const manualStakeholder = contract.stakeholders.find(
        (s) => s.firstName === 'Manual' && s.lastName === 'Stakeholder'
      );
      expect(manualStakeholder).toBeTruthy();
      expect(manualStakeholder.roles).toContain(StakeholderRole.LESSEE);
      expect(manualStakeholder.roles).toContain(StakeholderRole.PRIMARY_BILLING_PARTY);
      // The manual stakeholder should NOT have a meaningful partyId since it was added without personnummer
      expect(manualStakeholder.partyId).toBeFalsy();
    });
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

        const errandResponse = page.waitForResponse(
          (resp) => resp.url().includes('/errand/errandNumber/') && resp.status() === 200
        );
        const contractResponse = page.waitForResponse(
          (resp) => resp.url().includes(`/contracts/${activeContractId}`) && resp.status() === 200
        );
        await page.goto(`arende/${mockMexErrand_base.data.id}`);
        await errandResponse;
        await contractResponse;
        await dismissCookieConsent();
        const tab = page.getByRole('tab', { name: 'Avtal', exact: true });
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

        await page.locator('[data-cy="area-disclosure"] button.sk-disclosure-header-button').click();
        const checkboxes = page.locator('[data-cy="contract-property-designation-checkboxgroup"] input[type="checkbox"]');
        const count = await checkboxes.count();
        for (let i = 0; i < count; i++) {
          await expect(checkboxes.nth(i)).toBeDisabled();
        }

        await page.locator('[data-cy="avtalstid-disclosure"] button.sk-disclosure-header-button').click();
        await expect(page.locator('[data-cy="avtalstid-start"]')).toHaveAttribute('readonly');
        await expect(page.locator('[data-cy="avtalstid-end"]')).toHaveAttribute('readonly');
        await expect(page.locator('[data-cy="lessee-notice-unit"]')).toBeDisabled();
        await expect(page.locator('[data-cy="lessee-notice-period"]')).toHaveAttribute('readonly');
        await expect(page.locator('[data-cy="lessor-notice-unit"]')).toBeDisabled();
        await expect(page.locator('[data-cy="lessor-notice-period"]')).toHaveAttribute('readonly');

        await page.locator('[data-cy="lopande-disclosure"] button.sk-disclosure-header-button').click();
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

        await page.locator('[data-cy="lopande-disclosure"] button.sk-disclosure-header-button').click();

        await expect(page.locator('[data-cy="invoice-markup-input"]')).not.toHaveAttribute('readonly');
        await page.locator('[data-cy="invoice-markup-input"]').clear();
        await page.locator('[data-cy="invoice-markup-input"]').fill('NEW-REF-456');
        await expect(page.locator('[data-cy="invoice-markup-input"]')).toHaveValue('NEW-REF-456');

        await expect(page.locator('[data-cy="fees-additional-information-1-input"]')).not.toHaveAttribute('readonly');
        await page.locator('[data-cy="fees-additional-information-1-input"]').clear();
        await page.locator('[data-cy="fees-additional-information-1-input"]').fill('Extra info');
        await expect(page.locator('[data-cy="fees-additional-information-1-input"]')).toHaveValue('Extra info');
      });

      test('shows "Lägg till ny part" button for ACTIVE contracts', async ({ page }) => {
        await expect(page.locator('[data-cy="non-draft-warning-banner"]')).toBeVisible();

        await expect(page.locator('[data-cy="add-party-button"]')).toBeVisible();
        await expect(page.locator('[data-cy="add-party-button"]')).toContainText('Lägg till ny part');
      });

      test('does not allow removing parties for ACTIVE contracts but allows editing roles and adding billing party', async ({ page }) => {
        await expect(page.locator('[data-cy="non-draft-warning-banner"]')).toBeVisible();

        // For ACTIVE contracts, add party button should exist (for adding billing party)
        await expect(page.locator('[data-cy="add-party-button"]')).toBeVisible();
        // Remove button should not exist for non-DRAFT contracts
        await expect(page.locator('[data-cy="party-0-remove-button"]')).toHaveCount(0);
        // Edit button should still exist (for editing roles like billing party)
        await expect(page.locator('[data-cy="party-0-edit-button"]')).toBeVisible();

        // Opening the add party modal should only show Fakturamottagare role
        await page.locator('[data-cy="add-party-button"]').click();
        await expect(page.locator('[data-cy="party-modal-role-PRIMARY_BILLING_PARTY"]')).toBeVisible();
        await expect(page.locator('[data-cy="party-modal-role-LESSEE"]')).toHaveCount(0);
        await expect(page.locator('[data-cy="party-modal-role-LESSOR"]')).toHaveCount(0);
      });
    });

    test('does not show warning banner for DRAFT contracts', async ({ page, mockRoute, dismissCookieConsent }) => {
      // Uses default beforeEach intercept with DRAFT status
      const errandResponse = page.waitForResponse(
        (resp) => resp.url().includes('/errand/errandNumber/') && resp.status() === 200
      );
      await page.goto(`arende/${mockMexErrand_base.data.id}`);
      await errandResponse;
      await dismissCookieConsent();
      const tab = page.getByRole('tab', { name: 'Avtal', exact: true });
      await tab.click({ force: true });
      await expect(page.locator('[data-cy="contract-type-select"]')).toBeVisible();
      await expect(page.locator('[data-cy="non-draft-warning-banner"]')).not.toBeVisible();
      await expect(page.locator('[data-cy="add-party-button"]')).toContainText('Lägg till ny part');
    });
  });
});
