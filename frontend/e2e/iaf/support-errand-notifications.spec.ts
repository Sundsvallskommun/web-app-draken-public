import type { Page } from '@playwright/test';

import { expect, test } from '../fixtures/base.fixture';
import { toast } from '../utils/toast';
import { errandId, errandNumber, installIafApiMock } from './fixtures/investigation-flow.mock';

test.skip(!['IAF', 'VOF'].includes(process.env.NEXT_PUBLIC_APPLICATION ?? ''), 'Körs med IAF/VOF-profilen.');

/**
 * Notiserna kommer från Support Managements prenumerationsmodell: SM prenumererar handläggaren när
 * ärendet tilldelas, och det användaren läser kvitteras när ärendet öppnas. Draken prenumererar
 * aldrig någon på eget initiativ, och en sparning är en handling - en notis - hur många skrivningar
 * den än gör.
 */
async function visitErrand(page: Page, dismissCookieConsent: () => Promise<void>) {
  const errandResponse = page.waitForResponse(
    (response) => response.url().includes(`/supporterrands/errandnumber/${errandNumber}`) && response.status() === 200
  );
  await page.goto(`arende/${errandNumber}`);
  await errandResponse;
  await dismissCookieConsent();
}

test.describe('Notiser på ärendesidan', () => {
  test('kvitterar användarens notiser för ärendet en gång när det öppnas', async ({ page, dismissCookieConsent }) => {
    const trace = await installIafApiMock(page, { assignedUserId: 'iaf.test' });

    await visitErrand(page, dismissCookieConsent);

    await expect.poll(() => trace.notificationAcknowledgements).toEqual([errandId]);
    // Moving around on the page acknowledges nothing again.
    await page.getByRole('tab', { name: 'Ärendeuppgifter', exact: true }).click();
    expect(trace.notificationAcknowledgements).toEqual([errandId]);
  });

  test('sparar ärendet som en handling och prenumererar inte på det', async ({ page, dismissCookieConsent }) => {
    const trace = await installIafApiMock(page, { assignedUserId: 'iaf.test' });
    await visitErrand(page, dismissCookieConsent);
    await expect.poll(() => trace.notificationAcknowledgements).toHaveLength(1);
    const writesBeforeSave = trace.writeRequestGroupIds.length;

    await page.locator('[data-cy="priority-input"]').selectOption('HIGH');
    await page.locator('[data-cy="manage-sidebar"] [data-cy="save-button"]').filter({ hasText: 'Spara ärende' }).click();
    await expect(toast(page, 'Ärendet uppdaterades')).toBeVisible();

    const saveGroupIds = trace.writeRequestGroupIds.slice(writesBeforeSave);
    expect(saveGroupIds.length).toBeGreaterThan(0);
    expect(saveGroupIds[0]).toMatch(/^[0-9a-f-]{36}$/u);
    expect(new Set(saveGroupIds).size).toBe(1);
    expect(trace.subscriptionsCreated).toEqual([]);
  });
});
