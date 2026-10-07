import { expect, type Locator, type Page } from '@playwright/test';

/**
 * Building blocks for sk-web-gui behaviour that every drake shares.
 */

/**
 * Closes every open snackbar. A toast from a previous action can cover the button the test clicks
 * next (e.g. the options button of the next attachment in a list).
 */
export const dismissToasts = async (page: Page): Promise<void> => {
  const close = page.locator('#react-toast .sk-snackbar-action');
  while (await close.count()) {
    await close.first().click({ force: true });
    await expect(close.first())
      .toBeHidden()
      .catch(() => {});
  }
};

/**
 * Waits until a Modal or confirm dialog has finished its enter transition. Until then it is
 * transparent but already counts as visible, and closing it mid-transition leaves headlessui stuck
 * with an invisible overlay that blocks the page. Call before clicking inside a dialog.
 */
export const waitForDialogOpened = async (dialog: Locator): Promise<void> => {
  await expect(dialog).toBeVisible();
  await expect(dialog).not.toHaveAttribute('data-enter');
};

/**
 * Waits until no modal overlay is mounted. A closing Modal keeps its transparent overlay during the
 * leave transition, and that overlay intercepts clicks on the page underneath until it is gone.
 */
export const waitForModalOverlaysGone = async (page: Page): Promise<void> => {
  await expect(page.locator('.sk-modal-overlay')).toHaveCount(0);
};
