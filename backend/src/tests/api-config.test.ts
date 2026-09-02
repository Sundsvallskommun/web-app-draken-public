import { apiServiceName, resolveSupportManagementApiTarget } from '@/config/api-config';

describe('apiServiceName', () => {
  const originalTarget = process.env.SUPPORTMANAGEMENT_API_TARGET;

  afterEach(() => {
    if (originalTarget === undefined) {
      delete process.env.SUPPORTMANAGEMENT_API_TARGET;
    } else {
      process.env.SUPPORTMANAGEMENT_API_TARGET = originalTarget;
    }
  });

  it('keeps every application on the stable Support Management API by default', () => {
    delete process.env.SUPPORTMANAGEMENT_API_TARGET;

    expect(resolveSupportManagementApiTarget()).toBe('stable');
    expect(apiServiceName('supportmanagement')).toBe('supportmanagement/15.1');
  });

  it('routes only deployments that explicitly opt in through the sprint API', () => {
    process.env.SUPPORTMANAGEMENT_API_TARGET = 'sprint';

    expect(resolveSupportManagementApiTarget()).toBe('sprint');
    expect(apiServiceName('supportmanagement')).toBe('supportmanagement-sprint/15.1');
  });

  it('routes the AOT deployment through its explicit ALKT sprint API', () => {
    process.env.SUPPORTMANAGEMENT_API_TARGET = 'alktsprint';

    expect(resolveSupportManagementApiTarget()).toBe('alktsprint');
    expect(apiServiceName('supportmanagement')).toBe('support-management-alkt-sprint/15.1');
  });

  it('rejects misspelled targets instead of silently changing the upstream contract', () => {
    process.env.SUPPORTMANAGEMENT_API_TARGET = 'latest';

    expect(() => resolveSupportManagementApiTarget()).toThrow(
      'Unsupported SUPPORTMANAGEMENT_API_TARGET "latest". Expected one of: stable, sprint, alktsprint',
    );
  });

  it('keeps regular configured and unknown service names unchanged', () => {
    expect(apiServiceName('citizen')).toBe('citizen/3.0');
    expect(apiServiceName('unknown-service')).toBe('unknown-service');
  });
});
