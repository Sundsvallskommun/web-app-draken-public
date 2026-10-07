import type { ApiResponse } from '@common/services/api-service';
import { apiService } from '@common/services/api-service';

import type { Render, TemplateSelector } from '../interfaces/template';

const renderedPdf = (
  route: string,
  identifier: string,
  parameters: { [key: string]: string | Object }
): Promise<string> =>
  apiService
    .post<ApiResponse<Render>, TemplateSelector>(route, { identifier, parameters })
    .then((res) => res.data.data.output);

export const renderTemplatePdf = (
  identifier: string,
  parameters: { [key: string]: string | Object }
): Promise<string> => renderedPdf('render/pdf', identifier, parameters);

export const renderTemplatePdfPreview = (
  identifier: string,
  parameters: { [key: string]: string | Object }
): Promise<string> => renderedPdf('render/pdf/preview', identifier, parameters);
