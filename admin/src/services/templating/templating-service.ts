import { ServiceResponse } from '@interfaces/services';
import { ApiResponse, apiService } from '@services/api-service';

export interface Template {
  identifier?: string;
  name?: string;
  description?: string;
  metadata?: string;
  defaultValues?: string;
  content?: string;
  versionIncrement?: string;
  changeLog?: string;
  id?: number;
  createdAt?: string;
  updatedAt?: string;
}

interface PreviewResponse {
  output: string;
}

const base64Encode = (str: string) => {
  return Buffer.from(str, 'utf-8').toString('base64');
};

export const PreviewTemplate: (templateContent: string) => Promise<ServiceResponse<PreviewResponse>> = (
  templateContent
) => {
  const base64 = base64Encode(templateContent);
  return apiService
    .post<ApiResponse<PreviewResponse>>(`render/direct/pdf`, { content: base64 })
    .then((res) => {
      return res.data;
    })
    .catch((e) => ({
      message: e.response?.data.message,
      error: e.response?.status ?? 'UNKNOWN ERROR',
    }));
};
