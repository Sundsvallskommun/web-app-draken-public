import type { Page } from '@playwright/test';

import { expect, test } from '../fixtures/base.fixture';
import { aotLabelFixture, application, errandNumber, installAotApiMock } from './fixtures/aot-app.mock';

/**
 * Ärendesidan är där utredningssömmen faktiskt syns. Varje test här beskriver en gräns som
 * avvikelseimplementationen inte får passera.
 */

test.skip(application !== 'AOT', 'Sviten beskriver AOT:s konfiguration och körs med AOT-profilen.');

async function visitErrand(page: Page, dismissCookieConsent: () => Promise<void>) {
  const errandResponse = page.waitForResponse(
    (response) => response.url().includes(`/supporterrands/errandnumber/${errandNumber}`) && response.status() === 200
  );
  await page.goto(`arende/${errandNumber}`);
  await errandResponse;
  await dismissCookieConsent();
}

test.describe('AOT:s ärendesida', () => {
  test('kategoriserar i Grundinformation med den vanliga trenivåkontrollen', async ({ page, dismissCookieConsent }) => {
    await installAotApiMock(page);
    await visitErrand(page, dismissCookieConsent);

    await page.getByRole('tab', { name: 'Grundinformation', exact: true }).click();
    const basics = page.locator('[role="tabpanel"]:visible');

    await expect(basics.locator('[data-cy="labelCategory-input"]')).toBeVisible();
    await expect(basics.locator('[data-cy="labelCategory-input"]')).toContainText(aotLabelFixture.category.displayName);
    // Combobox-platshållaren visar den djupaste valda nivån, så subtypen här bevisar att hela
    // trenivåkedjan lästes ur ärendets etiketter.
    await expect(
      basics.locator(`[data-cy="labelType-input"][placeholder="${aotLabelFixture.subtype.displayName}"]`)
    ).toBeVisible();

    // AOT:s variant har ingen egen etikettvokabulär, så avvikelsens kontroll ska inte finnas någonstans.
    await expect(page.locator('[data-cy="avvikelse-label-categorization"]')).toHaveCount(0);
  });

  test('visar AOT:s utredningsflik och inte avvikelsens', async ({ page, dismissCookieConsent }) => {
    await installAotApiMock(page);
    await visitErrand(page, dismissCookieConsent);

    await page.getByRole('tab', { name: 'Utredning', exact: true }).click();

    await expect(page.locator('[data-cy="aot-investigation-tab"]')).toBeVisible();
    await expect(page.locator('[data-cy="support-investigation-tab"]')).toHaveCount(0);
    await expect(page.locator('[data-cy="investigation-document-notice"]')).toHaveCount(0);
  });

  /**
   * Fliken väljs av kapabilitetsflaggan, inte av BFF-profilen. Om utredningsfliken någon gång
   * villkoras på profilens state försvinner den för AOT, vars profil alltid är 'inactive'.
   */
  test('visar utredningsfliken trots att profilen rapporterar state inactive', async ({
    page,
    dismissCookieConsent,
  }) => {
    await installAotApiMock(page);
    await visitErrand(page, dismissCookieConsent);

    await expect(page.getByRole('tab', { name: 'Utredning', exact: true })).toHaveCount(1);
  });

  /**
   * Det load-bearing testet. Avvikelsens maskineri - utredningsdokument, JSON-scheman och den
   * klassificerings-PATCH som bara utredningen äger - ska aldrig röras av en drake som inte är
   * avvikelse. Spåret är tomt om sömmen håller.
   */
  test('rör inte avvikelsens dokument, scheman eller klassificerings-PATCH', async ({ page, dismissCookieConsent }) => {
    const trace = await installAotApiMock(page);
    await visitErrand(page, dismissCookieConsent);

    await page.getByRole('tab', { name: 'Utredning', exact: true }).click();
    await expect(page.locator('[data-cy="aot-investigation-tab"]')).toBeVisible();

    expect(trace.investigationDocumentRequests).toEqual([]);
    expect(trace.schemaRequests).toEqual([]);
    expect(trace.classificationPatches).toBe(0);
  });

  test('behåller de vanliga flikarna vid sidan av utredningen', async ({ page, dismissCookieConsent }) => {
    await installAotApiMock(page);
    await visitErrand(page, dismissCookieConsent);

    for (const name of ['Grundinformation', 'Ärendeuppgifter', 'Utredning']) {
      await expect(page.getByRole('tab', { name, exact: true })).toHaveCount(1);
    }
    // Meddelanden och Bilagor bär en räknare i etiketten.
    await expect(page.getByRole('tab', { name: /^Meddelanden/ })).toHaveCount(1);
    await expect(page.getByRole('tab', { name: /^Bilagor/ })).toHaveCount(1);
  });
});
