import type { Locator, Page } from '@playwright/test';

import { test as base } from '../../fixtures/base.fixture';
import { ACE_JSAPI_SCRIPT_PATTERN, FAKE_JSAPI_SCRIPT, FakeAceEvent } from './fake-jsapi';
import { screenPopMessage, ScreenPopOptions } from './screen-pop';

/**
 * The ACE origin and company the tests enable. Any values work: the bundle request is answered by
 * Playwright. Exported so specs can assert on the requested bundle URL.
 */
export const ACE_TEST_CONFIG = { origin: 'https://ace.e2e.test', company: 'e2e' } as const;

/**
 * Drives the ACE integration from the test, playing the part of ACE Interact.
 * Bound to the test's page, which is the tab that loads the JS API.
 */
export class AceDriver {
  /** URLs Draken requested the JS API bundle from. */
  readonly scriptRequests: string[] = [];

  constructor(private readonly page: Page) {}

  /** The ACE status label (sidebar on the overview, header on errand pages). */
  get status(): Locator {
    return this.page.locator('[data-cy="ace-status"]');
  }

  /**
   * Turns the ACE integration on in every tab, in any TEST or development build, without
   * NEXT_PUBLIC_ACE_ORIGIN/COMPANY (see getAceConfig in src/common/ace/ace-config.ts).
   */
  private async enable(): Promise<void> {
    await this.page.context().addInitScript((config) => {
      (window as any).__DRAKEN_ACE_TEST_CONFIG__ = config;
    }, ACE_TEST_CONFIG);
  }

  /** Enables ACE and serves the fake JS API in place of Telia's bundle. Call before navigating. */
  async serveJsApi(): Promise<void> {
    await this.enable();
    await this.page.context().route(ACE_JSAPI_SCRIPT_PATTERN, async (route) => {
      this.scriptRequests.push(route.request().url());
      await route.fulfill({
        status: 200,
        contentType: 'application/javascript',
        // Draken loads the bundle with crossorigin, so it needs a CORS header like the real one.
        headers: { 'access-control-allow-origin': '*' },
        body: FAKE_JSAPI_SCRIPT,
      });
    });
  }

  /** Enables ACE but makes the JS API bundle fail to load, as when ACE is unreachable. Call before navigating. */
  async blockJsApi(): Promise<void> {
    await this.enable();
    await this.page.context().route(ACE_JSAPI_SCRIPT_PATTERN, async (route) => {
      this.scriptRequests.push(route.request().url());
      await route.abort('connectionrefused');
    });
  }

  /** Makes window.open fail in every tab, as a popup blocker does. Call before navigating. */
  async blockPopups(): Promise<void> {
    await this.page.context().addInitScript(() => {
      window.open = () => null;
    });
  }

  /** Removes the Web Locks API in every tab, as in a browser without it. Call before navigating. */
  async removeWebLocks(): Promise<void> {
    await this.page.context().addInitScript(() => {
      Object.defineProperty(Navigator.prototype, 'locks', { get: () => undefined });
    });
  }

  /** Waits until Draken has loaded the JS API and listens for screen pops. */
  async waitUntilListening(): Promise<void> {
    await this.page.waitForFunction(() => ((window as any).__fakeAce?.listenerCount('screenPop') ?? 0) > 0);
  }

  async emit(event: FakeAceEvent, payload?: unknown): Promise<void> {
    await this.page.evaluate(([e, p]) => (window as any).__fakeAce.emit(e, p), [event, payload] as const);
  }

  connect = () => this.emit('connected');
  disconnect = () => this.emit('disconnected');
  popupDisconnected = () => this.emit('popupDisconnected');
  serverConnectionDown = () => this.emit('serverConnectionDown');

  /** Sends a screen pop; defaults to an accepted IVR call from an identified test person. */
  async screenPop(options?: ScreenPopOptions) {
    const message = screenPopMessage(options);
    await this.emit('screenPop', message);
    return message;
  }

  /** Sends an accepted, identified call and returns the tab Draken opens the new errand in. */
  async acceptCall(options?: ScreenPopOptions): Promise<Page> {
    const [errandPage] = await Promise.all([this.page.context().waitForEvent('page'), this.screenPop(options)]);
    await errandPage.waitForLoadState('domcontentloaded');
    return errandPage;
  }
}

/** The base fixtures plus `ace`. Combine with route blocks for the drake under test. */
export const test = base.extend<{ ace: AceDriver }>({
  ace: async ({ page }, use) => {
    await use(new AceDriver(page));
  },
});

export { expect } from '@playwright/test';
