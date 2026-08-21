import { MUNICIPALITY_ID } from '@/config';
import { FeatureFlagDto } from '@/dtos/featureflag.dto';
import { User } from '@/interfaces/users.interface';
import { FeatureFlagsApiResponse } from '@/responses/featureflag.response';

import ApiService from './api.service';

export class FeatureFlagService {
  private apiService = new ApiService();

  async getFeatureFlags(user: User): Promise<FeatureFlagDto[]> {
    const url = `${process.env.ADMINPANEL_URL}/featureflags/${MUNICIPALITY_ID}`;
    const response = await this.apiService.get<FeatureFlagsApiResponse>({ baseURL: url }, user);
    const namespaces = [process.env.CASEDATA_NAMESPACE, process.env.SUPPORTMANAGEMENT_NAMESPACE];

    return response.data.data
      .filter(flag => flag.application === process.env.APPLICATION && namespaces.includes(flag.namespace))
      .map(flag => ({
        name: flag.name,
        value: flag.value,
        enabled: flag.enabled,
      }));
  }

  async isEnabled(user: User, flagName: string): Promise<boolean> {
    const flags = await this.getFeatureFlags(user);
    return flags.some(flag => flag.name === flagName && flag.enabled);
  }
}
