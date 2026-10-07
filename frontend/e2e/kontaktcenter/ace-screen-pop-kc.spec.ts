import type { BrowserContext, Page } from '@playwright/test';

import { ACE_TEST_CONFIG, expect, test } from '../blocks/ace/ace.fixture';
import { mockEnv } from '../fixtures/mock-env';
import { mockAdressResponse } from './fixtures/mockAdressResponse';
import { mockEmptySupportErrand, mockSupportErrand, mockSupportErrands } from './fixtures/mockSupportErrands';
import { errandOwner, fillRequiredErrandFields, saveErrand } from './blocks/kc-errand-page';
import { mockKcErrandPage, mockKcNewErrand, mockKcOverview, mockKcSession, mockPersonLookup } from './blocks/kc-routes';

/**
 * Telia ACE screen pop in Kontakt Sundsvall. The `ace` fixture enables ACE in the page and answers
 * the JS API bundle request with a fake that plays ACE Interact (see e2e/blocks/ace), so this runs
 * against any KC build: no ACE configuration and no ACE environment needed.
 */

const LOOKUP_FAILED = 'Personuppgifterna för den som ringer kunde inte hämtas. Lägg till ärendeägaren manuellt.';

/** Collects the requests that initiate a new errand, in every tab of the context. */
const recordNewErrandRequests = (context: BrowserContext): string[] => {
  const urls: string[] = [];
  context.on('request', (request) => {
    if (request.method() === 'POST' && request.url().includes('/newerrand/')) {
      urls.push(request.url());
    }
  });
  return urls;
};

const mockKcCallFlow = async (context: BrowserContext) => {
  await mockKcSession(context);
  await mockKcOverview(context);
  await mockKcNewErrand(context);
  await mockKcErrandPage(context);
  await mockPersonLookup(context);
};

const openOverview = async (page: Page, dismissCookieConsent: () => Promise<void>) => {
  await page.goto('oversikt/');
  await dismissCookieConsent();
};

