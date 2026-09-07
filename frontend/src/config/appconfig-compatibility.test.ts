import assert from 'node:assert/strict';

import { afterEach, beforeEach, test, vi } from 'vitest';

import snapshot from './adminpanel-flags.test-fixture.json';
import type { AppConfigFeatures } from './appconfig';

// Persisted environment/API names from the pre-restructure contract (a9847cd4).
// Keep this independent of appConfig so a rename/removal cannot silently update both sides.
const retainedFlags = [
  ['useThreeLevelCategorization', 'NEXT_PUBLIC_USE_THREE_LEVEL_CATEGORIZATION'],
  ['useTwoLevelCategorization', 'NEXT_PUBLIC_USE_TWO_LEVEL_CATEGORIZATION'],
  ['useExplanationOfTheCause', 'NEXT_PUBLIC_USE_EXPLANATION_OF_THE_CAUSE'],
  ['useReasonForContact', 'NEXT_PUBLIC_USE_REASON_FOR_CONTACT'],
  ['useBusinessCase', 'NEXT_PUBLIC_USE_BUSINESS_CASE'],
  ['useBilling', 'NEXT_PUBLIC_USE_BILLING'],
  ['useContracts', 'NEXT_PUBLIC_USE_CONTRACTS'],
  ['useFacilities', 'NEXT_PUBLIC_USE_FACILITIES'],
  ['useExtraInformationStakeholders', 'NEXT_PUBLIC_USE_EXTRA_INFORMATION_STAKEHOLDERS'],
  ['useDepartmentEscalation', 'NEXT_PUBLIC_USE_DEPARTMENT_ESCALATION'],
  ['useEmployeeSearch', 'NEXT_PUBLIC_USE_EMPLOYEE_SEARCH'],
  ['useOrganizationStakeholders', 'NEXT_PUBLIC_USE_ORGANIZATION_STAKEHOLDER'],
  ['useEmployeeSearchOnly', 'NEXT_PUBLIC_USE_EMPLOYEE_SEARCH_ONLY'],
  ['useRecruitment', 'NEXT_PUBLIC_USE_RECRUITMENT'],
  ['useEmailContactChannel', 'NEXT_PUBLIC_USE_EMAIL_CONTACT_CHANNEL'],
  ['useSmsContactChannel', 'NEXT_PUBLIC_USE_SMS_CONTACT_CHANNEL'],
  ['useStakeholderRelations', 'NEXT_PUBLIC_USE_STAKEHOLDER_RELATIONS'],
  ['useRolesForStakeholders', 'NEXT_PUBLIC_USE_ROLES_FOR_STAKEHOLDERS'],
  ['useDetailsTab', 'NEXT_PUBLIC_USE_DETAILS_TAB'],
  ['useEscalation', 'NEXT_PUBLIC_USE_ESCALATION'],
  ['useRequireContactChannel', 'NEXT_PUBLIC_USE_REQUIRE_CONTACT_CHANNEL'],
  ['useRelations', 'NEXT_PUBLIC_USE_RELATIONS'],
  ['useMyPages', 'NEXT_PUBLIC_USE_MY_PAGES'],
  ['useUiPhases', 'NEXT_PUBLIC_USE_UI_PHASES'],
  ['useClosingMessageCheckbox', 'NEXT_PUBLIC_USE_CLOSING_MESSAGE_CHECKBOX'],
  ['useMultipleContactChannels', 'NEXT_PUBLIC_USE_MULTIPLE_CONTACT_CHANNELS'],
  ['useClosedAsDefaultResolution', 'NEXT_PUBLIC_USE_CLOSED_AS_DEFAULT_RESOLUTION'],
  ['useServices', 'NEXT_PUBLIC_USE_SERVICES'],
  ['useAppeal', 'NEXT_PUBLIC_USE_APPEAL'],
  ['useHandover', 'NEXT_PUBLIC_USE_HANDOVER'],
  ['useInvestigation', 'NEXT_PUBLIC_USE_INVESTIGATION'],
] as const satisfies ReadonlyArray<readonly [keyof AppConfigFeatures, string]>;

beforeEach(() => vi.resetModules());
afterEach(() => vi.unstubAllEnvs());

test.each(retainedFlags)(
  '%s keeps its environment mapping and explicit Adminpanel on/off behavior',
  async (name, environmentName) => {
    vi.stubEnv(environmentName, 'true');
    const { appConfig, applyRuntimeFeatureFlags } = await import('./appconfig');
    assert.equal(appConfig.features[name], true);
    applyRuntimeFeatureFlags([]);
    assert.equal(appConfig.features[name], true);

    applyRuntimeFeatureFlags([{ name, enabled: false }]);
    assert.equal(appConfig.features[name], false);
    applyRuntimeFeatureFlags([{ name, enabled: true }]);
    assert.equal(appConfig.features[name], true);

    // A nonempty snapshot replaces the full capability set, including omitted flags.
    applyRuntimeFeatureFlags([{ name: 'reopenSupportErrandLimit', enabled: true, value: '40' }]);
    assert.equal(appConfig.features[name], false);
  }
);

test.each(['KC', 'MEX', 'PT', 'ROB', 'IAF', 'VOF'])(
  '%s retains its supplied Adminpanel capabilities after investigation migration',
  async (application) => {
    vi.stubEnv('DRAKEN_BUILD_DOMAIN', ['MEX', 'PT'].includes(application) ? 'casedata' : 'supportmanagement');
    const { appConfig, applyRuntimeFeatureFlags } = await import('./appconfig');
    const scoped = snapshot.flags.filter((row) => row.application === application);
    // This is the expected post-migration payload. The real migration is tested with
    // the same complete snapshot in scripts/migrate-investigation-flags.test.mjs.
    const migrated = scoped.filter((row) => row.name !== 'useAvvikelseInvestigation');
    applyRuntimeFeatureFlags(migrated);
    for (const [name] of retainedFlags) {
      assert.equal(
        appConfig.features[name],
        scoped.some((row) => row.name === name && row.enabled),
        `${application}/${name}`
      );
    }
    assert.equal(appConfig.isCaseData, ['MEX', 'PT'].includes(application));
    assert.equal(appConfig.isSupportManagement, !['MEX', 'PT'].includes(application));
  }
);

test('the reopening setting retains its value and existing reset semantics alongside boolean flags', async () => {
  const { appConfig, applyRuntimeFeatureFlags } = await import('./appconfig');
  applyRuntimeFeatureFlags([
    { name: 'useBilling', enabled: true },
    { name: 'reopenSupportErrandLimit', enabled: true, value: '40' },
  ]);
  assert.equal(appConfig.reopenSupportErrandLimit, '40');
  assert.equal(appConfig.features.useBilling, true);
  applyRuntimeFeatureFlags([]);
  assert.equal(appConfig.reopenSupportErrandLimit, '40');
  applyRuntimeFeatureFlags([{ name: 'reopenSupportErrandLimit', enabled: false, value: '40' }]);
  assert.equal(appConfig.reopenSupportErrandLimit, '30');
  assert.equal(appConfig.features.useBilling, false);
});
