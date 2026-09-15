import { User } from '@interfaces/users.interface';

declare module 'express-session' {
  interface Session {
    returnTo?: string;
    // OIDC login flow state: PKCE verifier, CSRF state and nonce live server-side between
    // /oidc/login and /oidc/login/callback, together with the frontend redirect targets
    // (OIDC has no RelayState to carry them in).
    oidc?: {
      codeVerifier: string;
      state: string;
      nonce: string;
      successRedirect?: string;
      failureRedirect?: string;
    };
    // Kept after OIDC login for RP-initiated logout (id_token_hint).
    idToken?: string;
    user?: User;
    passport?: any;
    messages: string[];
  }
}
