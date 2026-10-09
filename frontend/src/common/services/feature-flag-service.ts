import { User } from '@common/interfaces/user';
import { appConfig } from '@config/appconfig';
import { FeatureFlagDto } from 'src/data-contracts/backend/data-contracts';

import { apiService } from './api-service';
import { isLOP } from './application-service';

const FEATURE_FLAGS_REQUEST_TIMEOUT_MS = 10_000;

export const isAppealEnabled = () => appConfig.features.useAppeal;
export const attestationEnabled = (user: User) => isLOP() && user.permissions?.canViewAttestations;
export const contractsEnabled = () => appConfig.features.useContracts;

export const getFeatureFlags = async () => {
  return await apiService
    .get<FeatureFlagDto[]>('featureflags', { timeout: FEATURE_FLAGS_REQUEST_TIMEOUT_MS })
    .then((res) => {
      return res;
    })
    .catch((e) => {
      if (process.env.NODE_ENV === 'production') {
        console.error('Something went wrong when fetching feature flags: ' + e);
      }
      throw e;
    });
};
