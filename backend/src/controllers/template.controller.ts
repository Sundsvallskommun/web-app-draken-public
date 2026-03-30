import { CASEDATA_NAMESPACE, MUNICIPALITY_ID, SUPPORTMANAGEMENT_NAMESPACE } from '@/config';
import { apiServiceName } from '@/config/api-config';
import { DetailedTemplateResponse } from '@/data-contracts/templating/data-contracts';
import { RequestWithUser } from '@interfaces/auth.interface';
import authMiddleware from '@middlewares/auth.middleware';
import { validationMiddleware } from '@middlewares/validation.middleware';
import ApiService from '@services/api.service';
import { IsObject, IsOptional, IsString } from 'class-validator';
import { Body, Controller, Get, HttpCode, Param, Post, QueryParam, Req, UseBefore } from 'routing-controllers';
import { OpenAPI } from 'routing-controllers-openapi';

interface ResponseData {
  data: any;
  message: string;
}

const compareTemplateVersion = (a?: string, b?: string): number => {
  if (a && b) {
    return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
  }
  if (a && !b) return 1;
  if (!a && b) return -1;
  return 0;
};

const isCandidateNewer = (candidate: DetailedTemplateResponse, current: DetailedTemplateResponse): boolean => {
  const versionCompare = compareTemplateVersion(candidate.version, current.version);
  if (versionCompare !== 0) {
    return versionCompare > 0;
  }
  const candidateModified = candidate.lastModifiedAt ? new Date(candidate.lastModifiedAt).getTime() : 0;
  const currentModified = current.lastModifiedAt ? new Date(current.lastModifiedAt).getTime() : 0;
  return candidateModified > currentModified;
};

class TemplateSelector {
  @IsString()
  @IsOptional()
  identifier!: string;
  @IsString()
  @IsOptional()
  content!: string;
  @IsObject()
  @IsOptional()
  parameters!: { [key: string]: string } | { [key: string]: object };
}

interface PdfRender {
  output: string;
}

interface Template {
  identifier: string;
  name: string;
  description: string;
  metadata: [
    {
      key: string;
      value: string;
    },
  ];
  defaultValues: [
    {
      fieldName: string;
      value: string;
    },
  ];
  content: string;
}

@Controller()
export class TemplateController {
  private apiService = new ApiService();
  SERVICE = apiServiceName('templating');

  @Post('/templates/phrases')
  @OpenAPI({ summary: 'Fetch phrases for decision' })
  @UseBefore(authMiddleware)
  async templatePhrases(@Req() req: RequestWithUser, @Body() templateSelector: TemplateSelector): Promise<ResponseData> {
    const url = `${this.SERVICE}/${MUNICIPALITY_ID}/render`;
    const res = await this.apiService.post<PdfRender, TemplateSelector>({ url, data: templateSelector }, req.user).catch(e => {
      throw e;
    });
    return { data: { content: res.data.output }, message: 'success' } as ResponseData;
  }

  @Get('/templates/decision/driver/approval')
  @OpenAPI({ summary: 'Fetch template for type: decision.approved' })
  @UseBefore(authMiddleware)
  async templateDecisionDriverApproval(@Req() req: RequestWithUser): Promise<ResponseData> {
    const templateIdentifier = 'sbk.rph.decision.driver.approval';
    const url = `${this.SERVICE}/${MUNICIPALITY_ID}/templates/${templateIdentifier}`;
    const res = await this.apiService.get<Template>({ url }, req.user);
    return { data: res.data, message: 'success' } as ResponseData;
  }

  @Post('/render')
  @HttpCode(201)
  @OpenAPI({ summary: 'Render html preview of decision from stored template' })
  @UseBefore(authMiddleware, validationMiddleware(TemplateSelector, 'body'))
  async decisionPreviewHtml(@Req() req: RequestWithUser, @Body() templateSelector: TemplateSelector): Promise<{ data: PdfRender; message: string }> {
    const url = `${this.SERVICE}/${MUNICIPALITY_ID}/render`;
    const response = await this.apiService.post<PdfRender, TemplateSelector>({ url, data: templateSelector }, req.user).catch(e => {
      throw e;
    });
    return { data: response.data, message: `Decision HTML rendered` };
  }

  @Post('/render/pdf')
  @HttpCode(201)
  @OpenAPI({ summary: 'Render pdf preview of decision from stored template' })
  @UseBefore(authMiddleware, validationMiddleware(TemplateSelector, 'body'))
  async decisionPreviewPdf(@Req() req: RequestWithUser, @Body() templateSelector: TemplateSelector): Promise<{ data: PdfRender; message: string }> {
    const url = `${this.SERVICE}/${MUNICIPALITY_ID}/render/pdf`;
    const response = await this.apiService.post<PdfRender, TemplateSelector>({ url, data: templateSelector }, req.user).catch(e => {
      throw e;
    });
    return { data: response.data, message: `Decision PDF rendered` };
  }

