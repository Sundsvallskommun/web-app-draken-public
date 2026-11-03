import { IntervalType, InvoicedIn, Status } from '@casedata/interfaces/contracts';
import type { Page } from '@playwright/test';

import { expect, test } from '../../fixtures/base.fixture';
import { billingSection } from '../blocks/mex-billing';
import {
  fillContractPeriod,
  leaseAgreementWith,
  MOCK_KPI,
  mockMexContractTab,
  openMexContractTab,
} from '../blocks/mex-contract-tab';
import { mockLeaseAgreement } from '../fixtures/mockContract';

/**
 * The billing part ("Löpande avgift") of a lease agreement in the errand's contract tab: whether the
 * contract is billed (invoicing.billingEnabled), the fee, index adjustment, how and when it is
 * invoiced (incl. invoicing.yearlyBillingMonth), reference and avitexter, and the fakturamottagare.
 */

const billed = { invoiceInterval: IntervalType.QUARTERLY, invoicedIn: InvoicedIn.ADVANCE, billingEnabled: true };
const invoiceInfo = (parameters: Record<string, string>) => [
  { name: 'errandId', parameters: { errandId: '101' } },
  { name: 'InvoiceInfo', parameters },
];

/** Opens the contract tab of the errand with the given contract and expands its billing section. */
const openBilling = async (
  page: Page,
  dismissCookieConsent: () => Promise<void>,
  contract: { data: unknown } = mockLeaseAgreement
) => {
  await mockMexContractTab(page, contract);
  await openMexContractTab(page, dismissCookieConsent);
  const billing = billingSection(page);
  await billing.open();
  return billing;
};

