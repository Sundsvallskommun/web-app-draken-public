import { Page, expect } from '@playwright/test';
import { mockEnv } from '../fixtures/mock-env';

export const disabledIncompleteContactForm = async (page: Page) => {
  await expect(page.locator('[data-cy="add-manually-button-owner"]')).toBeVisible();
  await expect(page.locator('[data-cy="add-manually-button-owner"]')).toBeEnabled();
  await page.locator('[data-cy="add-manually-button-owner"]').click();

  await expect(page.locator('[data-cy="submit-contact-button"]')).toBeDisabled();
};
