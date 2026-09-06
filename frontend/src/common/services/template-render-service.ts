import { Render, TemplateSelector } from '@common/interfaces/template';
import { ApiResponse, apiService } from '@common/services/api-service';

export const renderTemplatePdf: (
  identifier: string,
  parameters: { [key: string]: string | Object }
) => Promise<string> = (identifier, parameters) => {
  const body: TemplateSelector = { identifier, parameters };
  return apiService
    .post<ApiResponse<Render>, TemplateSelector>('render/pdf', body)
    .then((res) => res.data.data.output)
    .catch(() => {
      throw new Error('Något gick fel när förhandsgranskningen skulle skapas');
    });
};
