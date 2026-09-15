import { OIDC_CALLBACK_URL, OIDC_SCOPES, SAML_FAILURE_REDIRECT_MESSAGE, SAML_SUCCESS_REDIRECT } from '@config';
import { isValidOrigin } from '@utils/isValidateOrigin';
import { logger } from '@utils/logger';
import { isValidUrl } from '@utils/util';
import express, { NextFunction, Request, Response } from 'express';
import { rateLimit } from 'express-rate-limit';

import { mapOidcClaimsToSessionUser, OidcLoginError } from './claims-mapping';
import { getOidcConfiguration, loadOpenidClient } from './oidc-client';

const DEFAULT_SCOPES = 'openid profile email';

/** Same redirect rules as the SAML routes: only full http(s) URLs on an allowed ORIGIN pass. */
const validatedRedirect = (value: unknown): string | undefined =>
  typeof value === 'string' && isValidUrl(value) && isValidOrigin(value) ? value : undefined;

const appendFailMessage = (target: string, failMessage: string): string => {
  const url = new URL(target);
  url.searchParams.append('failMessage', failMessage);
  return url.toString();
};

const describeError = (err: unknown): string => (err instanceof Error ? `${err.name}: ${err.message}` : String(err));

/**
 * The OIDC counterpart of the SAML routes in app.ts. Same contract towards the frontend
 * (?successRedirect/?failureRedirect in, ?failMessage=<code> out, req.login() into the shared
 * passport session) but authorization code + PKCE against the IdP instead of SAML redirect/POST
 * bindings. Where SAML carries the redirect targets in RelayState, OIDC keeps them in the session
 * next to the PKCE verifier/state/nonce.
 */