  @Post('/render/direct/pdf')
  @HttpCode(201)
  @OpenAPI({ summary: 'Render pdf preview of decision from passed in template string' })
  @UseBefore(authMiddleware, validationMiddleware(TemplateSelector, 'body'))
  async decisionPreviewDirectPdf(
    @Req() req: RequestWithUser,
    @Body() templateSelector: TemplateSelector,
  ): Promise<{ data: PdfRender; message: string }> {
    const url = `${this.SERVICE}/${MUNICIPALITY_ID}/render/direct/pdf`;
    const response = await this.apiService.post<PdfRender, TemplateSelector>({ url, data: templateSelector }, req.user).catch(e => {
      throw e;
    });
    return { data: response.data, message: `Decision PDF rendered` };
  }

  @Get('/templates')
  @OpenAPI({ summary: 'Fetch templates by identifier prefix' })
  @UseBefore(authMiddleware)
  async getMessageTemplates(
    @Req() req: RequestWithUser,
    @QueryParam('prefix') prefix: string = '',
    @QueryParam('type') type: string = '',
    @QueryParam('excludeVariants') excludeVariants: string = '',
    @QueryParam('templateType') templateType: string = '',
    @QueryParam('excludeRoles') excludeRoles: string = '',
    @QueryParam('decision') decision: string = '',
  ): Promise<ResponseData> {
    const namespace = prefix === 'internal.' ? 'CONTACTSUNDSVALL' : CASEDATA_NAMESPACE || SUPPORTMANAGEMENT_NAMESPACE;
    const baseUrl = `${this.SERVICE}/${MUNICIPALITY_ID}/templates`;
    const searchUrl = namespace ? `${baseUrl}?namespace=${namespace}` : baseUrl;

    const searchResult = await this.apiService.get<DetailedTemplateResponse[]>({ url: searchUrl }, req.user);

    const allTemplates = searchResult.data || [];

    let filteredTemplates = prefix ? allTemplates.filter((t: DetailedTemplateResponse) => t.identifier?.startsWith(prefix)) : allTemplates;

    const effectiveType = templateType || type;
    if (effectiveType) {
      filteredTemplates = filteredTemplates.filter((t: DetailedTemplateResponse) => {
        const metadataType = getMetadataValue(t, 'templateType');
        if (metadataType) return metadataType === effectiveType;
        const parts = t.identifier?.split('.') || [];
        return parts.length >= 2 && parts[1] === effectiveType;
      });
    }

    if (decision) {
      filteredTemplates = filteredTemplates.filter((t: DetailedTemplateResponse) => {
        return t.metadata?.some((m) => m.key === 'decision' && m.value === decision);
      });
    }

    const effectiveExcludeRoles = excludeRoles || excludeVariants;
    if (effectiveExcludeRoles) {
      const excludeList = effectiveExcludeRoles.split(',').map(v => v.trim());
      filteredTemplates = filteredTemplates.filter((t: DetailedTemplateResponse) => {
        const metadataRole = getMetadataValue(t, 'templateRole');
        if (metadataRole) return !excludeList.includes(metadataRole);
        const parts = t.identifier?.split('.') || [];
        return parts.length < 3 || !excludeList.includes(parts[2]);
      });
    }

    const latestByIdentifier = new Map<string, DetailedTemplateResponse>();
    for (const t of filteredTemplates) {
      if (!t.identifier) continue;
      const existing = latestByIdentifier.get(t.identifier);
      if (!existing || isCandidateNewer(t, existing)) {
        latestByIdentifier.set(t.identifier, t);
      }
    }
    filteredTemplates = Array.from(latestByIdentifier.values());

    const templatesWithContent = await Promise.all(
      filteredTemplates.map(async (t: DetailedTemplateResponse) => {
        if (t.content) {
          return t;
        }

        const detailUrl = `${this.SERVICE}/${MUNICIPALITY_ID}/templates/${t.identifier}`;
        const detailResult = await this.apiService.get<DetailedTemplateResponse>({ url: detailUrl }, req.user);
        return detailResult.data;
      }),
    );

    return { data: templatesWithContent, message: 'success' };
  }

  @Get('/templates/:identifier')
  @OpenAPI({ summary: 'Fetch a single template by identifier' })
  @UseBefore(authMiddleware)
  async getMessageTemplate(@Req() req: RequestWithUser, @Param('identifier') identifier: string): Promise<ResponseData> {
    const url = `${this.SERVICE}/${MUNICIPALITY_ID}/templates/${identifier}`;
    const res = await this.apiService.get<DetailedTemplateResponse>({ url }, req.user);
    return { data: res.data, message: 'success' };
  }
}

function getMetadataValue(template: DetailedTemplateResponse, key: string): string | undefined {
  return template.metadata?.find((m) => m.key === key)?.value;
}
