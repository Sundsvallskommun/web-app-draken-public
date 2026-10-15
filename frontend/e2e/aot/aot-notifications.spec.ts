import { expect, test } from '../fixtures/base.fixture';
import { application, errandId, errandNumber, installAotApiMock } from './fixtures/aot-app.mock';

test.skip(application !== 'AOT', 'Sviten beskriver AOT:s konfiguration och körs med AOT-profilen.');

/**
 * Kvittensen när ärendet öppnas ligger i den gemensamma ärendesidan, inte i utredningssömmen, så en
 * drake som inte är avvikelse ska få den likadant.
 */
test('AOT kvitterar användarens notiser för ärendet när det öppnas', async ({ page, dismissCookieConsent }) => {
  const trace = await installAotApiMock(page);

  const errandResponse = page.waitForResponse(
    (response) => response.url().includes(`/supporterrands/errandnumber/${errandNumber}`) && response.status() === 200
  );
  await page.goto(`arende/${errandNumber}`);
  await errandResponse;
  await dismissCookieConsent();

  await expect.poll(() => trace.notificationAcknowledgements).toEqual([errandId]);
});
