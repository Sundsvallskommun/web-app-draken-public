import { ContractData } from '@casedata/interfaces/contract-data';
import { Contract, ContractType, IntervalType, InvoicedIn, LeaseType, TimeUnit } from '@casedata/interfaces/contracts';
import { apiService } from '@common/services/api-service';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { contractToLagenhetsArrende, defaultLagenhetsarrende, saveContract } from './contract-service';

vi.mock('@common/services/api-service', () => ({ apiService: { post: vi.fn(), put: vi.fn() } }));
vi.mock('@common/services/facilities-service', () => ({ getSingleFacilityByDesignation: vi.fn() }));

const leaseContract = (invoicing: Partial<NonNullable<Contract['invoicing']>>): Contract =>
  ({
    ...defaultLagenhetsarrende,
    contractId: '2026-00001',
    invoicing: {
      invoiceInterval: IntervalType.QUARTERLY,
      invoicedIn: InvoicedIn.ADVANCE,
      billingEnabled: true,
      ...invoicing,
    },
  } as unknown as Contract);

/** Saves the form data and returns the contract sent to the API. */
const savedContract = async (data: ContractData): Promise<Contract> => {
  await saveContract(data);
  const [, body] = vi.mocked(apiService.put).mock.calls[0];
  return body as Contract;
};

beforeEach(() => {
  vi.mocked(apiService.put)
    .mockReset()
    .mockResolvedValue({ data: { data: {} } } as never);
  vi.spyOn(console, 'log').mockImplementation(() => {});
});

describe('reading a contract', () => {
  test('maps invoicing.billingEnabled to "Ska detta avtal generera en faktura?"', () => {
    expect(contractToLagenhetsArrende(leaseContract({ billingEnabled: true })).generateInvoice).toBe('true');
    expect(contractToLagenhetsArrende(leaseContract({ billingEnabled: false })).generateInvoice).toBe('false');
  });

  test('keeps the yearly billing month', () => {
    const june = contractToLagenhetsArrende(
      leaseContract({ invoiceInterval: IntervalType.YEARLY, yearlyBillingMonth: 6 })
    );
    expect(june.invoicing?.yearlyBillingMonth).toBe(6);
  });

  test('adds no billing month to a contract that is not invoiced yearly', () => {
    const contract = contractToLagenhetsArrende(leaseContract({ invoiceInterval: IntervalType.QUARTERLY }));
    expect(contract.invoicing).not.toHaveProperty('yearlyBillingMonth');
  });

  test('keeps the default invoicing for a contract without invoicing details', () => {
    const { invoicing: _omitted, ...withoutInvoicing } = leaseContract({});
    const contract = contractToLagenhetsArrende(withoutInvoicing as Contract);
    expect(contract.invoicing).toEqual(defaultLagenhetsarrende.invoicing);
    expect(contract.generateInvoice).toBe('true');
  });

  test('defaults a missing yearly billing month to December', () => {
    const contract = contractToLagenhetsArrende(leaseContract({ invoiceInterval: IntervalType.YEARLY }));
    expect(contract.invoicing?.yearlyBillingMonth).toBe(12);
  });

  test('leaves "Automatisk förlängning av avtalet" unanswered when the contract has no extension details', () => {
    const { extension: _omitted, ...withoutExtension } = leaseContract({});
    expect(contractToLagenhetsArrende(withoutExtension as Contract).extension?.autoExtend).toBeUndefined();

    const withNullAutoExtend = { ...leaseContract({}), extension: { autoExtend: null } } as unknown as Contract;
    expect(contractToLagenhetsArrende(withNullAutoExtend).extension?.autoExtend).toBeUndefined();
  });

  test('keeps an answered "Automatisk förlängning av avtalet"', () => {
    const no = { ...leaseContract({}), extension: { autoExtend: false } } as Contract;
    expect(contractToLagenhetsArrende(no).extension?.autoExtend).toBe(false);
    const yes = { ...leaseContract({}), extension: { autoExtend: true, leaseExtension: 1, unit: TimeUnit.YEARS } };
    expect(contractToLagenhetsArrende(yes as Contract).extension).toMatchObject({
      autoExtend: true,
      leaseExtension: 1,
    });
  });

  test('drops a leaseType from a contract that is not an Arrende', () => {
    const shortTerm = {
      ...leaseContract({}),
      type: ContractType.SHORT_TERM_LEASE_AGREEMENT,
      leaseType: LeaseType.LAND_LEASE_MISC,
    } as Contract;
    expect(contractToLagenhetsArrende(shortTerm).leaseType).toBeUndefined();
  });
});

