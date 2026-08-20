import { createSupportInvestigationProfile, getSupportInvestigationProfile } from '@/config/support-investigation-profile';
import { FeatureFlagService } from '@/services/feature-flag.service';
import { SupportInvestigationAccessService } from '@/services/support-investigation-access.service';
import { SupportInvestigationPolicyService } from '@/services/support-investigation-policy.service';

import { mockReq, mockUser } from './helpers/http';

const profile = createSupportInvestigationProfile({
  application: 'FUTURE',
  documents: [{ key: 'investigation', schemaName: 'shared-schema', tabLabel: 'Investigation', ownerLabel: 'Owner' }],
});

const accessService = () =>
  ({
    configured: true,
    permissionsFor: vi.fn(() => ({ canRead: true, canWrite: true })),
  }) as unknown as SupportInvestigationAccessService;

const serviceWith = (enabled: boolean | undefined | Error, configuredProfile = profile) => {
  const featureFlags = {
    getFreshFeatureEnabled: vi.fn(async () => {
      if (enabled instanceof Error) throw enabled;
      return enabled;
    }),
  } as unknown as FeatureFlagService;
  return {
    service: new SupportInvestigationPolicyService(featureFlags, configuredProfile, 'support', accessService()),
    featureFlags,
  };
};

describe('SupportInvestigationPolicyService', () => {
  it.each([
    [true, 'active'],
    [false, 'inactive'],
  ] as const)('maps an explicit Adminpanel flag %s to %s', async (enabled, expectedState) => {
    const { service } = serviceWith(enabled);
    await expect(service.getState(mockReq().user)).resolves.toBe(expectedState);
  });

  it('treats a valid snapshot without the exact flag as feature-off', async () => {
    const missing = serviceWith(undefined);
    await expect(missing.service.getState(mockReq().user)).resolves.toBe('inactive');
  });

  it('keeps an unavailable source distinct from feature-off', async () => {
    await expect(serviceWith(new Error('Adminpanel unavailable')).service.getState(mockReq().user)).resolves.toBe('unavailable');
  });

  it('does not activate document routes when deployment access rules are missing', async () => {
    const flags = { getFreshFeatureEnabled: vi.fn(async () => true) } as unknown as FeatureFlagService;
    const unavailableAccess = { configured: false } as unknown as SupportInvestigationAccessService;
    const service = new SupportInvestigationPolicyService(flags, profile, 'support', unavailableAccess);

    await expect(service.getState(mockReq().user)).resolves.toBe('unavailable');
  });

  it('is inactive without configured documents and does not query Adminpanel', async () => {
    const featureFlags = { getFreshFeatureEnabled: vi.fn() } as unknown as FeatureFlagService;
    const emptyProfile = createSupportInvestigationProfile({ application: 'KC', documents: [] });
    const service = new SupportInvestigationPolicyService(featureFlags, emptyProfile, 'support');

    await expect(service.getState(mockReq().user)).resolves.toBe('inactive');
    expect(featureFlags.getFreshFeatureEnabled).not.toHaveBeenCalled();
  });

  it('returns the configured profile together with its effective state', async () => {
    const { service } = serviceWith(true);
    await expect(service.getRuntimeProfile(mockReq().user)).resolves.toEqual({
      ...profile,
      documents: profile.documents.map(document => ({ ...document, permissions: { canRead: true, canWrite: true } })),
      state: 'active',
      registration: { mode: 'disabled' },
    });
  });

  it('moves classification ownership only for IAF/VOF with the fixed owner schema roles', async () => {
    const iafProfile = createSupportInvestigationProfile({
      application: 'IAF',
      documents: [
        {
          key: 'manager-document',
          schemaName: 'utredning-enhetschef',
          tabLabel: 'Manager',
          ownerLabel: 'Manager',
        },
        {
          key: 'social-document',
          schemaName: 'utredning-sol-lss',
          tabLabel: 'Social',
          ownerLabel: 'Investigator',
        },
      ],
      labelFilter: {
        groups: [
          {
            key: 'future-filter',
            label: 'Future filter',
            rootResourcePath: 'FUTURE',
            fields: [{ key: 'future-field', label: 'Future field', classification: 'FUTURE' }],
          },
        ],
      },
    });
    const policy = (enabled: boolean | undefined | Error) => serviceWith(enabled, iafProfile).service;

    await expect(policy(true).getClassificationOwner(mockReq().user)).resolves.toBe('investigation');
    await expect(policy(false).getClassificationOwner(mockReq().user)).resolves.toBe('generic-errand');
    await expect(policy(new Error('down')).getClassificationOwner(mockReq().user)).resolves.toBe('unavailable');
    const activePolicy = policy(true);
    const runtimeProfile = await activePolicy.getRuntimeProfile(mockReq().user);
    expect(runtimeProfile).toMatchObject({
      labelFilter: {
        groups: [{ key: 'future-filter', rootResourcePath: 'FUTURE' }],
      },
    });
    expect('classificationPolicy' in runtimeProfile).toBe(false);
    await expect(serviceWith(true).service.getClassificationOwner(mockReq().user)).resolves.toBe('generic-errand');
  });

  it('disables registration in the runtime profile and command policy when investigation ownership is unavailable', async () => {
    const iafProfile = getSupportInvestigationProfile('IAF');
    const featureFlags = {
      getFreshFeatureEnabled: vi.fn(async () => {
        throw new Error('down');
      }),
    } as unknown as FeatureFlagService;
    const service = new SupportInvestigationPolicyService(featureFlags, iafProfile, 'support', accessService(), 'sprint');

    await expect(service.getRegistrationState(mockReq().user)).resolves.toBe('unavailable');
    await expect(service.getRuntimeProfile(mockReq().user)).resolves.toMatchObject({
      state: 'unavailable',
      registration: { mode: 'disabled' },
    });
  });

  it('does not apply the fixed IAF/VOF rule to another application with the same document schemas', async () => {
    const documentsOnly = createSupportInvestigationProfile({
      application: 'FUTURE',
      documents: [
        {
          key: 'manager-document',
          schemaName: 'utredning-enhetschef',
          tabLabel: 'Manager',
          ownerLabel: 'Manager',
        },
        {
          key: 'social-document',
          schemaName: 'utredning-sol-lss',
          tabLabel: 'Social',
          ownerLabel: 'Investigator',
        },
      ],
    });

    await expect(serviceWith(true, documentsOnly).service.getClassificationOwner(mockReq().user)).resolves.toBe('generic-errand');
    expect(serviceWith(true, documentsOnly).service.iafVofClassificationPolicy).toBeUndefined();
    expect(serviceWith(true, documentsOnly).service.labelFilter).toBeUndefined();
  });

  it('allows transfer of a future profile document only for active policy and explicit read access', async () => {
    const featureFlags = { getFreshFeatureEnabled: vi.fn(async () => true) } as unknown as FeatureFlagService;
    const access = new SupportInvestigationAccessService(
      profile,
      JSON.stringify({ investigation: { readGroups: ['investigator'], writeGroups: ['investigator'] } }),
    );
    const service = new SupportInvestigationPolicyService(featureFlags, profile, 'future-namespace', access);
    const errand = { jsonParameters: [{ key: 'investigation' }, { key: 'legacy-document' }] };

    await expect(service.assertCanTransferProtectedJsonParameters(errand, mockUser({ groups: ['INVESTIGATOR'] }))).resolves.toBeUndefined();
    await expect(service.assertCanTransferProtectedJsonParameters(errand, mockUser({ groups: ['other'] }))).rejects.toMatchObject({ status: 403 });
  });

  it.each([
    [false, 409, 'Investigation document transfer is not active for this application'],
    [new Error('feature source down'), 503, 'Investigation document transfer policy is temporarily unavailable'],
  ] as const)('fails protected transfer closed when runtime policy resolves from %s', async (enabled, status, message) => {
    const featureFlags = {
      getFreshFeatureEnabled: vi.fn(async () => {
        if (enabled instanceof Error) throw enabled;
        return enabled;
      }),
    } as unknown as FeatureFlagService;
    const access = new SupportInvestigationAccessService(
      profile,
      JSON.stringify({ investigation: { readGroups: ['investigator'], writeGroups: ['investigator'] } }),
    );
    const service = new SupportInvestigationPolicyService(featureFlags, profile, 'future-namespace', access);

    await expect(
      service.assertCanTransferProtectedJsonParameters({ jsonParameters: [{ key: 'investigation' }] }, mockUser({ groups: ['investigator'] })),
    ).rejects.toMatchObject({ status, message });
  });

  it('does not consult investigation runtime policy for generic JSON parameters', async () => {
    const featureFlags = { getFreshFeatureEnabled: vi.fn() } as unknown as FeatureFlagService;
    const access = new SupportInvestigationAccessService(profile, undefined);
    const service = new SupportInvestigationPolicyService(featureFlags, profile, 'future-namespace', access);

    await expect(
      service.assertCanTransferProtectedJsonParameters({ jsonParameters: [{ key: 'legacy-document' }] }, mockUser()),
    ).resolves.toBeUndefined();
    expect(featureFlags.getFreshFeatureEnabled).not.toHaveBeenCalled();
  });

  it('fails a configured investigation capability closed when its Support Management API target is unavailable', async () => {
    const iafProfile = getSupportInvestigationProfile('IAF');
    const featureFlags = { getFreshFeatureEnabled: vi.fn(async () => true) } as unknown as FeatureFlagService;
    const stableService = new SupportInvestigationPolicyService(featureFlags, iafProfile, 'support', accessService(), 'stable');

    await expect(stableService.getState(mockReq().user)).resolves.toBe('unavailable');
    await expect(stableService.getRegistrationState(mockReq().user)).resolves.toBe('unavailable');
    expect(featureFlags.getFreshFeatureEnabled).not.toHaveBeenCalled();
  });

  it('activates a configured investigation capability on its declared Support Management API target', async () => {
    const iafProfile = getSupportInvestigationProfile('IAF');
    const featureFlags = { getFreshFeatureEnabled: vi.fn(async () => true) } as unknown as FeatureFlagService;
    const sprintService = new SupportInvestigationPolicyService(featureFlags, iafProfile, 'support', accessService(), 'sprint');

    await expect(sprintService.getState(mockReq().user)).resolves.toBe('active');
    expect(featureFlags.getFreshFeatureEnabled).toHaveBeenCalledOnce();
  });
});
