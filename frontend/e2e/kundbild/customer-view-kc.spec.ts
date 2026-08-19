import type { Page } from '@playwright/test';

import { mockAdmins } from '../case-data/fixtures/mockAdmins';
import { mockMe } from '../case-data/fixtures/mockMe';
import { expect, test } from '../fixtures/base.fixture';
import { mockMetaData } from '../kontaktcenter/fixtures/mockMetadata';
import {
  mockEmptyResolvedRelations,
  mockPartyStatusErrands,
  mockPartyStatuses,
  mockResolvedRelationsWithLink,
} from '../kontaktcenter/fixtures/mockPartyStatuses';
import { mockSupportAdminsResponse } from '../kontaktcenter/fixtures/mockSupportAdmins';
import {
  mockSupportAttachments,
  mockSupportErrand,
  mockSupportMessages,
  mockSupportNotes,
} from '../kontaktcenter/fixtures/mockSupportErrands';
import { mockNotifications } from '../kontaktcenter/fixtures/mockSupportNotifications';
import { mockCustomerViewErrand } from './fixtures/mockCustomerViewErrand';

// Kundbilden är flaggad (NEXT_PUBLIC_USE_CUSTOMER_VIEW) och är avstängd i den kc-konfiguration
// som ligger i .env.kc-example. Den här sviten körs därför i ett eget projekt som byggs med
// flaggan på, så att både av- och påläget täcks utan att kc-sviten testar en annan konfig än
// den som driftsätts.
test.describe('Kundbild (KC)', () => {
  test.beforeEach(async ({ page, mockRoute }) => {
    await page.context().addCookies([{ name: 'connect.sid', value: 'test-session', domain: 'localhost', path: '/' }]);
    await mockRoute('**/administrators', mockAdmins, { method: 'GET' });
    await mockRoute('**/users/admins', mockSupportAdminsResponse, { method: 'GET' });
    await mockRoute('**/me', mockMe, { method: 'GET' });
    await mockRoute('**/featureflags', [], { method: 'GET' });
    await mockRoute(`**/supporterrands/errandnumber/${mockSupportErrand.errandNumber}`, mockCustomerViewErrand, {
      method: 'GET',
    });
    await mockRoute('**/supporterrands/2281/*', mockCustomerViewErrand, { method: 'GET' });
    await mockRoute('**/supportattachments/2281/errands/*/attachments', mockSupportAttachments, { method: 'GET' });
    await mockRoute('**/supportmessage/2281/errands/*/communication', mockSupportMessages, { method: 'GET' });
    await mockRoute('**/supportnotes/2281/*', mockSupportNotes, { method: 'GET' });
    await mockRoute('**/supportmetadata/2281', mockMetaData, { method: 'GET' });
    await mockRoute('**/supportnotifications/2281', mockNotifications, { method: 'GET' });
    await mockRoute('**/party-services*', { data: [] }, { method: 'GET' });
    await mockRoute('**/party/*/statuses', mockPartyStatuses, { method: 'GET' });
    await mockRoute('**/resolvedrelations/**/**', mockEmptyResolvedRelations, { method: 'GET' });
  });

  const openErrand = async (page: Page) => {
    await page.goto('arende/KC-00000001');
    await page.waitForResponse((resp) => resp.url().includes('supporterrands') && resp.status() === 200);
  };

  const ownerFooter = (page: Page) => page.locator('[data-cy="rendered-PRIMARY"] [data-cy="customer-view-footer"]');

  // Flikarna klickas via roll, som i resten av sviten — data-cy ligger på omslutande element och
  // ett klick där byter inte panel. Panelen assertas synlig: toContainText matchar även dolda
  // element, så utan det kan ett uteblivet flikbyte passera som grönt.
  //
  // Allt som rör korten scopas till den returnerade panelen. Samma ärende renderas nämligen på
  // flera ställen samtidigt — i relationsöversikten, i kopplingar-till-listan och i ärendeägarens
  // autolistade ärenden bakom modalen — så ett oscopat relation-card-* matchar flera element.
  const openErrandsTab = async (page: Page) => {
    await ownerFooter(page).locator('[data-cy="show-customer-view-button"]').click();
    await page.getByRole('tab', { name: 'Ärenden', exact: true }).click();
    const panel = page.locator('[data-cy="customer-view-errands"]');
    await expect(panel).toBeVisible();
    return panel;
  };

  test('räknar bort det aktuella ärendet i kortfoten', async ({ page, dismissCookieConsent }) => {
    await openErrand(page);
    await dismissCookieConsent();

    // Fixturen innehåller tre ärenden varav ett är det handläggaren står i.
    await expect(ownerFooter(page).locator('[data-cy="customer-view-errand-count"]')).toHaveText('2 ärenden');
  });

  test('visar tjänsteräknare bara för ärendeägaren', async ({ page, dismissCookieConsent }) => {
    await openErrand(page);
    await dismissCookieConsent();

    // Beslut och dokument hämtas bara för ärendeägaren — kontaktpersonernas kort ska inte visa
    // räknaren, och ska därmed inte heller ha hämtat personens insatser.
    await expect(ownerFooter(page).locator('[data-cy="customer-view-services-count"]')).toBeVisible();
    await expect(page.locator('[data-cy="rendered-CONTACT"] [data-cy="customer-view-footer"]').first()).toBeVisible();
    await expect(page.locator('[data-cy="rendered-CONTACT"] [data-cy="customer-view-services-count"]')).toHaveCount(0);
  });

  test('öppnar kundbilden och listar personens övriga ärenden', async ({ page, dismissCookieConsent }) => {
    await openErrand(page);
    await dismissCookieConsent();

    await expect(page.locator('[data-cy="customer-view-name"]')).toContainText('Kim Svensson');
    const panel = await openErrandsTab(page);
    const list = panel.locator('[data-cy="customer-view-errands-list"]');
    await expect(list).toBeVisible();
    await expect(list).toContainText(mockPartyStatusErrands.ongoingErrand.errandNumber);
    await expect(list).not.toContainText(mockPartyStatusErrands.currentErrand.errandNumber);

    // Avslutade ärenden är dolda tills handläggaren ber om dem.
    await expect(list).not.toContainText(mockPartyStatusErrands.closedErrand.errandNumber);
    await panel.locator('[data-cy="customer-view-errands-include-closed-filter"]').check({ force: true });
    await expect(list).toContainText(mockPartyStatusErrands.closedErrand.errandNumber);
  });

  test('kortfotens ärendesiffra stämmer med listan i modalen', async ({ page, dismissCookieConsent }) => {
    await openErrand(page);
    await dismissCookieConsent();

    const panel = await openErrandsTab(page);
    await panel.locator('[data-cy="customer-view-errands-include-closed-filter"]').check({ force: true });
    await expect(panel.locator('[data-cy="customer-view-errands-count"]')).toContainText('Visar 2 av 2 ärenden');
  });

  test('visar fel när en koppling inte kan skapas', async ({ page, mockRoute, dismissCookieConsent }) => {
    await openErrand(page);
    await dismissCookieConsent();
    await mockRoute('**/2281/relations', { message: 'error' }, { method: 'POST', status: 500 });

    const panel = await openErrandsTab(page);
    const linkButton = panel.locator(`[data-cy="relation-card-link-${mockPartyStatusErrands.ongoingErrand.caseId}"]`);
    await expect(linkButton).toBeVisible();
    await linkButton.click();

    // Ett misslyckat kopplingsförsök får inte passera tyst.
    await expect(page.getByText('Ärendena kunde inte kopplas')).toBeVisible();
  });

  test('markerar redan kopplade ärenden i kundbilden', async ({ page, mockRoute, dismissCookieConsent }) => {
    await mockRoute('**/resolvedrelations/**/**', mockResolvedRelationsWithLink, { method: 'GET' });
    await openErrand(page);
    await dismissCookieConsent();

    await expect(ownerFooter(page).locator('[data-cy="customer-view-relation-count"]')).toHaveText('1 relation');

    const panel = await openErrandsTab(page);
    await expect(
      panel.locator(`[data-cy="relation-card-${mockPartyStatusErrands.ongoingErrand.caseId}"]`)
    ).toContainText('Bryt koppling');
  });
});
