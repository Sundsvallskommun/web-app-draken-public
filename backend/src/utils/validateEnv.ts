import { resolveSupportManagementApiTarget } from '@/config/api-config';
import { resolveSupportInvestigationHandoverTargets } from '@/config/support-investigation-handover-targets';
import { isContactSundsvall, isKC, isMEX, isPT } from '@/services/application.service';
import { logApplicationEvent, logApplicationFailure, logApplicationWarning } from '@/services/request-diagnostics';

type EnvSpec = Record<string, { type: 'str' | 'port' | 'url' }>;

function warnMissingEnv(spec: EnvSpec): void {
  const missing: string[] = [];
  const invalid: string[] = [];

  for (const [key, { type }] of Object.entries(spec)) {
    const value = process.env[key];

    if (!value) {
      missing.push(key);
      continue;
    }

    if (type === 'port') {
      const port = Number(value);
      if (isNaN(port) || port < 1 || port > 65535) {
        invalid.push(key);
      }
    }

    if (type === 'url') {
      try {
        new URL(value);
      } catch {
        invalid.push(key);
      }
    }
  }

  if (missing.length > 0) {
    logApplicationFailure('Required environment variables are missing', undefined, { configurationFields: missing });
  }
  if (invalid.length > 0) {
    logApplicationFailure('Required environment variables are invalid', undefined, { configurationFields: invalid });
  }
  if (missing.length === 0 && invalid.length === 0) {
    logApplicationEvent('✅ All required environment variables are set.');
    return;
  }
  process.exit(1);
}

const s = (type: 'str' | 'port' | 'url' = 'str') => ({ type });

const EXAMPLE_SECRET = 'foobar'; // shipped in .env.*.example.local
const RECOMMENDED_SECRET_LENGTH = 32; // ~256-bit when base64/hex

function validateSecretStrength(): void {
  // Enforce only in deployed envs (TEST/prod run NODE_ENV=production); local dev may keep the template value.
  if (process.env.NODE_ENV !== 'production') {
    return;
  }
  const secret = (process.env.SECRET_KEY ?? '').trim();
  if (secret === EXAMPLE_SECRET) {
    logApplicationFailure('Insecure SECRET_KEY: it is the shipped example value; set a strong unique secret.');
    process.exit(1);
  }
  if (secret.length < RECOMMENDED_SECRET_LENGTH) {
    logApplicationWarning('SECRET_KEY is shorter than the recommended 32 characters');
  }
}

const validateEnv = () => {
  const commonSpec: EnvSpec = {
    NODE_ENV: s(),
    SECRET_KEY: s(),
    API_BASE_URL: s('url'),
    CLIENT_KEY: s(),
    CLIENT_SECRET: s(),
    PORT: s('port'),
    BASE_URL_PREFIX: s(),
    SAML_CALLBACK_URL: s('url'),
    SAML_LOGOUT_CALLBACK_URL: s('url'),
    SAML_SUCCESS_REDIRECT: s('url'),
    SAML_FAILURE_REDIRECT: s('url'),
    SAML_FAILURE_REDIRECT_MESSAGE: s('url'),
    SAML_ENTRY_SSO: s('url'),
    SAML_ISSUER: s(),
    SAML_IDP_PUBLIC_CERT: s(),
    SAML_PRIVATE_KEY: s(),
    SAML_PUBLIC_KEY: s(),
    AUTHORIZED_GROUPS: s(),
    LOG_DIR: s(),
    ADMIN_GROUP: s(),
    DEVELOPER_GROUP: s(),
    APPLICATION: s(),
    MUNICIPALITY_ID: s(),
    DOMAIN: s(),
  };

  if (isMEX() || isPT()) {
    warnMissingEnv({
      ...commonSpec,
      CASEDATA_SENDER_EMAIL: s(),
      CASEDATA_REPLY_TO: s(),
      CASEDATA_SENDER: s(),
      CASEDATA_SENDER_SMS: s(),
      CASEDATA_NAMESPACE: s(),
    });
  } else {
    try {
      resolveSupportManagementApiTarget();
      resolveSupportInvestigationHandoverTargets();
    } catch {
      logApplicationFailure('Invalid Support Management runtime configuration; check the API target and handover target declarations.');
      process.exit(1);
    }

    warnMissingEnv({
      ...commonSpec,
      SUPERADMIN_GROUP: s(),
      SUPPORTMANAGEMENT_NAMESPACE: s(),
      SUPPORTMANAGEMENT_TEST_EMAIL: s(),
      SUPPORTMANAGEMENT_SENDER_EMAIL: s(),
      SUPPORTMANAGEMENT_SENDER_SMS: s(),
    });
  }

  // The KC drake grants the canViewOtherNamespaces permission at login only when the CONTACTSUNDSVALL
  // supportmanagement namespace is also configured. Warn if the identity says KC but the namespace is
  // missing, so the resulting (silent) loss of cross-namespace access is visible instead of mysterious.
  if (isKC() && !isContactSundsvall()) {
    logApplicationWarning('KC configuration disables access to other namespaces');
  }
  validateSecretStrength();
};

export default validateEnv;
