import { FeatureFlagService } from '@/services/feature-flag.service';

import { mockUser } from './helpers/http';
import { mockSupportNamespace } from './helpers/mock-data';

interface ApiStub {
  get: ReturnType<typeof vi.fn>;
}

const flag = (overrides: Partial<Record<'name' | 'application' | 'namespace' | 'enabled', string | boolean>> = {}) => ({
  id: 1,
  name: 'useErrorReporting',
  application: 'KC',
  namespace: mockSupportNamespace,
  enabled: true,
  ...overrides,
});

const makeService = (flags: ReturnType<typeof flag>[]) => {
  const service = new FeatureFlagService();
  const api: ApiStub = {
    get: vi.fn(async () => ({ data: { data: flags, message: 'success' }, message: 'success' })),
  };
  (service as unknown as { apiService: ApiStub }).apiService = api;
  return { service, api };
};

describe('FeatureFlagService', () => {
  it('returns only flags for the current Drake application and namespace', async () => {
    const { service } = makeService([
      flag(),
      flag({ name: 'useDetailsTab' }),
      flag({ application: 'MEX' }),
      flag({ namespace: 'ANOTHER_NAMESPACE' }),
    ]);

    await expect(service.getFeatureFlags(mockUser())).resolves.toEqual([
      { name: 'useErrorReporting', value: undefined, enabled: true },
      { name: 'useDetailsTab', value: undefined, enabled: true },
    ]);
  });

  it('enables a named flag only when the current Drake has an enabled record', async () => {
    const { service } = makeService([flag({ enabled: false }), flag({ name: 'useDetailsTab' })]);

    await expect(service.isEnabled(mockUser(), 'useErrorReporting')).resolves.toBe(false);
  });

  it('enables a named flag for the current Drake', async () => {
    const { service } = makeService([flag()]);

    await expect(service.isEnabled(mockUser(), 'useErrorReporting')).resolves.toBe(true);
  });

  it('defaults a missing flag to disabled', async () => {
    const { service } = makeService([]);

    await expect(service.isEnabled(mockUser(), 'useErrorReporting')).resolves.toBe(false);
  });
});
