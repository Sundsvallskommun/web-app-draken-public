import { APIS, apiServiceName, resolveSupportManagementApiTarget } from '@/config/api-config';

const configuredVersions = new Map(APIS.map(({ name, version }) => [name, version]));

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
    expect(apiServiceName('supportmanagement')).toBe(`supportmanagement/${configuredVersions.get('supportmanagement')}`);
  });

  it('routes only deployments that explicitly opt in through the sprint API', () => {
    process.env.SUPPORTMANAGEMENT_API_TARGET = 'sprint';

    expect(resolveSupportManagementApiTarget()).toBe('sprint');
    expect(apiServiceName('supportmanagement')).toBe(`supportmanagement-sprint/${configuredVersions.get('supportmanagement-sprint')}`);
  });

  it('routes the AOT deployment through its explicit ALKT sprint API', () => {
    process.env.SUPPORTMANAGEMENT_API_TARGET = 'alktsprint';

    expect(resolveSupportManagementApiTarget()).toBe('alktsprint');
    expect(apiServiceName('supportmanagement')).toBe(`support-management-alkt-sprint/${configuredVersions.get('support-management-alkt-sprint')}`);
  });

  it('rejects misspelled targets instead of silently changing the upstream contract', () => {
    process.env.SUPPORTMANAGEMENT_API_TARGET = 'latest';

    expect(() => resolveSupportManagementApiTarget()).toThrow(
      'Unsupported SUPPORTMANAGEMENT_API_TARGET "latest". Expected one of: stable, sprint, alktsprint',
    );
  });

  it('keeps regular configured and unknown service names unchanged', () => {
    expect(apiServiceName('citizen')).toBe(`citizen/${configuredVersions.get('citizen')}`);
    expect(apiServiceName('unknown-service')).toBe('unknown-service');
  });
});
