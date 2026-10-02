import { test as base, Route } from '@playwright/test';
import { ACE_JSAPI_SCRIPT_PATTERN } from '../blocks/ace/fake-jsapi';
import { mockEnv } from './mock-env';

type MockRouteOptions = {
  method?: string;
  status?: number;
};

type AutoFixtures = {
  blockAceJsApi: void;
};

type BaseFixtures = {
  mockRoute: (
    pattern: string | RegExp,
    response: unknown,
    options?: MockRouteOptions
  ) => Promise<void>;
  dismissCookieConsent: () => Promise<void>;
  waitForFonts: () => Promise<void>;
  env: typeof mockEnv;
};

export const test = base.extend<BaseFixtures & AutoFixtures>({
  // A build with ACE configured (NEXT_PUBLIC_ACE_ORIGIN) loads Telia's JS API on every page. Fail that
  // request at once instead of letting it reach the network, so specs do not depend on DNS or timeouts.
  // The `ace` fixture (e2e/blocks/ace) serves a fake bundle instead, which takes precedence over this route.
  blockAceJsApi: [
    async ({ context }, use) => {
      await context.route(ACE_JSAPI_SCRIPT_PATTERN, (route) => route.abort('connectionrefused'));
      await use();
    },
    { auto: true },
  ],

  env: async ({}, use) => {
    await use(mockEnv);
  },

  mockRoute: async ({ page }, use) => {
    const mocked: (() => Promise<void>)[] = [];

    const mock = async (
      pattern: string | RegExp,
      response: unknown,
      options: MockRouteOptions = {}
    ) => {
      const { method, status = 200 } = options;

      await page.route(pattern, async (route: Route) => {
        if (method && route.request().method() !== method.toUpperCase()) {
          await route.fallback();
          return;
        }
        await route.fulfill({
          status,
          contentType: 'application/json',
          body: JSON.stringify(response),
        });
      });

      mocked.push(async () => {
        await page.unroute(pattern).catch(() => {});
      });
    };

    await use(mock);

    for (const cleanup of mocked) {
      await cleanup();
    }
  },

  dismissCookieConsent: async ({ page }, use) => {
    const dismiss = async () => {
      const btn = page.locator('.sk-cookie-consent-btn-wrapper').getByText('Godkänn alla');
      await btn.click();
    };
    await use(dismiss);
  },

  waitForFonts: async ({ page }, use) => {
    const waitFn = async () => {
      await page.evaluate(() => document.fonts.ready);
    };
    await use(waitFn);
  },
});

export { expect } from '@playwright/test';
