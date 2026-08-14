import { apiServiceName } from '@/config/api-config';

describe('apiServiceName', () => {
  it('routes the canonical Support Management name through the temporary sprint API', () => {
    expect(apiServiceName('supportmanagement')).toBe('supportmanagement-sprint/14.14');
  });

  it('keeps regular configured and unknown service names unchanged', () => {
    expect(apiServiceName('citizen')).toBe('citizen/3.0');
    expect(apiServiceName('unknown-service')).toBe('unknown-service');
  });
});
