import type { Page, Request } from '@playwright/test';

import { mockCategories } from '../fixtures/mockMetadata';

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

/** Fills in what the register form requires before the errand can be saved. */
export const fillRequiredErrandFields = async (page: Page, category = mockCategories[0]): Promise<void> => {
  await page.locator('[data-cy="category-input"]').selectOption(category.displayName);
  await page.locator('[data-cy="type-input"]').selectOption(category.types[0].displayName);
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
