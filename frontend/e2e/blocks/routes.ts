import type { BrowserContext, Page, Route } from '@playwright/test';

/**
 * Where a mock is registered. A Page only covers that tab; a BrowserContext also covers tabs the
 * app opens itself (window.open), e.g. the errand an ACE screen pop opens in a new tab.
 */
export type RouteTarget = Page | BrowserContext;

export interface MockJsonOptions {
  method?: string;
  status?: number;
}

/** Answers every matching request with a JSON body. Requests with another method fall through. */
export const mockJson = async (
  target: RouteTarget,
  pattern: string | RegExp,
  response: unknown,
  { method, status = 200 }: MockJsonOptions = {}
): Promise<void> => {
  await target.route(pattern, async (route: Route) => {
    if (method && route.request().method() !== method.toUpperCase()) {
      await route.fallback();
      return;
    }
    await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(response) });
  });
};

export const contextOf = (target: RouteTarget): BrowserContext => ('context' in target ? target.context() : target);
