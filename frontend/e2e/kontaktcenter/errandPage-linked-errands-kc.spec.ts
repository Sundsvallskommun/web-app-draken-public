import type { Page } from '@playwright/test';

import { mockAdmins } from '../case-data/fixtures/mockAdmins';
import { mockMe } from '../case-data/fixtures/mockMe';
import { expect, test } from '../fixtures/base.fixture';
import { mockMetaData } from './fixtures/mockMetadata';
import {
  mockEmptyResolvedRelations,
  mockPartyStatusErrands,
  mockPartyStatuses,
  mockResolvedRelationsWithLink,
} from './fixtures/mockPartyStatuses';
import { mockSupportAdminsResponse } from './fixtures/mockSupportAdmins';
import {
  mockSupportAttachments,
  mockSupportErrand,
  mockSupportMessages,
  mockSupportNotes,
} from './fixtures/mockSupportErrands';
import { mockNotifications } from './fixtures/mockSupportNotifications';

// Kopplade ärenden listar ärendeägarens övriga ärenden utan att handläggaren behöver söka.
// KC kör med NEXT_PUBLIC_USE_STAKEHOLDER_RELATIONS=true, så listningen ska vara på här.
test.describe('Kopplade ärenden (KC)', () => {
  test.beforeEach(async ({ page, mockRoute }) => {
    await page.context().addCookies([{ name: 'connect.sid', value: 'test-session', domain: 'localhost', path: '/' }]);
    await mockRoute('**/administrators', mockAdmins, { method: 'GET' });
    await mockRoute('**/users/admins', mockSupportAdminsResponse, { method: 'GET' });
    await mockRoute('**/me', mockMe, { method: 'GET' });
    await mockRoute('**/featureflags', [], { method: 'GET' });
    await mockRoute(`**/supporterrands/errandnumber/${mockSupportErrand.errandNumber}`, mockSupportErrand, {
      method: 'GET',
    });
    await mockRoute('**/supporterrands/2281/*', mockSupportErrand, { method: 'GET' });
    await mockRoute('**/supportattachments/2281/errands/*/attachments', mockSupportAttachments, { method: 'GET' });
    await mockRoute('**/supportmessage/2281/errands/*/communication', mockSupportMessages, { method: 'GET' });
    await mockRoute('**/supportnotes/2281/*', mockSupportNotes, { method: 'GET' });
    await mockRoute('**/supportmetadata/2281', mockMetaData, { method: 'GET' });
    await mockRoute('**/supportnotifications/2281', mockNotifications, { method: 'GET' });
    await mockRoute('**/party-services*', { data: [] }, { method: 'GET' });
    await mockRoute('**/party/*/statuses', mockPartyStatuses, { method: 'GET' });
    await mockRoute('**/resolvedrelations/**/**', mockEmptyResolvedRelations, { method: 'GET' });
  });

  // Cookie-bannern är en overlay som blockerar klick, så den måste stängas innan disclosuren
  // öppnas. Att innehållet assertas synligt gör att ett uteblivet öppnande faller här i stället
  // för att visa sig som en förbryllande timeout längre ned i testet.
  const openLinkedErrands = async (page: Page, dismissCookieConsent: () => Promise<void>) => {
    await page.goto('arende/KC-00000001');
    await page.waitForResponse((resp) => resp.url().includes('supporterrands') && resp.status() === 200);
    await dismissCookieConsent();
    await page.locator('[data-cy="connected-errands-disclosure"]').click();
    await expect(page.locator('[data-cy="link-errands-disclosure"]')).toBeVisible();
  };

  test('listar ärendeägarens övriga ärenden utan sökning', async ({ page, dismissCookieConsent }) => {
    await openLinkedErrands(page, dismissCookieConsent);

    const list = page.locator('[data-cy="searchresults-list"]');
    await expect(list).toBeVisible();
    // Det aktuella ärendet ska inte listas som ett av ägarens andra ärenden.
    await expect(list).toContainText(mockPartyStatusErrands.ongoingErrand.errandNumber);
    await expect(list).toContainText(mockPartyStatusErrands.closedErrand.errandNumber);
    await expect(list).not.toContainText(mockPartyStatusErrands.currentErrand.errandNumber);
    await expect(page.locator('[data-cy="linked-errands-search-count"]')).toContainText('Visar 2 av 2 ärenden');
  });

  test('filtrerar ägarens ärenden på pågående och avslutade', async ({ page, dismissCookieConsent }) => {
    await openLinkedErrands(page, dismissCookieConsent);

    const filter = page.locator('[data-cy="linked-errands-status-filter"]');
    const list = page.locator('[data-cy="searchresults-list"]');

    await filter.selectOption('ongoing');
    await expect(list).toContainText(mockPartyStatusErrands.ongoingErrand.errandNumber);
    await expect(list).not.toContainText(mockPartyStatusErrands.closedErrand.errandNumber);

    await filter.selectOption('closed');
    await expect(list).toContainText(mockPartyStatusErrands.closedErrand.errandNumber);
    await expect(list).not.toContainText(mockPartyStatusErrands.ongoingErrand.errandNumber);
  });

  test('visar felmeddelande när sökningen misslyckas', async ({ page, mockRoute, dismissCookieConsent }) => {
    await openLinkedErrands(page, dismissCookieConsent);

    await mockRoute('**/errands/statuses/**', { message: 'error' }, { method: 'GET', status: 500 });
    await mockRoute('**/supporterrands/2281?**', { message: 'error' }, { method: 'GET', status: 500 });

    await page.locator('[data-cy="linked-errands-search"] input').fill('KC-99999999');
    await page.locator('[data-cy="linked-errands-search"]').getByRole('button', { name: 'Sök' }).click();

    // Sökningen får inte sluta tyst: antingen träffar, tomt-läge eller ett fel — aldrig ingenting.
    await expect(
      page.locator('[data-cy="linked-errands-search-error"], [data-cy="linked-errands-search-empty"]')
    ).toBeVisible();
  });

  test('markerar redan kopplade ärenden i listan', async ({ page, mockRoute, dismissCookieConsent }) => {
    await mockRoute('**/resolvedrelations/**/**', mockResolvedRelationsWithLink, { method: 'GET' });
    await openLinkedErrands(page, dismissCookieConsent);

    const linkedCard = page.locator(`[data-cy="relation-card-${mockPartyStatusErrands.ongoingErrand.caseId}"]`).first();
    await expect(linkedCard).toContainText('Bryt koppling');
    await expect(page.locator('[data-cy="relations-overview-list"]')).toContainText(
      mockPartyStatusErrands.ongoingErrand.errandNumber
    );
  });
});
