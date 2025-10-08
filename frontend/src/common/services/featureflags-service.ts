import { FeatureFlags } from '@config/feature-flags';
import { ApiResponse, apiService } from './api-service';

function mapFeatureFlagsGeneric(data: Array<{ name: string; enabled: boolean }>): FeatureFlags {
  return data.reduce((acc, { name, enabled }) => {
    acc[name] = enabled;
    return acc;
  }, {} as FeatureFlags);
}

export const getFeatureFlags = async () => {
  return await apiService
    .get<ApiResponse<any>>('flags')
    .then((res) => {
      return mapFeatureFlagsGeneric(res.data.data);
    })
    .catch((e) => {
      console.error('Something went wrong when fetching feature flags: ' + e);
      throw e;
    });
};
