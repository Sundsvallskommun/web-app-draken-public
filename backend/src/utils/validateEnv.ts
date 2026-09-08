import { resolveSupportManagementApiTarget } from '@/config/api-config';
import { getDragonDomain } from '@/config/dragon-build';
import { resolveSupportInvestigationHandoverTargets } from '@/config/support-investigation-handover-targets';
import { isContactSundsvall, isKC } from '@/services/application.service';
import { exitAfterDiagnosticFailure, logApplicationEvent, logApplicationFailure, logApplicationWarning } from '@/services/request-diagnostics';

import { backendEnvironmentIssues } from '../../../scripts/dragon-deployment.cjs';

async function reportEnvironmentIssues({ missing, invalid }: ReturnType<typeof backendEnvironmentIssues>): Promise<void> {
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
  await exitAfterDiagnosticFailure();
}

const EXAMPLE_SECRET = 'foobar'; // shipped in .env.*.example.local
const RECOMMENDED_SECRET_LENGTH = 32; // ~256-bit when base64/hex

async function validateSecretStrength(): Promise<void> {
  // Enforce only in deployed envs (TEST/prod run NODE_ENV=production); local dev may keep the template value.
  if (process.env.NODE_ENV !== 'production') {
    return;
  }
  const secret = (process.env.SECRET_KEY ?? '').trim();
  if (secret === EXAMPLE_SECRET) {
    logApplicationFailure('Insecure SECRET_KEY: it is the shipped example value; set a strong unique secret.');
    await exitAfterDiagnosticFailure();
  }
  if (secret.length < RECOMMENDED_SECRET_LENGTH) {
    logApplicationWarning('SECRET_KEY is shorter than the recommended 32 characters');
  }
}

const validateEnv = async (): Promise<void> => {
  const domain = getDragonDomain(process.env.APPLICATION);
  await reportEnvironmentIssues(backendEnvironmentIssues(domain, process.env));
  if (domain === 'supportmanagement') {
    try {
      resolveSupportManagementApiTarget();
      resolveSupportInvestigationHandoverTargets();
    } catch {
      logApplicationFailure('Invalid Support Management runtime configuration; check the API target and handover target declarations.');
      await exitAfterDiagnosticFailure();
    }
  }

  // The KC drake grants the canViewOtherNamespaces permission at login only when the CONTACTSUNDSVALL
  // supportmanagement namespace is also configured. Warn if the identity says KC but the namespace is
  // missing, so the resulting (silent) loss of cross-namespace access is visible instead of mysterious.
  if (isKC() && !isContactSundsvall()) {
    logApplicationWarning('KC configuration disables access to other namespaces');
  }
  await validateSecretStrength();
};

export default validateEnv;