describe('saving a contract', () => {
  const formData = (overrides: Partial<ContractData>): ContractData => ({
    ...contractToLagenhetsArrende(leaseContract({})),
    fees: { yearly: 1200 } as ContractData['fees'],
    ...overrides,
  });

  test('sends billingEnabled from "Ska detta avtal generera en faktura?"', async () => {
    expect((await savedContract(formData({ generateInvoice: 'true' }))).invoicing?.billingEnabled).toBe(true);
    vi.mocked(apiService.put).mockClear();
    expect((await savedContract(formData({ generateInvoice: 'false' }))).invoicing?.billingEnabled).toBe(false);
  });

  test('keeps the fee when the contract is not billed', async () => {
    const contract = await savedContract(formData({ generateInvoice: 'false' }));
    expect(contract.fees?.yearly).toBe(1200);
  });

  test('sends the yearly billing month for yearly invoicing only', async () => {
    const yearly = await savedContract(
      formData({
        invoicing: {
          invoiceInterval: IntervalType.YEARLY,
          invoicedIn: InvoicedIn.ADVANCE,
          billingEnabled: true,
          yearlyBillingMonth: 6,
        },
      })
    );
    expect(yearly.invoicing?.yearlyBillingMonth).toBe(6);

    vi.mocked(apiService.put).mockClear();
    const quarterly = await savedContract(
      formData({
        invoicing: {
          invoiceInterval: IntervalType.QUARTERLY,
          invoicedIn: InvoicedIn.ADVANCE,
          billingEnabled: true,
          yearlyBillingMonth: 6,
        },
      })
    );
    expect(quarterly.invoicing).not.toHaveProperty('yearlyBillingMonth');
  });

  test('sends no extension while "Automatisk förlängning av avtalet" is unanswered', async () => {
    const contract = await savedContract(formData({ extension: { unit: TimeUnit.DAYS } }));
    expect(contract.extension).toBeUndefined();
  });

  test('sends an answered "Automatisk förlängning av avtalet"', async () => {
    const no = await savedContract(
      formData({ extension: { autoExtend: false, unit: TimeUnit.DAYS, leaseExtension: 3 } })
    );
    expect(no.extension).toEqual({ autoExtend: false, unit: TimeUnit.DAYS });

    vi.mocked(apiService.put).mockClear();
    const yes = await savedContract(
      formData({ extension: { autoExtend: true, unit: TimeUnit.YEARS, leaseExtension: 1 } })
    );
    expect(yes.extension).toEqual({ autoExtend: true, unit: TimeUnit.YEARS, leaseExtension: 1 });
  });

  test('saves a Korttidsarrende without leaseType and without billing', async () => {
    const contract = await savedContract(
      formData({
        type: ContractType.SHORT_TERM_LEASE_AGREEMENT,
        leaseType: LeaseType.LAND_LEASE_MISC,
        generateInvoice: 'true',
      })
    );
    expect(contract.type).toBe(ContractType.SHORT_TERM_LEASE_AGREEMENT);
    expect(contract.leaseType).toBeUndefined();
    expect(contract.invoicing?.billingEnabled).toBe(false);
  });

  test('keeps the leaseType of an Arrende', async () => {
    const contract = await savedContract(
      formData({ type: ContractType.LEASE_AGREEMENT, leaseType: LeaseType.SITE_LEASE_COMMERCIAL })
    );
    expect(contract.leaseType).toBe(LeaseType.SITE_LEASE_COMMERCIAL);
  });

  test('sends the chosen indexår together with its KPI value', async () => {
    const contract = await savedContract(
      formData({
        indexAdjusted: 'true',
        fees: { yearly: 1200, indexYear: 2023, indexNumber: 408.12, indexType: 'KPI 80' } as ContractData['fees'],
      })
    );
    expect(contract.fees).toMatchObject({ indexYear: 2023, indexNumber: 408.12, indexType: 'KPI 80' });
  });

  test('defaults the yearly billing month to December when none was chosen', async () => {
    const contract = await savedContract(
      formData({
        invoicing: { invoiceInterval: IntervalType.YEARLY, invoicedIn: InvoicedIn.ADVANCE, billingEnabled: true },
      })
    );
    expect(contract.invoicing?.yearlyBillingMonth).toBe(12);
  });
});
