import { User } from '@common/interfaces/user';
import { FeatureFlagDto } from 'src/data-contracts/backend/data-contracts';
import { apiService } from './api-service';
import { getApplicationEnvironment, isKC, isLOP, isPT } from './application-service';

export const isAppealEnabled = () => isPT() && getApplicationEnvironment() === 'TEST';
export const attestationEnabled = (user: User) => isLOP() && user.permissions?.canViewAttestations;

export const getFeatureFlags = async () => {
  return await apiService
    .get<FeatureFlagDto[]>('featureflags')
    .then((res) => {
      return res;
    })
    .catch((e) => {
      console.error('Something went wrong when fetching feature flags: ' + e);
      throw e;
    });
};
