/**
 * Template service for fetching and processing templates.
 *
 * Template identifier format: {app}.{type}.{variant}
 *   - app: Application identifier (mex, pt, ka, lop, ik, internal)
 *   - type: Template type (email, sms, decision, contract)
 *   - variant: Template variant (default, closing, signature, etc.)
 *
 * Examples:
 *   - ka.email.default:        Default email template for KA
 *   - mex.sms.signature:       SMS signature for MEX
 *   - mex.decision.approval:   Decision approval template for MEX
 *   - internal.signature:      Internal-only signature (no type)
 *
 * Parameters use {{key}} syntax and are replaced at runtime.
 */

import { ApiResponse, apiService } from '@common/services/api-service';

export const EMAIL_INFORMATION_TEXT =
  '<p><b>Vänligen ändra inte ämnesraden om du svarar på detta meddelande.</b></p><br>';

interface TemplateApiResponse {
  identifier?: string;
  name?: string;
  description?: string;
  content?: string;
  defaultValues?: Array<{ fieldName: string; value: string }>;
}

function base64Decode(base64: string): string {
  try {
    return Buffer.from(base64, 'base64').toString('utf-8');
  } catch {
    return atob(base64);
  }
}

export function replaceTemplateParameters(template: string, parameters: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(parameters)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
  }
  return result;
}

async function fetchTemplate(identifier: string): Promise<string | null> {
  try {
    const response = await apiService.get<ApiResponse<TemplateApiResponse>>(`templates/${identifier}`);
    const template = response.data?.data;
    if (template?.content) {
      return base64Decode(template.content);
    }
    return null;
  } catch (error) {
    console.error(`Failed to fetch template: ${identifier}`, error);
    return null;
  }
}

export interface TemplateInfo {
  identifier: string;
  name: string;
  content: string;
}

export interface TemplateResult {
  templates: TemplateInfo[];
  byId: Record<string, TemplateInfo>;
}

export interface FetchTemplatesOptions {
  prefix?: string;
  type?: 'email' | 'sms';
  excludeVariants?: string[];
}

export async function fetchTemplatesWithMetadata(
  prefixOrOptions: string | FetchTemplatesOptions
): Promise<TemplateResult> {
  try {
    const options: FetchTemplatesOptions =
      typeof prefixOrOptions === 'string' ? { prefix: prefixOrOptions } : prefixOrOptions;

    const params = new URLSearchParams();
    if (options.prefix) {
      params.set('prefix', options.prefix);
    }
    if (options.type) {
      params.set('type', options.type);
    }
    if (options.excludeVariants?.length) {
      params.set('excludeVariants', options.excludeVariants.join(','));
    }

    const response = await apiService.get<ApiResponse<TemplateApiResponse[]>>(`templates?${params.toString()}`);

    const templates = (response.data?.data || [])
      .filter((t) => t.identifier && t.content)
      .map((t) => ({
        identifier: t.identifier!,
        name: t.name || t.identifier!,
        content: base64Decode(t.content!),
      }));

    const byId: Record<string, TemplateInfo> = {};
    for (const t of templates) {
      byId[t.identifier] = t;
    }

    return { templates, byId };
  } catch (error) {
    console.error(`Failed to fetch templates`, error);
    return { templates: [], byId: {} };
  }
}

async function fetchContentWithSignature(
  contentIdentifier: string,
  signatureIdentifier: string,
  parameters: Record<string, string> = {}
): Promise<string | null> {
  const [content, signature] = await Promise.all([
    fetchTemplate(contentIdentifier),
    fetchTemplate(signatureIdentifier),
  ]);

  if (!content) {
    return null;
  }

  let result = content;
  if (signature) {
    result = content + signature;
  }

  return replaceTemplateParameters(result, parameters);
}

export async function getEmailTemplate(
  app: string,
  variant: string = 'default',
  parameters: Record<string, string> = {}
): Promise<string | null> {
  const appLower = app.toLowerCase();
  const contentId = `${appLower}.email.${variant}`;
  const signatureId = `${appLower}.email.signature`;

  return fetchContentWithSignature(contentId, signatureId, parameters);
}

export async function getSmsTemplate(
  app: string,
  variant: string = 'default',
  parameters: Record<string, string> = {}
): Promise<string | null> {
  const appLower = app.toLowerCase();
  const contentId = `${appLower}.sms.${variant}`;
  const signatureId = `${appLower}.sms.signature`;

  return fetchContentWithSignature(contentId, signatureId, parameters);
}

export async function getClosingTemplate(app: string, parameters: Record<string, string> = {}): Promise<string | null> {
  const appLower = app.toLowerCase();
  const contentId = `${appLower}.email.closing`;
  const signatureId = `${appLower}.email.signature`;

  return fetchContentWithSignature(contentId, signatureId, parameters);
}

export async function getInternalSignature(parameters: Record<string, string> = {}): Promise<string | null> {
  const signature = await fetchTemplate('internal.signature');
  if (!signature) {
    return null;
  }

  return replaceTemplateParameters(signature, parameters);
}
