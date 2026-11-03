import { ContractData } from '@casedata/interfaces/contract-data';
import { Contract, IntervalType, InvoicedIn } from '@casedata/interfaces/contracts';
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

  test('defaults the yearly billing month to December when none was chosen', async () => {
    const contract = await savedContract(
      formData({
        invoicing: { invoiceInterval: IntervalType.YEARLY, invoicedIn: InvoicedIn.ADVANCE, billingEnabled: true },
      })
    );
    expect(contract.invoicing?.yearlyBillingMonth).toBe(12);
  });
});
