import type { Locator, Page } from '@playwright/test';

/**
 * A toast by its message. The snackbar renders the message twice, once visually and once for screen readers, so
 * the visible element is the one named.
 */
export const toast = (page: Page, message: string): Locator =>
  page.locator('.sk-snackbar-text').filter({ hasText: message });
