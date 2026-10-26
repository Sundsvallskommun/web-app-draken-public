import type { Contract } from '@casedata/interfaces/contracts';
import type { Page } from '@playwright/test';

/**
 * The billing part of a contract ("Löpande avgift"), as shown in the errand's contract tab and,
 * read-only, in the contract overview. One locator per control, named after its question.
 */
export const billingSection = (page: Page) => {
  const root = page.locator('[data-cy="lopande-disclosure"]');
  const radio = (dataCy: string) => page.locator(`[data-cy="${dataCy}"]`);

  return {
    root,
    /** "Ska detta avtal generera en faktura?" — invoicing.billingEnabled */
    billed: { yes: radio('generate-invoice-true-radiobutton'), no: radio('generate-invoice-false-radiobutton') },
    /** "Ange avgift/år" — fees.yearly */
    yearlyFee: page.locator('[data-cy="fees-yearly-input"]'),
    /** "Ska detta avtal indexregleras?" */
    indexed: { yes: radio('indexed-true-radiobutton'), no: radio('indexed-false-radiobutton') },
    indexHelpText: page.locator('[data-cy="index-adjustment-help-text"]'),
    /** "Hur ofta ska avgiften betalas?" — invoicing.invoiceInterval */
    interval: {
      yearly: radio('invoice-interval-yearly-radiobutton'),
      halfYearly: radio('invoice-interval-halfyearly-radiobutton'),
      quarterly: radio('invoice-interval-quarterly-radiobutton'),
    },
    /** "När ska fakturaunderlaget skapas?" — invoicing.yearlyBillingMonth, only for yearly invoicing */
    yearlyBillingMonth: page.locator('[data-cy="yearly-billing-month-select"]'),
    /** "Ska avgiften betalas i förskott eller efterskott?" — invoicing.invoicedIn */
    invoicedIn: {
      advance: radio('invoiced-in-advance-radiobutton'),
      arrears: radio('invoiced-in-arrears-radiobutton'),
    },
    /** "Ange fakturans referens" */
    reference: page.locator('[data-cy="invoice-markup-input"]'),
    /** "Avitext", derived from the contract type */
    avitext: page.locator('[data-cy="fees-additional-information-0-input"]'),
    /** "Kompletterande avitext n" (0-based) */
    detailedDescription: (index: number) => page.locator(`[data-cy="detailed-description-input-${index}"]`),
    removeDetailedDescription: (index: number) =>
      page.locator(`[data-cy="remove-detailed-description-${index}-button"]`),
    addDetailedDescription: page.locator('[data-cy="add-detailed-description-button"]'),
    saveButton: root.locator('button.sk-btn-primary').filter({ hasText: 'Spara' }),

    /** Expands the section in the errand's contract tab. */
    open: async () => {
      await root.locator('button.sk-disclosure-header-button').click();
    },
    /** Answers "Ska detta avtal generera en faktura?". */
    setBilled: async (billed: boolean) => {
      await (billed ? radio('generate-invoice-true-radiobutton') : radio('generate-invoice-false-radiobutton')).check({
        force: true,
      });
    },
    /** Saves from this section and returns the contract sent to the API. */
    save: async (): Promise<Contract> => {
      const request = page.waitForRequest((req) => req.url().includes('/contracts/') && req.method() === 'PUT');
      await root.locator('button.sk-btn-primary').filter({ hasText: 'Spara' }).click();
      return (await request).postDataJSON();
    },
  };
};
