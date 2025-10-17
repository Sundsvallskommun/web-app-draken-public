import { isMEX, isPT } from '@/services/application.service';
import { cleanEnv, port, str, url } from 'envalid';

// NOTE: Make sure we got these in ENV
const validateEnv = () => {
  if (isMEX() || isPT()) {
    cleanEnv(process.env, {
      NODE_ENV: str(),
      SECRET_KEY: str(),
      API_BASE_URL: str(),
      CLIENT_KEY: str(),
      CLIENT_SECRET: str(),
      PORT: port(),
      BASE_URL_PREFIX: str(),
      SAML_CALLBACK_URL: url(),
      SAML_LOGOUT_CALLBACK_URL: url(),
      SAML_SUCCESS_REDIRECT: url(),
      SAML_FAILURE_REDIRECT: url(),
      SAML_FAILURE_REDIRECT_MESSAGE: url(),
      SAML_ENTRY_SSO: url(),
      SAML_ISSUER: str(),
      SAML_IDP_PUBLIC_CERT: str(),
      SAML_PRIVATE_KEY: str(),
      SAML_PUBLIC_KEY: str(),
      AUTHORIZED_GROUPS: str(),
      LOG_DIR: str(),
      ADMIN_GROUP: str(),
      DEVELOPER_GROUP: str(),
      ADMIN_PANEL_GROUP: str(),
      APPLICATION: str(),
      MUNICIPALITY_ID: str(),
      DOMAIN: str(),
      CASEDATA_SENDER_EMAIL: str(),
      CASEDATA_REPLY_TO: str(),
      CASEDATA_SENDER: str(),
      CASEDATA_SENDER_SMS: str(),
      CASEDATA_NAMESPACE: str(),
    });
  } else {
    cleanEnv(process.env, {
      NODE_ENV: str(),
      SECRET_KEY: str(),
      API_BASE_URL: str(),
      CLIENT_KEY: str(),
      CLIENT_SECRET: str(),
      PORT: port(),
      BASE_URL_PREFIX: str(),
      SAML_CALLBACK_URL: url(),
      SAML_LOGOUT_CALLBACK_URL: url(),
      SAML_SUCCESS_REDIRECT: url(),
      SAML_FAILURE_REDIRECT: url(),
      SAML_FAILURE_REDIRECT_MESSAGE: url(),
      SAML_ENTRY_SSO: url(),
      SAML_ISSUER: str(),
      SAML_IDP_PUBLIC_CERT: str(),
      SAML_PRIVATE_KEY: str(),
      SAML_PUBLIC_KEY: str(),
      AUTHORIZED_GROUPS: str(),
      LOG_DIR: str(),
      ADMIN_GROUP: str(),
      DEVELOPER_GROUP: str(),
      ADMIN_PANEL_GROUP: str(),
      SUPERADMIN_GROUP: str(),
      APPLICATION: str(),
      MUNICIPALITY_ID: str(),
      DOMAIN: str(),

      SUPPORTMANAGEMENT_NAMESPACE: str(),
      SUPPORTMANAGEMENT_TEST_EMAIL: str(),
      SUPPORTMANAGEMENT_SENDER_EMAIL: str(),
      SUPPORTMANAGEMENT_SENDER_SMS: str(),
    });
  }
};

export default validateEnv;