test.describe('ACE screen pop', () => {
  test.describe('when ACE Interact is available', () => {
    test.beforeEach(async ({ page, ace, dismissCookieConsent }) => {
      await ace.serveJsApi();
      await mockKcCallFlow(page.context());
      await openOverview(page, dismissCookieConsent);
      await ace.waitUntilListening();
    });

    test('loads the external JS API bundle for the configured company', async ({ ace }) => {
      expect(ace.scriptRequests).toEqual([
        `${ACE_TEST_CONFIG.origin}/enClient/JSApi/external/JSApi.js?company=${ACE_TEST_CONFIG.company}`,
      ]);
    });

    test('shows whether ACE is connected', async ({ ace }) => {
      await expect(ace.status).toContainText('ACE ansluter');

      await ace.connect();
      await expect(ace.status).toContainText('ACE ansluten');

      await ace.disconnect();
      await expect(ace.status).toContainText('ACE ej ansluten');

      await ace.connect();
      await ace.popupDisconnected();
      await expect(ace.status).toContainText('ACE ej ansluten');

      await ace.connect();
      await ace.serverConnectionDown();
      await expect(ace.status).toContainText('ACE ej ansluten');
    });

    test('opens a new errand with the identified caller as errand owner', async ({ page, ace }) => {
      const lookup = page
        .context()
        .waitForEvent('request', (r) => r.method() === 'POST' && r.url().endsWith('/address'));

      const errandPage = await ace.acceptCall({ personNumber: mockEnv.mockPersonNumber });

      await expect(errandPage).toHaveURL(new RegExp(`/arende/${mockEmptySupportErrand.errandNumber}$`));
      expect((await lookup).postDataJSON()).toEqual({ ssn: mockEnv.mockPersonNumber });
      const owner = errandOwner(errandPage);
      await expect(owner.name).toHaveText(`${mockAdressResponse.data.givenname} ${mockAdressResponse.data.lastname}`);
      await expect(owner.personNumber).toHaveText(mockEnv.mockPersonNumber);
      await expect(owner.address).toContainText(mockAdressResponse.data.addresses[0].address);
    });

    test('saves the caller as errand owner only when the case worker saves', async ({ page, ace }) => {
      const patches: string[] = [];
      page.context().on('request', (r) => r.method() === 'PATCH' && patches.push(r.url()));

      const errandPage = await ace.acceptCall();
      await expect(errandOwner(errandPage).card).toBeVisible();
      expect(patches).toEqual([]);

      await fillRequiredErrandFields(errandPage);
      const request = await saveErrand(errandPage, mockEmptySupportErrand.id);

      expect(request.postDataJSON().stakeholders).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            role: 'PRIMARY',
            externalIdType: 'PRIVATE',
            externalId: mockAdressResponse.data.personId,
            firstName: mockAdressResponse.data.givenname,
            lastName: mockAdressResponse.data.lastname,
          }),
        ])
      );
    });

    test('handles each ACE contact once', async ({ page, ace }) => {
      const newErrands = recordNewErrandRequests(page.context());

      // The errand mock always has the same number, so let the first tab take its hand-over first.
      const firstErrandPage = await ace.acceptCall({ contactId: 4711 });
      await expect(errandOwner(firstErrandPage).card).toBeVisible();
      await ace.screenPop({ contactId: 4711 });
      // Pops are handled in order: once the next contact has opened its errand, the repeat was ignored.
      const nextErrandPage = await ace.acceptCall({ contactId: 4712 });
      await expect(errandOwner(nextErrandPage).card).toBeVisible();

      expect(newErrands).toHaveLength(2);
    });

    test('ignores events that are not an accepted call from an identified caller', async ({ page, ace }) => {
      const newErrands = recordNewErrandRequests(page.context());

      await ace.screenPop({ popEvent: 'beforeNormalAccept' });
      await ace.screenPop({ popEvent: 'endOfContact' });
      await ace.screenPop({ contactType: 'chat' });
      await ace.screenPop({ personNumber: null });
      await ace.screenPop({ personNumber: mockEnv.mockInvalidPersonNumber });
      await ace.screenPop({ personNumber: '19900101-2385' });
      // Pops are handled in order: once this call has opened its errand, the ones above were ignored.
      const errandPage = await ace.acceptCall();
      await expect(errandOwner(errandPage).card).toBeVisible();

      expect(newErrands).toHaveLength(1);
    });

    test('lets the case worker add the owner manually when the caller cannot be looked up', async ({ page, ace }) => {
      await mockPersonLookup(page.context(), { message: 'Not found' }, 404);

      const errandPage = await ace.acceptCall();

      await expect(errandPage.locator('.sk-snackbar-text', { hasText: LOOKUP_FAILED })).toBeVisible();
      await expect(errandOwner(errandPage).card).toHaveCount(0);
      await expect(errandPage.locator('[data-cy="search-person-form-PRIMARY"]')).toBeVisible();
    });
  });

  test('Draken works as usual when the ACE JS API cannot be loaded', async ({ page, ace, dismissCookieConsent }) => {
    await ace.blockJsApi();
    await mockKcSession(page);
    await mockKcOverview(page);

    await openOverview(page, dismissCookieConsent);

    await expect(ace.status).toContainText('ACE ej tillgängligt');
    await expect(page.locator('[data-cy="main-table"] .sk-table-tbody-tr')).toHaveCount(
      mockSupportErrands.content.length
    );
  });

  test('ACE stays off rather than risk duplicate errands when the browser has no Web Locks', async ({
    page,
    ace,
    dismissCookieConsent,
  }) => {
    await ace.removeWebLocks();
    await ace.serveJsApi();
    await mockKcCallFlow(page.context());

    await openOverview(page, dismissCookieConsent);

    await expect(ace.status).toContainText('ACE ej tillgängligt');
    expect(ace.scriptRequests).toEqual([]);
  });

  test.describe('when popups are blocked', () => {
    test.beforeEach(async ({ page, ace }) => {
      await ace.blockPopups();
      await ace.serveJsApi();
      await mockKcCallFlow(page.context());
    });

    test('opens the errand in the same tab', async ({ page, ace, dismissCookieConsent }) => {
      await openOverview(page, dismissCookieConsent);
      await ace.waitUntilListening();

      await ace.screenPop();

      await expect(page).toHaveURL(new RegExp(`/arende/${mockEmptySupportErrand.errandNumber}$`));
      await expect(errandOwner(page).card).toBeVisible();
    });

    test('names the created errand when the case worker stays on unsaved changes', async ({
      page,
      ace,
      dismissCookieConsent,
    }) => {
      await mockKcErrandPage(page.context(), mockSupportErrand);
      await page.goto(`arende/${mockSupportErrand.errandNumber}`);
      await dismissCookieConsent();
      await ace.waitUntilListening();
      await fillRequiredErrandFields(page);
      // Stay on the page when asked whether to leave the unsaved changes.
      page.once('dialog', (dialog) => dialog.dismiss());

      await ace.screenPop();

      await expect(
        page.locator('.sk-snackbar-text', { hasText: `Ärende ${mockEmptySupportErrand.errandNumber} har skapats` })
      ).toBeVisible();
      await expect(page).toHaveURL(new RegExp(`/arende/${mockSupportErrand.errandNumber}$`));
    });
  });
});
