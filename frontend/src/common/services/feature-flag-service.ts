import { User } from '@common/interfaces/user';
import { logClientFailure } from '@common/services/client-diagnostics';
import { appConfig, FeatureFlagConfigurationError } from '@config/appconfig';
import axios from 'axios';
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
        logClientFailure('common.feature-flag.getFeatureFlags', e);
      }
      const body: unknown = axios.isAxiosError<unknown>(e) ? e.response?.data : undefined;
      if (
        axios.isAxiosError<unknown>(e) &&
        e.response?.status === 409 &&
        body &&
        typeof body === 'object' &&
        'message' in body &&
        body.message === 'INVESTIGATION_FLAGS_REQUIRE_MIGRATION'
      ) {
        throw new FeatureFlagConfigurationError();
      }
      throw e;
    });
};
