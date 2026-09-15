import { OIDC_CLIENT_ID, OIDC_CLIENT_SECRET, OIDC_ISSUER_URL } from '@config';
import type * as oidc from 'openid-client';

/**
 * openid-client v6 is ESM-only while this backend compiles to CommonJS, so it is loaded with a
 * lazy dynamic import: SAML-only deployments (OIDC_ENABLED=false) never load it at all, and
 * Node's require(esm) interop is exercised only when the OIDC flow is actually used.
 */
let clientModule: Promise<typeof oidc> | undefined;

export function loadOpenidClient(): Promise<typeof oidc> {
  clientModule ??= import('openid-client');
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
