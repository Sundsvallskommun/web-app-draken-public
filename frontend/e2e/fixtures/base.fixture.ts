import { test as base, Page, Route } from '@playwright/test';
import { mockEnv } from './mock-env';

type MockRouteOptions = {
  method?: string;
  status?: number;
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

export const test = base.extend<BaseFixtures>({
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
