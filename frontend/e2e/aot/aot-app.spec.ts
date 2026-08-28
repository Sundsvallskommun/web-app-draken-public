import { expect, test } from '../fixtures/base.fixture';
import { application, installAotApiMock } from './fixtures/aot-app.mock';

/**
 * AOT är den minsta SupportManagement-draken: trenivåkategorisering, ärendeuppgifter och en
 * utredningsflik som ännu bara är en platshållare. Sviten finns för att avvikelsearbetet i IAF/VOF
 * ska märka direkt om det slår sönder en drake som inte är avvikelse.
 */

test.skip(application !== 'AOT', 'Sviten beskriver AOT:s konfiguration och körs med AOT-profilen.');

test.describe('AOT startar som en vanlig SupportManagement-drake', () => {
  test('hämtar inte den auth-skyddade profilen på login-sidan', async ({ page }) => {
    const trace = await installAotApiMock(page);

    await page.goto('login');

    await expect(page.locator('[data-cy="loginButton"]')).toBeVisible();
    expect(trace.profileGets).toBe(0);
  });

  test('visar översikten med inloggad användare och ärendelista', async ({ page, dismissCookieConsent }) => {
    await installAotApiMock(page);

    const errands = page.waitForResponse(
      (response) => response.url().includes('supporterrands/') && response.status() === 200
    );
    await page.goto('oversikt/');
    await errands;
    await dismissCookieConsent();

    await expect(page.locator('[data-cy="userinfo"]')).toContainText('Aot Testare');
    await expect(page.locator('[data-cy="main-table"] .sk-table-tbody-tr')).toHaveCount(1);
  });

  /**
   * Profilens labelFilter är avvikelsens vokabulär i översiktens filterrad. Saknas den faller
   * ongoing-support-errands tillbaka på 'legacy', det vill säga de vanliga labelCategory-,
   * labelType- och labelSubType-filtren. AOT har ingen labelFilter, så Lagrum och Rapporttyp ska
   * aldrig dyka upp här - de renderas som fieldset med aria-label av projected-label-filters.
   */
  test('filtrerar med de vanliga filtren, inte med avvikelsens', async ({ page, dismissCookieConsent }) => {
    await installAotApiMock(page);

    await page.goto('oversikt/');
    await dismissCookieConsent();

    await expect(page.locator('[data-cy="Verksamhet-filter"]')).toBeVisible();
    await expect(page.getByRole('group', { name: 'Lagrum' })).toHaveCount(0);
    await expect(page.getByRole('group', { name: 'Rapporttyp' })).toHaveCount(0);
    await expect(page.getByRole('group', { name: 'Klassificering' })).toHaveCount(0);
  });

  /**
   * Den tomma profilen är inte ett fel: BFF:en har ingen registrerad profil för AOT och svarar med
   * state 'inactive'. Appen ska måla klart ändå - AppInitializer håller tillbaka första renderingen
   * tills profilen har landat, så en regression här ger en evig laddningsskärm snarare än ett fel.
   */
  test('målar färdigt trots att utredningsprofilen är tom', async ({ page, dismissCookieConsent }) => {
    const trace = await installAotApiMock(page);

    await page.goto('oversikt/');
    await dismissCookieConsent();

    await expect(page.locator('[data-cy="main-table"]')).toBeVisible();
    expect(trace.profileGets).toBeGreaterThan(0);
  });
});
