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

/** Templating takes the template itself as base64; the HTML is UTF-8, which btoa alone cannot take. */
const base64OfText = (text: string): string =>
  window.btoa(Array.from(new TextEncoder().encode(text), (byte) => String.fromCodePoint(byte)).join(''));

/** Renders a template that is not (yet) stored in Templating. */
export const renderTemplatePdfDirect = (
  templateHtml: string,
  parameters: { [key: string]: string | Object }
): Promise<string> =>
  apiService
    .post<ApiResponse<Render>, TemplateSelector>('render/direct/pdf', {
      content: base64OfText(templateHtml),
      parameters,
    })
    .then((res) => res.data.data.output);

export const renderTemplatePdfPreview = (
  identifier: string,
  parameters: { [key: string]: string | Object }
): Promise<string> => renderedPdf('render/pdf/preview', identifier, parameters);