export function createOidcRouter(): express.Router {
  const router = express.Router();
  router.use(rateLimit({ windowMs: 60 * 1000, limit: 100 }));

  router.get('/login', async (req: Request, res: Response) => {
    const successRedirect = validatedRedirect(req.query.successRedirect);
    const failureRedirect = validatedRedirect(req.query.failureRedirect);
    const failureBase = failureRedirect ?? SAML_FAILURE_REDIRECT_MESSAGE!;

    try {
      const [client, config] = await Promise.all([loadOpenidClient(), getOidcConfiguration()]);

      const codeVerifier = client.randomPKCECodeVerifier();
      const codeChallenge = await client.calculatePKCECodeChallenge(codeVerifier);
      // PKCE is always on; state and nonce are kept as well since they cost nothing and
      // double as CSRF/replay protection independent of client authentication.
      const state = client.randomState();
      const nonce = client.randomNonce();

      req.session.oidc = { codeVerifier, state, nonce, successRedirect, failureRedirect };

      const authorizationUrl = client.buildAuthorizationUrl(config, {
        redirect_uri: OIDC_CALLBACK_URL!,
        scope: OIDC_SCOPES || DEFAULT_SCOPES,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
        state,
        nonce,
      });

      // The verifier/state/nonce must be persisted before the browser leaves for the IdP;
      // with the Redis/file session store a plain redirect can win that race.
      req.session.save(saveErr => {
        if (saveErr) {
          logger.error(`OIDC login: failed to save session before redirecting to the IdP: ${describeError(saveErr)}`);
          return res.redirect(appendFailMessage(failureBase, 'OIDC_UNKNOWN_ERROR'));
        }
        res.redirect(authorizationUrl.href);
      });
    } catch (err) {
      logger.error(`OIDC login: could not build the authorization request: ${describeError(err)}`);
      res.redirect(appendFailMessage(failureBase, 'OIDC_DISCOVERY_FAILED'));
    }
  });

  router.get('/login/callback', async (req: Request, res: Response) => {
    const pending = req.session.oidc;
    delete req.session.oidc;

    if (!pending) {
      // No pending authorization in the session: lost cookie, replayed callback or a stray hit.
      return res.redirect(appendFailMessage(SAML_FAILURE_REDIRECT_MESSAGE!, 'OIDC_UNKNOWN_ERROR'));
    }

    const successRedirect = pending.successRedirect ?? SAML_SUCCESS_REDIRECT!;
    const failureBase = pending.failureRedirect ?? successRedirect;

    try {
      const [client, config] = await Promise.all([loadOpenidClient(), getOidcConfiguration()]);

      // Rebuild the callback URL from config instead of req.protocol/host: the IdP matched
      // redirect_uri exactly, and host/proto reconstruction behind a proxy is the classic
      // source of silent mismatches.
      const currentUrl = new URL(OIDC_CALLBACK_URL!);
      currentUrl.search = req.originalUrl.includes('?') ? req.originalUrl.slice(req.originalUrl.indexOf('?')) : '';

      const tokens = await client.authorizationCodeGrant(config, currentUrl, {
        pkceCodeVerifier: pending.codeVerifier,
        expectedState: pending.state,
        expectedNonce: pending.nonce,
      });

      const claims = tokens.claims();
      if (!claims) {
        return res.redirect(appendFailMessage(failureBase, 'NO_USER'));
      }

      const user = mapOidcClaimsToSessionUser(claims);
      // Token pass-through POC: the access token rides on the session user (server-side
      // store only — it never reaches the browser) so ApiService can forward it downstream.
      user.accessToken = tokens.access_token;
      if (tokens.expires_in) {
        user.accessTokenExpiresAt = Math.floor(Date.now() / 1000) + tokens.expires_in;
      }

      req.login(user, loginErr => {
        if (loginErr) {
          logger.error(`OIDC login callback: req.login failed: ${describeError(loginErr)}`);
          return res.redirect(appendFailMessage(failureBase, 'OIDC_UNKNOWN_ERROR'));
        }
        // Kept for RP-initiated logout (id_token_hint). Set after req.login, which regenerates
        // the session, so it survives into the authenticated session record.
        req.session.idToken = tokens.id_token;
        logger.info(`Authenticated user ${user.username} (role: ${user.role})`);
        req.session.save(saveErr => {
          if (saveErr) {
            logger.error(`OIDC login callback: failed to save session: ${describeError(saveErr)}`);
            return res.redirect(appendFailMessage(failureBase, 'OIDC_UNKNOWN_ERROR'));
          }
          res.redirect(successRedirect);
        });
      });
    } catch (err) {
      if (err instanceof OidcLoginError) {
        logger.warn(`OIDC login callback failed: ${err.name}: ${err.message}`);
        return res.redirect(appendFailMessage(failureBase, err.name));
      }
      logger.warn(`OIDC login callback failed: ${describeError(err)}`);
      res.redirect(appendFailMessage(failureBase, 'OIDC_UNKNOWN_ERROR'));
    }
  });

  router.get('/logout', (req: Request, res: Response, next: NextFunction) => {
    const successRedirect = validatedRedirect(req.query.successRedirect) ?? SAML_SUCCESS_REDIRECT!;
    // Read before req.logout(), which clears the session.
    const idToken = req.session.idToken;

    req.logout(async logoutErr => {
      if (logoutErr) {
        return next(logoutErr);
      }
      if (!idToken) {
        return res.redirect(successRedirect);
      }
      try {
        const [client, config] = await Promise.all([loadOpenidClient(), getOidcConfiguration()]);
        if (!config.serverMetadata().end_session_endpoint) {
          return res.redirect(successRedirect);
        }
        const endSessionUrl = client.buildEndSessionUrl(config, {
          id_token_hint: idToken,
          post_logout_redirect_uri: successRedirect,
        });
        res.redirect(endSessionUrl.href);
      } catch (err) {
        // IdP unreachable or misconfigured — degrade to local-only logout, the same contract as
        // the SAML route when SAML_LOGOUT_URL is unset.
        logger.warn(`OIDC logout: falling back to local-only logout: ${describeError(err)}`);
        res.redirect(successRedirect);
      }
    });
  });

  return router;
}
