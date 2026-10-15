import { mockEnv } from './mock-env';

/**
 * Boot-time investigation profile for the SupportManagement applications that do not run
 * investigation (KC, LOP, ...), matching what the BFF returns for an application without a
 * configured profile: no documents, state "inactive", registration enabled.
 *
 * AppInitializer holds back the first paint until this request settles, so a spec that leaves it
 * unmocked renders nothing until the client timeout expires. Returned from a factory so a spec that
 * overrides parts of it cannot mutate the object the next test gets.
 */
export const mockInvestigationProfile = () => ({
  application: mockEnv.application_name,
  documents: [],
  state: 'inactive',
  registration: { mode: 'enabled' },
});
