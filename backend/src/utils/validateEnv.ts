import { isMEX, isPT } from '@/services/application.service';

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
        invalid.push(`${key} (invalid port: "${value}")`);
      }
    }

    if (type === 'url') {
      try {
        new URL(value);
      } catch {
        invalid.push(`${key} (invalid url: "${value}")`);
      }
    }
  }

  if (missing.length > 0) {
    console.error(`\nMissing environment variables:\n${missing.map((k) => `   - ${k}`).join('\n')}\n`);
  }
  if (invalid.length > 0) {
    console.error(`\nInvalid environment variables:\n${invalid.map((k) => `   - ${k}`).join('\n')}\n`);
  }
  if (missing.length === 0 && invalid.length === 0) {
    console.log('✅ All required environment variables are set.');
  }
}

const s = (type: 'str' | 'port' | 'url' = 'str') => ({ type });

const validateEnv = () => {
  const commonSpec: EnvSpec = {
    NODE_ENV: s(),
    SECRET_KEY: s(),
    API_BASE_URL: s(),
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
    warnMissingEnv({
      ...commonSpec,
      SUPERADMIN_GROUP: s(),
      SUPPORTMANAGEMENT_NAMESPACE: s(),
      SUPPORTMANAGEMENT_TEST_EMAIL: s(),
      SUPPORTMANAGEMENT_SENDER_EMAIL: s(),
      SUPPORTMANAGEMENT_SENDER_SMS: s(),
    });
  }
};

export default validateEnv;
