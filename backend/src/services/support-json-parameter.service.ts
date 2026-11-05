import { IsObject, IsString, MinLength } from 'class-validator';

import { apiServiceName } from '@/config/api-config';
import { JsonParameter } from '@/data-contracts/supportmanagement/data-contracts';
import { RequestWithUser } from '@/interfaces/auth.interface';
import ApiService from '@/services/api.service';
import { apiURL } from '@/utils/util';

/** A decision, investigation or section as answered to the frontend: with the JSON parameters kept beside it. */
export type WithJsonParameters<T> = T & { jsonParameters: JsonParameter[] };

export class WriteSupportJsonParameterDto {
  @IsString()
  @MinLength(1)
  schemaId!: string;

  @IsObject()
  value!: Record<string, unknown>;
}

// Support Management keeps the JSON parameters of a decision, investigation or section at <resource>/json-parameters.
export const readJsonParameters = async (apiService: ApiService, resourceUrl: string, user: RequestWithUser['user']): Promise<JsonParameter[]> => {
  const res = await apiService.get<JsonParameter[]>(
    { url: `${resourceUrl}/json-parameters`, baseURL: apiURL(apiServiceName('supportmanagement')), propagateClientError: true },
    user,
  );
  return res.data ?? [];
};

/** Creates or replaces the parameter; Support Management validates the value against the schema. */
export const writeJsonParameter = async (
  apiService: ApiService,
  resourceUrl: string,
  key: string,
  { schemaId, value }: WriteSupportJsonParameterDto,
  user: RequestWithUser['user'],
): Promise<void> => {
  await apiService.put<JsonParameter, JsonParameter>(
    {
      url: `${resourceUrl}/json-parameters/${encodeURIComponent(key)}`,
      baseURL: apiURL(apiServiceName('supportmanagement')),
      data: { key, schemaId, value: value as JsonParameter['value'] },
      propagateClientError: true,
    },
    user,
  );
};
