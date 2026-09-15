import { OIDC_CLIENT_ID, OIDC_CLIENT_SECRET, OIDC_ISSUER_URL } from '@config';
import type * as oidc from 'openid-client';

/**
 * openid-client v6 is ESM-only while this backend compiles to CommonJS. A plain `import()` is
 * not enough: tsc with module=commonjs rewrites it into `require()`, which cannot load an ES
 * module on Nodes without require(esm) interop (ERR_REQUIRE_ESM on the test servers). The
 * Function constructor hides the import() from the compiler, so the emitted CommonJS keeps a
 * TRUE dynamic import — supported from every CommonJS module on all maintained Node versions.
 * Still lazy: SAML-only deployments (OIDC_ENABLED=false) never load the module at all.
 */
const dynamicImport = new Function('specifier', 'return import(specifier)') as (specifier: string) => Promise<unknown>;

let clientModule: Promise<typeof oidc> | undefined;

export function loadOpenidClient(): Promise<typeof oidc> {
  clientModule ??= dynamicImport('openid-client') as Promise<typeof oidc>;
  return clientModule;
}

let configuration: Promise<oidc.Configuration> | undefined;

/**
 * Lazy, memoized OIDC discovery. Nothing runs at module load: the app must boot without OIDC env
 * when the flag is off, and with the flag on the IdP may be unreachable at boot — then only the
 * first login fails. A failed discovery is dropped from the cache so a later login retries.
 */
export function getOidcConfiguration(): Promise<oidc.Configuration> {
  if (!configuration) {
    configuration = discover();
    configuration.catch(() => {
      configuration = undefined;
    });
  }
  return configuration;
}

async function discover(): Promise<oidc.Configuration> {
  const client = await loadOpenidClient();
  const issuerUrl = new URL(OIDC_ISSUER_URL!);
  // The fake-idp runs on plain http in dev/test. Gated on the issuer's protocol rather than
  // NODE_ENV so a misconfigured https issuer never silently allows insecure transport.
  const allowHttp = issuerUrl.protocol === 'http:';
  return client.discovery(
    issuerUrl,
    OIDC_CLIENT_ID!,
    undefined,
    OIDC_CLIENT_SECRET ? client.ClientSecretPost(OIDC_CLIENT_SECRET) : client.None(),
    allowHttp ? { execute: [client.allowInsecureRequests] } : undefined,
  );
}
