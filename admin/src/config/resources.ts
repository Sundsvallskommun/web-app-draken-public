import { Resource } from '@interfaces/resource';
import { ID } from '@interfaces/resource-services';
import { ServiceResponse } from '@interfaces/services';
import { HttpClient } from './http-client';
import { FeatureFlag } from '@interfaces/featureFlag';

const apiService = new HttpClient({ baseURL: process.env.NEXT_PUBLIC_API_URL, withCredentials: true });

const featureFlags: Resource<FeatureFlag> = {
  name: 'featureFlags',

  getMany: async () => {
    return apiService.request<ServiceResponse<FeatureFlag[]>, unknown>({
      path: `${process.env.NEXT_PUBLIC_API_PATH}/flags`,
      method: 'GET',
    });
  },

  getOne: async (id: ID) => {
    const res = await apiService.request<ServiceResponse<FeatureFlag>, unknown>({
      path: `${process.env.NEXT_PUBLIC_API_PATH}/flags/id/${id}`,
      method: 'GET',
    });
    return res;
  },
  update: async (id: ID, data: Partial<FeatureFlag>) => {
    const numericId = typeof id === 'string' ? Number(id) : id;

    const response = await apiService.request<FeatureFlag, unknown>({
      path: `${process.env.NEXT_PUBLIC_API_PATH}/flags/${numericId}`,
      method: 'PUT',
      body: data,
    });

    return {
      ...response,
      data: { data: response.data },
    };
  },

  defaultValues: {
    id: undefined,
    name: '',
    enabled: false,
    application: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  requiredFields: ['name', 'enabled'],
};

const resources = { featureFlags };
export default resources;
