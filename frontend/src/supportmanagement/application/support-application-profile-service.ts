import { apiService } from '@common/services/api-service';

import { parseSupportApplicationProfile, SupportApplicationProfile } from './support-application-profile';

export async function getSupportApplicationProfile(expectedApplication?: string): Promise<SupportApplicationProfile> {
  const response = await apiService.get<unknown>('supportmanagement/application-profile', { timeout: 10_000 });
  return parseSupportApplicationProfile(response.data, expectedApplication);
}
