export type AceConfig = { mode: 'script'; scriptUrl: string } | { mode: 'mock' };

interface AceEnv {
  origin?: string;
  company?: string;
  mock?: string;
  isDevelopment?: boolean;
}

/**
 * Returns the origin (scheme + host) when the value is an http(s) URL, otherwise null.
 * Parsing with URL rather than comparing strings also rejects the unreplaced
 * NEXT_PUBLIC_ACE_ORIGIN_PLACEHOLDER from the Docker build, and cannot be folded by the minifier.
 */
const parseOrigin = (value?: string): string | null => {
  try {
    const url = new URL((value ?? '').trim());
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.origin : null;
  } catch {
    return null;
  }
};

/**
 * Resolves how the ACE Agent Interface should be loaded, or null when ACE is not configured.
 * ACE is only enabled for an instance that sets both NEXT_PUBLIC_ACE_ORIGIN and NEXT_PUBLIC_ACE_COMPANY.
 * In development, NEXT_PUBLIC_ACE_MOCK=true installs a fake JS API instead (see ace-mock.ts).
 */
export const resolveAceConfig = ({ origin, company, mock, isDevelopment }: AceEnv): AceConfig | null => {
  const aceOrigin = parseOrigin(origin);
  const aceCompany = (company ?? '').trim();
  if (aceOrigin && aceCompany) {
    return {
      mode: 'script',
      scriptUrl: `${aceOrigin}/enClient/JSApi/external/JSApi.js?company=${encodeURIComponent(aceCompany)}`,
    };
  }
  if (isDevelopment && (mock ?? '').trim() === 'true') {
    return { mode: 'mock' };
  }
  return null;
};

interface AceTestConfig {
  origin?: string;
  company?: string;
}

declare global {
  interface Window {
    __DRAKEN_ACE_TEST_CONFIG__?: AceTestConfig;
  }
}

/**
 * Lets the Playwright suite enable ACE in any build (see frontend/e2e/blocks/ace) by setting
 * window.__DRAKEN_ACE_TEST_CONFIG__ before the app loads. Only honoured in development and in
 * TEST builds; in the Docker image NEXT_PUBLIC_ENVIRONMENT is a placeholder at build time, so
 * this comparison is false there and the override is compiled out.
 */
const testConfigOverride = (): AceTestConfig | undefined => {
  const allowed = process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_ENVIRONMENT === 'TEST';
  return allowed && typeof window !== 'undefined' ? window.__DRAKEN_ACE_TEST_CONFIG__ : undefined;
};

export const getAceConfig = (): AceConfig | null => {
  const override = testConfigOverride();
  return resolveAceConfig({
    origin: override?.origin ?? process.env.NEXT_PUBLIC_ACE_ORIGIN,
    company: override?.company ?? process.env.NEXT_PUBLIC_ACE_COMPANY,
    mock: process.env.NEXT_PUBLIC_ACE_MOCK,
    isDevelopment: process.env.NODE_ENV === 'development',
  });
};
