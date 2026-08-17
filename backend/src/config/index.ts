import { config } from 'dotenv';

import { APIS } from './api-config';

export { APIS };

config({ path: `.env.${process.env.NODE_ENV || 'development'}.local` });

export const CREDENTIALS = process.env.CREDENTIALS === 'true';
export const SWAGGER_ENABLED = process.env.SWAGGER_ENABLED === 'true';

export const {
  NODE_ENV,
  PORT,
  API_BASE_URL,
  LOG_FORMAT,
  ORIGIN,
  SECRET_KEY,
  BASE_URL_PREFIX,
  SAML_CALLBACK_URL,
  SAML_LOGOUT_CALLBACK_URL,
  SAML_SUCCESS_REDIRECT,
  SAML_FAILURE_REDIRECT,
  SAML_ENTRY_SSO,
  SAML_ISSUER,
  SAML_IDP_PUBLIC_CERT,
  SAML_PRIVATE_KEY,
  SAML_PUBLIC_KEY,
  SUPPORTMANAGEMENT_NAMESPACE,
  CASEDATA_NAMESPACE,
  AUTHORIZED_GROUPS,
  APPLICATION,
  MUNICIPALITY_ID,
} = process.env;
