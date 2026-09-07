import { ApiResponse, apiService } from '@common/services/api-service';
import { logClientFailure } from '@common/services/client-diagnostics';
import type { RJSFSchema, UiSchema } from '@rjsf/utils';

export type JsonSchemaResponse = {
  id: string;
  name: string;
  version: string;
  value: RJSFSchema;
  description?: string;
  created?: string;
};

export type UiSchemaResponse = {
  id: string;
  value: UiSchema;
  description?: string;
  created?: string;
};

export const getSchema = (municipalityId: string, schemaId: string): Promise<ApiResponse<JsonSchemaResponse>> => {
  const url = `${municipalityId}/schemas/${schemaId}`;
  return apiService
    .get<ApiResponse<JsonSchemaResponse>>(url)
    .then((res) => res.data)
    .catch((e) => {
      logClientFailure('common.jsonschema.getSchema', e);
      throw e;
    });
};

export const getLatestSchema = (
  municipalityId: string,
  schemaName: string
): Promise<ApiResponse<JsonSchemaResponse>> => {
  const url = `${municipalityId}/schemas/${schemaName}/latest`;

  return apiService
    .get<ApiResponse<JsonSchemaResponse>>(url)
    .then((res) => res.data)
    .catch((e) => {
      logClientFailure('common.jsonschema.getLatestSchema', e);
      throw e;
    });
};

export const getUiSchema = (municipalityId: string, schemaId: string): Promise<ApiResponse<UiSchemaResponse>> => {
  const url = `${municipalityId}/schemas/${schemaId}/ui-schema`;

  return apiService
    .get<ApiResponse<UiSchemaResponse>>(url)
    .then((res) => res.data)
    .catch((e) => {
      logClientFailure('common.jsonschema.getUiSchema', e);
      throw e;
    });
};
