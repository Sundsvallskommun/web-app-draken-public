import { expect, type Page, type Request } from '@playwright/test';

/** The errand owner (customer, stakeholder role PRIMARY) as rendered on the errand page. */
export const errandOwner = (page: Page) => {
  const card = page.locator('[data-cy="rendered-PRIMARY"]');
  return {
    card,
    name: card.locator('[data-cy="stakeholder-name"]'),
    personNumber: card.locator('[data-cy="stakeholder-ssn"]'),
    address: card.locator('[data-cy="stakeholder-adress"]'),
  };
};

/**
 * Fills in what the register form requires before the errand can be saved: category, type and a
 * description. Works with both the label pickers (NEXT_PUBLIC_USE_LABEL_CATEGORIZATION, label names
 * from fixtures/mockMetadata) and the older category/type selects, which pick their first option.
 */
export const fillRequiredErrandFields = async (
  page: Page,
  { category = 'Barnomsorg', type = 'Fakturor' }: { category?: string; type?: string } = {}
): Promise<void> => {
  const labelCategory = page.locator('[data-cy="labelCategory-wrapper"]');
  const categorySelect = page.locator('[data-cy="category-input"]');
  await expect(labelCategory.or(categorySelect).first()).toBeVisible();

  if (await labelCategory.isVisible()) {
    await labelCategory.click();
    await page.getByRole('option', { name: category, exact: true }).click();
    await page.locator('[data-cy="labelType-wrapper"]').click();
    await page.getByRole('option', { name: type, exact: true }).click();
  } else {
    await categorySelect.selectOption({ index: 1 });
    await page.locator('[data-cy="type-input"]').selectOption({ index: 1 });
  }
  await page.locator('[data-cy="errand-description-richtext-wrapper"]').click();
  await page.keyboard.type('E2E description');
};

/** Clicks save and returns the PATCH request that persists the errand. */
export const saveErrand = async (page: Page, errandId: string): Promise<Request> => {
  const [request] = await Promise.all([
    page.waitForRequest((req) => req.url().includes(`supporterrands/2281/${errandId}`) && req.method() === 'PATCH'),
    page.locator('[data-cy="save-button"]').click(),
  ]);
  return request;
};
