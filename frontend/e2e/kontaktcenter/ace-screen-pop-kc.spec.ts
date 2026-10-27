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
      await expect(owner.phone).toHaveText(mockEnv.mockPhoneNumberCountryCode);
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
            contactChannels: [{ type: 'PHONE', value: mockEnv.mockPhoneNumberCountryCode }],
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

    test('does not open a second errand when ACE repeats the contact after a reload', async ({ page, ace }) => {
      const newErrands = recordNewErrandRequests(page.context());
      const errandPage = await ace.acceptCall({ contactId: 5000 });
      await expect(errandOwner(errandPage).card).toBeVisible();
      // Close the errand tab so this tab takes the ACE connection again after the reload.
      await errandPage.close();

      // The cookie consent was given before the reload, so there is no banner to dismiss.
      await page.reload();
      await ace.waitUntilListening();
      await ace.screenPop({ contactId: 5000 });
      // Pops are handled in order: once the next contact has opened its errand, the repeat was ignored.
      const nextErrandPage = await ace.acceptCall({ contactId: 5001 });
      await expect(errandOwner(nextErrandPage).card).toBeVisible();

      expect(newErrands).toHaveLength(2);
    });

    test('opens a new errand with the calling number when the caller did not identify', async ({ page, ace }) => {
      const lookups: string[] = [];
      page
        .context()
        .on('request', (r) => r.method() === 'POST' && r.url().endsWith('/address') && lookups.push(r.url()));

      const errandPage = await ace.acceptCall({ personNumber: null });

      const owner = errandOwner(errandPage);
      await expect(owner.phone).toHaveText(mockEnv.mockPhoneNumberCountryCode);
      await expect(owner.personNumber).toHaveText('(personnummer saknas)');
      expect(lookups).toEqual([]);

      await fillRequiredErrandFields(errandPage);
      const request = await saveErrand(errandPage, mockEmptySupportErrand.id);
      expect(request.postDataJSON().stakeholders).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            role: 'PRIMARY',
            contactChannels: [{ type: 'PHONE', value: mockEnv.mockPhoneNumberCountryCode }],
          }),
        ])
      );
    });

    test('uses the calling number when the identity is not a valid personal number', async ({ ace }) => {
      const errandPage = await ace.acceptCall({ personNumber: mockEnv.mockInvalidPersonNumber });

      await expect(errandOwner(errandPage).phone).toHaveText(mockEnv.mockPhoneNumberCountryCode);
    });

    test('logs the events from ACE without personal or phone numbers', async ({ page, ace }) => {
      const logs: string[] = [];
      page.on('console', (message) => message.text().startsWith('[ACE]') && logs.push(message.text()));

      await ace.connect();
      const errandPage = await ace.acceptCall();
      await expect(errandOwner(errandPage).card).toBeVisible();

      await expect.poll(() => logs.find((log) => log.startsWith('[ACE] onScreenPop'))).toContain('afterNormalAccept');
      expect(logs).toContain('[ACE] onConnected');
      const loggedNumbers = logs.join('\n');
      expect(loggedNumbers).not.toContain(mockEnv.mockPersonNumber);
      expect(loggedNumbers).not.toContain(mockEnv.mockPhoneNumberCountryCode);
    });

    test('opens an empty errand when the caller did not identify and the number is hidden', async ({ ace }) => {
      const errandPage = await ace.acceptCall({ personNumber: null, phoneNumber: 'anonymous' });

      await expect(errandPage).toHaveURL(new RegExp(`/arende/${mockEmptySupportErrand.errandNumber}$`));
      await expect(errandPage.locator('[data-cy="search-person-form-PRIMARY"]')).toBeVisible();
      await expect(errandOwner(errandPage).card).toHaveCount(0);
    });

    test('ignores events that are not an accepted call', async ({ page, ace }) => {
      const newErrands = recordNewErrandRequests(page.context());

      await ace.screenPop({ popEvent: 'beforeNormalAccept' });
      await ace.screenPop({ popEvent: 'endOfContact' });
      await ace.screenPop({ contactType: 'chat' });
      // Pops are handled in order: once this call has opened its errand, the ones above were ignored.
      const errandPage = await ace.acceptCall();
      await expect(errandOwner(errandPage).card).toBeVisible();

      expect(newErrands).toHaveLength(1);
    });

    test('keeps the calling number when the identified caller cannot be looked up', async ({ page, ace }) => {
      await mockPersonLookup(page.context(), { message: 'Not found' }, 404);

      const errandPage = await ace.acceptCall();

      await expect(errandPage.locator('.sk-snackbar-text', { hasText: LOOKUP_FAILED })).toBeVisible();
      await expect(errandOwner(errandPage).phone).toHaveText(mockEnv.mockPhoneNumberCountryCode);
    });

    test('lets the case worker search for an identified caller with a hidden number who cannot be looked up', async ({
      page,
      ace,
    }) => {
      await mockPersonLookup(page.context(), { message: 'Not found' }, 404);

      const errandPage = await ace.acceptCall({ phoneNumber: null });

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

    test('tells the other tabs where the errand was opened', async ({ page, ace, dismissCookieConsent }) => {
      await openOverview(page, dismissCookieConsent);
      await ace.waitUntilListening();
      const otherTab = await page.context().newPage();
      await otherTab.goto('oversikt/');
      // The other tab shows the status once its integration runs and listens to the leading tab.
      await expect(otherTab.locator('[data-cy="ace-status"]')).toBeVisible();

      await ace.screenPop();

      await expect(
        otherTab.locator('.sk-snackbar-text', {
          hasText: `Ärende ${mockEmptySupportErrand.errandNumber} har skapats för det inkommande samtalet och öppnats i en annan Draken-flik`,
        })
      ).toBeVisible();
      await expect(page).toHaveURL(new RegExp(`/arende/${mockEmptySupportErrand.errandNumber}$`));
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
