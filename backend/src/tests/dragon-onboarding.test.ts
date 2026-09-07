import { createSupportApplicationProfile } from '@/config/support-application-profile';
import { SupportApplicationPolicyService } from '@/services/support-application-policy.service';

import { mockUser } from './helpers/http';

vi.mock('../../../dragons.json', async importOriginal => {
  const catalog = await importOriginal<{ default: Record<string, { domain: string }> }>();
  return {
    default: {
      ...catalog.default,
      FUTURECD: { domain: 'casedata' },
      FUTURESM: { domain: 'supportmanagement' },
    },
  };
});

afterEach(() => vi.unstubAllEnvs());

it.each([
  ['FUTURECD', 'casedata', true, false],
  ['FUTURESM', 'supportmanagement', false, true],
] as const)('a newly catalogued %s grants editing permissions for its domain', async (identity, domain, casedata, supportmanagement) => {
  vi.resetModules();
  vi.stubEnv('APPLICATION', identity);
  const { getDragonDomain } = await import('@/config/dragon-build');
  const { getLoginPermissions } = await import('@/services/authorization.service');

  expect(getDragonDomain(identity)).toBe(domain);
  expect(getLoginPermissions([process.env.ADMIN_GROUP!])).toMatchObject({
    canEditCasedata: casedata,
    canEditSupportManagement: supportmanagement,
  });
});

it.each(['enabled', 'disabled'] as const)('a new SM dragon explicitly chooses registration %s without a shared identity table', async mode => {
  const profile = createSupportApplicationProfile({
    application: 'FUTURESM',
    documents: [],
    registration: mode === 'enabled' ? { mode, defaults: { classification: { category: 'FUTURE', type: 'UNCLASSIFIED' } } } : { mode },
  });
  const service = new SupportApplicationPolicyService(undefined, profile, 'future-sm');

  await expect(service.getRegistrationState(mockUser())).resolves.toBe(mode);
  await expect(service.getRuntimeProfile(mockUser())).resolves.toEqual({
    application: 'FUTURESM',
    documents: [],
    state: 'inactive',
    registration: { mode },
  });
});

it('rejects an omitted registration decision at profile creation', () => {
  expect(() => Reflect.apply(createSupportApplicationProfile, undefined, [{ application: 'FUTURESM', documents: [] }])).toThrow(
    'must explicitly enable or disable registration',
  );
});