test.describe('Contract billing (Löpande avgift)', () => {
  test('asks every billing question for a lease agreement', async ({ page, dismissCookieConsent }) => {
    const billing = await openBilling(page, dismissCookieConsent);

    await expect(billing.billed.yes).toBeChecked();
    await expect(billing.billed.no).not.toBeChecked();
    await expect(billing.root.getByText('Om en administrativ avgift ska faktureras')).toBeVisible();
    await expect(billing.yearlyFee).toBeVisible();
    await expect(billing.indexed.yes).toBeVisible();
    await expect(billing.indexed.no).toBeVisible();
    // A new lease agreement is invoiced yearly, in advance, in December.
    await expect(billing.interval.yearly).toBeChecked();
    await expect(billing.interval.halfYearly).toBeVisible();
    await expect(billing.interval.quarterly).toBeVisible();
    await expect(billing.yearlyBillingMonth).toHaveValue('12');
    await expect(billing.invoicedIn.advance).toBeChecked();
    await expect(billing.invoicedIn.arrears).toBeVisible();
    await expect(billing.reference).toBeEditable();
    await expect(billing.avitext).toHaveValue('Avgift, lägenhetsarrende');
    await expect(billing.avitext).toHaveAttribute('readonly');
    await expect(billing.addDetailedDescription).toBeVisible();
  });

  test('reads the billing settings of the contract', async ({ page, dismissCookieConsent }) => {
    const billing = await openBilling(
      page,
      dismissCookieConsent,
      leaseAgreementWith({
        invoicing: {
          invoiceInterval: IntervalType.YEARLY,
          invoicedIn: InvoicedIn.ARREARS,
          billingEnabled: false,
          yearlyBillingMonth: 6,
        },
        fees: { yearly: 1500, monthly: 0, total: 1500, currency: 'SEK' },
        extraParameters: invoiceInfo({ markup: 'REF-1', detailedDescription01: 'Rad ett' }),
      })
    );

    await expect(billing.billed.no).toBeChecked();
    await expect(billing.yearlyFee).toHaveValue('1500');
    await expect(billing.interval.yearly).toBeChecked();
    await expect(billing.yearlyBillingMonth).toHaveValue('6');
    await expect(billing.yearlyBillingMonth.locator('option:checked')).toHaveText('Juni');
    await expect(billing.invoicedIn.arrears).toBeChecked();
    await expect(billing.reference).toHaveValue('REF-1');
    await expect(billing.detailedDescription(0)).toHaveValue('Rad ett');
  });

  test('saves the fee and how it is invoiced', async ({ page, dismissCookieConsent }) => {
    const billing = await openBilling(page, dismissCookieConsent);
    await billing.yearlyFee.fill('120');
    await billing.indexed.no.check({ force: true });
    await billing.interval.quarterly.check({ force: true });
    await billing.invoicedIn.arrears.check({ force: true });
    await billing.reference.fill('REF-120');
    await fillContractPeriod(page);

    const contract = await billing.save();

    expect(contract.invoicing).toEqual({
      invoiceInterval: IntervalType.QUARTERLY,
      invoicedIn: InvoicedIn.ARREARS,
      billingEnabled: true,
    });
    expect(contract.fees).toEqual({
      currency: 'SEK',
      monthly: 0,
      yearly: 120,
      total: 120,
      additionalInformation: ['Avgift, lägenhetsarrende'],
    });
    expect(contract.extraParameters?.find((p) => p.name === 'InvoiceInfo')?.parameters?.markup).toBe('REF-120');
  });

  test('saves the invoice reference in InvoiceInfo, whatever the order of the parameter groups', async ({
    page,
    dismissCookieConsent,
  }) => {
    // The errandId group is moved last after load; the reference must still end up in InvoiceInfo.
    const billing = await openBilling(
      page,
      dismissCookieConsent,
      leaseAgreementWith({ invoicing: billed, extraParameters: invoiceInfo({ markup: 'OLD-REF' }) })
    );
    await expect(billing.reference).toHaveValue('OLD-REF');
    await billing.reference.fill('NEW-REF');
    await fillContractPeriod(page);

    const contract = await billing.save();

    expect(contract.extraParameters?.find((p) => p.name === 'InvoiceInfo')?.parameters).toEqual({ markup: 'NEW-REF' });
    expect(contract.extraParameters?.find((p) => p.name === 'errandId')?.parameters).toEqual({ errandId: '101' });
  });

  test('index adjusts the fee from the latest October KPI', async ({ page, dismissCookieConsent }) => {
    const billing = await openBilling(page, dismissCookieConsent, leaseAgreementWith({ invoicing: billed }));
    const kpiYear = Number(MOCK_KPI.period.slice(0, 4));

    await billing.indexed.yes.check({ force: true });
    await expect(billing.indexHelpText).toHaveText(
      `Indexreglering utgår från index enligt KPI 80 för oktober ${kpiYear}: ${MOCK_KPI.value}`
    );
    await billing.yearlyFee.fill('120');
    await billing.reference.fill('REF');
    await fillContractPeriod(page);

    const contract = await billing.save();

    expect(contract.fees).toMatchObject({
      yearly: 120,
      indexType: 'KPI 80',
      indexYear: kpiYear,
      indexNumber: MOCK_KPI.value,
      indexationRate: 1,
    });
  });

  test.describe('yearly invoicing', () => {
    test('asks when the invoice is created, December by default, and saves the choice', async ({
      page,
      dismissCookieConsent,
    }) => {
      const billing = await openBilling(page, dismissCookieConsent, leaseAgreementWith({ invoicing: billed }));
      await expect(billing.yearlyBillingMonth).toHaveCount(0);

      await billing.interval.yearly.check({ force: true });
      await expect(billing.yearlyBillingMonth).toHaveValue('12');
      await expect(billing.yearlyBillingMonth.locator('option')).toHaveText(['December', 'Juni']);
      await billing.yearlyBillingMonth.selectOption('6');
      await billing.reference.fill('REF');
      await fillContractPeriod(page);

      const contract = await billing.save();

      expect(contract.invoicing).toEqual({
        invoiceInterval: IntervalType.YEARLY,
        invoicedIn: InvoicedIn.ADVANCE,
        billingEnabled: true,
        yearlyBillingMonth: 6,
      });
    });

    test('drops the month when the contract is no longer invoiced yearly', async ({ page, dismissCookieConsent }) => {
      const billing = await openBilling(
        page,
        dismissCookieConsent,
        leaseAgreementWith({ invoicing: { ...billed, invoiceInterval: IntervalType.YEARLY, yearlyBillingMonth: 6 } })
      );
      await expect(billing.yearlyBillingMonth).toHaveValue('6');

      await billing.interval.halfYearly.check({ force: true });
      await expect(billing.yearlyBillingMonth).toHaveCount(0);
      await billing.reference.fill('REF');
      await fillContractPeriod(page);

      const contract = await billing.save();

      expect(contract.invoicing).toEqual({
        invoiceInterval: IntervalType.HALF_YEARLY,
        invoicedIn: InvoicedIn.ADVANCE,
        billingEnabled: true,
      });
    });
  });

  test.describe('when the contract is not billed', () => {
    test('keeps the fee details visible but locked, and unlocks them when billed again', async ({
      page,
      dismissCookieConsent,
    }) => {
      const billing = await openBilling(page, dismissCookieConsent, leaseAgreementWith({ invoicing: billed }));
      await billing.yearlyFee.fill('120');
      await billing.interval.yearly.check({ force: true });

      await billing.setBilled(false);

      await expect(billing.yearlyFee).toHaveValue('120');
      await expect(billing.yearlyFee).toHaveAttribute('readonly');
      await expect(billing.indexed.yes).toBeDisabled();
      await expect(billing.interval.quarterly).toBeDisabled();
      await expect(billing.yearlyBillingMonth).toBeDisabled();
      await expect(billing.invoicedIn.arrears).toBeDisabled();
      await expect(billing.reference).toHaveAttribute('readonly');
      await expect(billing.addDetailedDescription).toHaveCount(0);

      await billing.setBilled(true);

      await expect(billing.yearlyFee).not.toHaveAttribute('readonly');
      await expect(billing.interval.quarterly).toBeEnabled();
      await expect(billing.yearlyBillingMonth).toBeEnabled();
      await expect(billing.reference).not.toHaveAttribute('readonly');
      await expect(billing.addDetailedDescription).toBeVisible();
    });

    test('saves billingEnabled = false and keeps the fee', async ({ page, dismissCookieConsent }) => {
      const billing = await openBilling(page, dismissCookieConsent, leaseAgreementWith({ invoicing: billed }));
      await billing.yearlyFee.fill('120');
      await billing.setBilled(false);
      await fillContractPeriod(page);

      const contract = await billing.save();

      expect(contract.invoicing).toEqual({ ...billed, billingEnabled: false });
      expect(contract.fees?.yearly).toBe(120);
    });
  });

  test('manages extra avitexter', async ({ page, dismissCookieConsent }) => {
    const billing = await openBilling(page, dismissCookieConsent, leaseAgreementWith({ invoicing: billed }));
    await billing.yearlyFee.fill('120');
    await billing.reference.fill('REF');

    // Extra avitexter are stored as detailedDescriptionNN under the InvoiceInfo extraParameter group.
    await billing.addDetailedDescription.click();
    await expect(page.getByText('Kompletterande avitext 1', { exact: true })).toBeVisible();
    await billing.detailedDescription(0).fill('Första kompletterande raden');
    await billing.addDetailedDescription.click();
    await billing.detailedDescription(1).fill('Andra kompletterande raden');
    // Each row is capped at 51 characters.
    await expect(billing.detailedDescription(0)).toHaveAttribute('maxlength', '51');
    // Removing the first row renumbers the remaining one.
    await billing.removeDetailedDescription(0).click();
    await expect(billing.detailedDescription(0)).toHaveValue('Andra kompletterande raden');
    await expect(billing.detailedDescription(1)).toHaveCount(0);
    await fillContractPeriod(page);

    const contract = await billing.save();

    const parameters = contract.extraParameters?.find((p) => p.name === 'InvoiceInfo')?.parameters;
    expect(parameters?.detailedDescription01).toBe('Andra kompletterande raden');
    expect(parameters?.detailedDescription02).toBeUndefined();
  });

  test('requires one of the arrendatorer to be fakturamottagare, also when the contract is not billed', async ({
    page,
    dismissCookieConsent,
  }) => {
    const contract = leaseAgreementWith({ invoicing: { ...billed, billingEnabled: false } });
    // The arrendator is no longer fakturamottagare; a separate party is.
    const lessee = contract.data.stakeholders.find((s) => s.roles.includes('LESSEE'));
    lessee.roles = ['LESSEE'];
    contract.data.stakeholders.push({ ...structuredClone(lessee), firstName: 'Fia', roles: ['PRIMARY_BILLING_PARTY'] });
    await openBilling(page, dismissCookieConsent, contract);
    const puts: string[] = [];
    page.on('request', (req) => req.method() === 'PUT' && req.url().includes('/contracts/') && puts.push(req.url()));

    await page.locator('[data-cy="parties-disclosure"]').locator('[data-cy="save-contract-button"]').click();

    await expect(page.getByText('En arrendator måste också vara fakturamottagare').first()).toBeVisible();
    expect(puts).toEqual([]);
  });

  test.describe('on an active contract', () => {
    test('requires an invoice reference when billed, and clears the error once one is entered', async ({
      page,
      dismissCookieConsent,
    }) => {
      const billing = await openBilling(
        page,
        dismissCookieConsent,
        leaseAgreementWith({ status: Status.ACTIVE, invoicing: billed, extraParameters: invoiceInfo({ markup: '' }) })
      );
      const referenceError = billing.root.getByText('Referens måste anges');

      const headerError = billing.root.getByText('Fel i formulär');

      await billing.saveButton.click();
      await expect(referenceError).toBeVisible();
      await expect(headerError).toBeVisible();

      await billing.reference.fill('REF-1');
      await expect(referenceError).toHaveCount(0);
      await expect(headerError).toHaveCount(0);
    });

    test('lets the case worker turn billing off, while the fee and invoicing stay locked', async ({
      page,
      dismissCookieConsent,
    }) => {
      const billing = await openBilling(
        page,
        dismissCookieConsent,
        leaseAgreementWith({
          status: Status.ACTIVE,
          invoicing: { ...billed, invoiceInterval: IntervalType.YEARLY, yearlyBillingMonth: 12 },
          extraParameters: invoiceInfo({ markup: 'REF-1' }),
        })
      );

      await expect(billing.billed.yes).toBeEnabled();
      await expect(billing.yearlyFee).toHaveAttribute('readonly');
      await expect(billing.interval.quarterly).toBeDisabled();
      await expect(billing.yearlyBillingMonth).toBeDisabled();
      await expect(billing.reference).not.toHaveAttribute('readonly');

      await billing.setBilled(false);
      const contract = await billing.save();

      expect(contract.invoicing).toEqual({
        invoiceInterval: IntervalType.YEARLY,
        invoicedIn: InvoicedIn.ADVANCE,
        billingEnabled: false,
        yearlyBillingMonth: 12,
      });
    });
  });
});
