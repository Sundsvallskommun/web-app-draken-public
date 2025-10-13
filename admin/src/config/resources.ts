import { Resource } from '@interfaces/resource';
import { ID } from '@interfaces/resource-services';
import { ServiceResponse } from '@interfaces/services';
import { HttpClient } from './http-client';
import { FeatureFlag } from '@interfaces/featureFlag';
import { Template } from '@services/templating/templating-service';

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

const templates: Resource<Template> = {
  name: 'templates',

  getMany: async () => {
    return apiService.request<ServiceResponse<Template[]>, unknown>({
      path: `${process.env.NEXT_PUBLIC_API_PATH}/templatessearch`,
      method: 'GET',
    });
  },

  getOne: async (identifier: ID) => {
    const res = await apiService.request<ServiceResponse<Template>, unknown>({
      path: `${process.env.NEXT_PUBLIC_API_PATH}/templates/${identifier}`,
      method: 'GET',
    });
    return res;
  },

  update: async (identifier: ID, data: Partial<Template>) => {
    const response = await apiService.request<Template, unknown>({
      path: `${process.env.NEXT_PUBLIC_API_PATH}/templates`,
      method: 'POST',
      body: data,
    });

    return {
      ...response,
      data: { data: response.data },
    };
  },

  create: async (data: Partial<Template>) => {
    const response = await apiService.request<Template, unknown>({
      path: `${process.env.NEXT_PUBLIC_API_PATH}/templates`,
      method: 'POST',
      body: data,
    });

    return {
      ...response,
      data: { data: response.data },
    };
  },

  defaultValues: {
    identifier: '',
    name: '',
    description: '',
    metadata: '',
    defaultValues: '',
    content: '',
    versionIncrement: 'MINOR',
    changeLog: '',
    id: undefined,
  },
  requiredFields: ['identifier'],
};

const resources = { featureFlags, templates };
export default resources;
