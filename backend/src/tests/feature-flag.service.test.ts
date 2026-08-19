import ApiService from '@/services/api.service';
import { FeatureFlagService } from '@/services/feature-flag.service';

import { mockReq } from './helpers/http';

const configuration = {
  adminpanelUrl: 'https://adminpanel.example/api',
  application: 'IAF',
  municipalityId: '2281',
  namespaces: ['supportmanagement', 'casedata'],
};

const flags = [
  { id: 1, name: 'useInvestigation', enabled: true, application: 'IAF', namespace: 'supportmanagement' },
  { id: 2, name: 'useAppeal', enabled: false, application: 'IAF', namespace: 'casedata', value: 'reason' },
  { id: 3, name: 'useInvestigation', enabled: false, application: 'VOF', namespace: 'supportmanagement' },
  { id: 4, name: 'other', enabled: true, application: 'IAF', namespace: 'other' },
];

const makeService = (data: unknown = flags) => {
  const apiService = { get: vi.fn(async () => ({ data: { data, message: 'success' }, message: 'success' })) };
  const service = new FeatureFlagService(apiService as unknown as ApiService, configuration);
  return { service, apiService };
};

describe('FeatureFlagService', () => {
  it('owns application and namespace filtering for both the public endpoint and backend policies', async () => {
    const { service, apiService } = makeService();
    const user = mockReq().user;

    await expect(service.getFeatureFlags(user)).resolves.toEqual([
      { name: 'useInvestigation', enabled: true, value: undefined },
      { name: 'useAppeal', enabled: false, value: 'reason' },
    ]);
    expect(apiService.get).toHaveBeenCalledWith({ baseURL: 'https://adminpanel.example/api/featureflags/2281', timeout: 3000 }, user);

    await expect(service.getFeatureEnabled(user, 'useInvestigation', 'supportmanagement')).resolves.toBe(true);
    await expect(service.getFeatureEnabled(user, 'missing', 'supportmanagement')).resolves.toBeUndefined();
  });

  it('rejects an ambiguous flag instead of depending on response order', async () => {
    const duplicate = { ...flags[0], id: 5 };
    const { service } = makeService([...flags, duplicate]);

    await expect(service.getFeatureEnabled(mockReq().user, 'useInvestigation', 'supportmanagement')).rejects.toMatchObject({
      status: 502,
      message: 'Feature flag supportmanagement/useInvestigation is configured more than once',
    });
  });

  it('shares one in-flight refresh between ordinary and strict readers and keeps a fresh snapshot', async () => {
    let resolveRequest: ((value: { data: { data: typeof flags; message: string }; message: string }) => void) | undefined;
    const apiService = {
      get: vi.fn(
        () =>
          new Promise<{ data: { data: typeof flags; message: string }; message: string }>(resolve => {
            resolveRequest = resolve;
          }),
      ),
    };
    const service = new FeatureFlagService(apiService as unknown as ApiService, configuration);
    const user = mockReq().user;

    const first = service.getFeatureFlags(user);
    const second = service.getFreshFeatureEnabled(user, 'useInvestigation', 'supportmanagement');
    expect(apiService.get).toHaveBeenCalledTimes(1);
    resolveRequest?.({ data: { data: flags, message: 'success' }, message: 'success' });

    await expect(first).resolves.toHaveLength(2);
    await expect(second).resolves.toBe(true);
    await service.getFeatureFlags(user);
    expect(apiService.get).toHaveBeenCalledTimes(1);
  });

  it('uses a fresh cached snapshot for strict reads', async () => {
    const { service, apiService } = makeService();
    const user = mockReq().user;

    await expect(service.getFreshFeatureEnabled(user, 'useInvestigation', 'supportmanagement')).resolves.toBe(true);
    await expect(service.getFreshFeatureEnabled(user, 'useAppeal', 'casedata')).resolves.toBe(false);

    expect(apiService.get).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['enabled', 'useInvestigation', 'supportmanagement'],
    ['disabled', 'useAppeal', 'casedata'],
  ])('never returns an expired stale %s flag to a strict reader', async (_state, name, namespace) => {
    let now = 0;
    const apiService = {
      get: vi
        .fn()
        .mockResolvedValueOnce({ data: { data: flags, message: 'success' }, message: 'success' })
        .mockRejectedValue(new Error('Adminpanel unavailable')),
    };
    const service = new FeatureFlagService(apiService as unknown as ApiService, {
      ...configuration,
      freshTtlMs: 30,
      staleTtlMs: 300,
      now: () => now,
    });
    const user = mockReq().user;

    await service.getFreshApplicationFlags(user);
    now = 31;

    await expect(service.getFreshFeatureEnabled(user, name, namespace)).rejects.toThrow('Adminpanel unavailable');
  });

  it('gives strict and ordinary readers the same refresh failure while only ordinary reads may use stale data', async () => {
    let now = 0;
    let rejectRefresh: ((reason?: unknown) => void) | undefined;
    const refreshError = new Error('Adminpanel unavailable');
    const apiService = {
      get: vi
        .fn()
        .mockResolvedValueOnce({ data: { data: flags, message: 'success' }, message: 'success' })
        .mockImplementationOnce(
          () =>
            new Promise((_resolve, reject) => {
              rejectRefresh = reject;
            }),
        ),
    };
    const service = new FeatureFlagService(apiService as unknown as ApiService, {
      ...configuration,
      freshTtlMs: 30,
      staleTtlMs: 300,
      now: () => now,
    });
    const user = mockReq().user;

    await service.getApplicationFlags(user);
    now = 31;

    const ordinary = service.getFeatureEnabled(user, 'useInvestigation', 'supportmanagement');
    const strict = service.getFreshFeatureEnabled(user, 'useInvestigation', 'supportmanagement');
    const strictExpectation = expect(strict).rejects.toBe(refreshError);

    expect(apiService.get).toHaveBeenCalledTimes(2);
    rejectRefresh?.(refreshError);

    await expect(ordinary).resolves.toBe(true);
    await strictExpectation;
    expect(apiService.get).toHaveBeenCalledTimes(2);
  });

  it('uses a bounded stale snapshot for ordinary reads and fails after the stale limit', async () => {
    let now = 0;
    const apiService = {
      get: vi
        .fn()
        .mockResolvedValueOnce({ data: { data: flags, message: 'success' }, message: 'success' })
        .mockRejectedValue(new Error('Adminpanel unavailable')),
    };
    const service = new FeatureFlagService(apiService as unknown as ApiService, {
      ...configuration,
      freshTtlMs: 30,
      staleTtlMs: 300,
      now: () => now,
    });
    const user = mockReq().user;

    await expect(service.getFeatureEnabled(user, 'useInvestigation', 'supportmanagement')).resolves.toBe(true);
    now = 31;
    await expect(service.getFeatureEnabled(user, 'useInvestigation', 'supportmanagement')).resolves.toBe(true);
    now = 301;
    await expect(service.getFeatureEnabled(user, 'useInvestigation', 'supportmanagement')).rejects.toThrow('Adminpanel unavailable');
  });

  it('rejects malformed snapshots instead of trusting TypeScript response annotations', async () => {
    const { service } = makeService([{ ...flags[0], enabled: 'yes' }]);
    await expect(service.getFeatureFlags(mockReq().user)).rejects.toMatchObject({ status: 502 });
  });

  it('fails explicitly when required source configuration is absent', async () => {
    const apiService = { get: vi.fn() };
    const service = new FeatureFlagService(apiService as unknown as ApiService, {
      ...configuration,
      adminpanelUrl: ' ',
    });

    await expect(service.getFeatureFlags(mockReq().user)).rejects.toMatchObject({
      status: 500,
      message: 'Missing feature flag configuration: ADMINPANEL_URL',
    });
    expect(apiService.get).not.toHaveBeenCalled();
  });
});
