import { RequestWithUser } from '@interfaces/auth.interface';
import { validationMiddleware } from '@middlewares/validation.middleware';
import ApiService from '@services/api.service';
import authMiddleware from '@middlewares/auth.middleware';
import { IsObject, IsOptional, IsString } from 'class-validator';
import { Body, Controller, Get, HttpCode, Param, Post, Req, Res, UseBefore } from 'routing-controllers';
import { OpenAPI } from 'routing-controllers-openapi';
import { CASEDATA_NAMESPACE, MUNICIPALITY_ID, SUPPORTMANAGEMENT_NAMESPACE } from '@/config';
import { apiServiceName } from '@/config/api-config';
import { hasPermissions } from '@/middlewares/permissions.middleware';

interface ResponseData {
  data: any;
  message: string;
}

class TemplateSelector {
  @IsString()
  @IsOptional()
  identifier: string;
  @IsString()
  @IsOptional()
  content: string;
  @IsObject()
  @IsOptional()
  parameters: { [key: string]: string } | { [key: string]: Object };
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
  version: string;
}

@Controller()
export class TemplateController {
  private apiService = new ApiService();
  SERVICE = apiServiceName('templating');

  @Post('/templates/phrases')
  @OpenAPI({ summary: 'Fetch phrases for decision' })
  @UseBefore(authMiddleware)
  async templatePhrases(@Req() req: RequestWithUser, @Body() templateSelector: TemplateSelector): Promise<ResponseData> {
    const url = `${this.SERVICE}/${MUNICIPALITY_ID}/templates/${templateSelector.identifier}`;
    const res = await this.apiService.get<Template>({ url }, req.user);
    return { data: res.data, message: 'success' } as ResponseData;
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

  @Get('/templates/:identifier')
  @OpenAPI({ summary: 'Get the latest version of a template by identifier, including content' })
  @UseBefore(authMiddleware)
  async GetTemplateUsingIdentifier(@Param('identifier') identifier: string, @Req() req: RequestWithUser): Promise<ResponseData> {
    try {
      const url = `${this.SERVICE}/${MUNICIPALITY_ID}/templates/${identifier}`;
      const res = await this.apiService.get<Template>({ url }, req.user);

      let decodedContent = res.data.content;
      if (decodedContent && typeof decodedContent === 'string') {
        decodedContent = Buffer.from(decodedContent, 'base64').toString();
      }

      return {
        data: {
          ...res.data,
          content: decodedContent,
          metadata: JSON.stringify(res.data.metadata, null, 2),
          defaultValues: JSON.stringify(res.data.defaultValues, null, 2),
        },
        message: 'success',
      } as ResponseData;
    } catch (error: any) {
      console.error('Error fetching template:', error);

      // Returnera ett standardiserat fel
      return {
        data: null,
        message: error?.message || 'Failed to fetch template',
        error: true,
      } as ResponseData;
    }
  }

  @Get('/templatessearch')
  @OpenAPI({ summary: 'Get the latest version of at template by identifier, including content' })
  @UseBefore(authMiddleware)
  async GetAllTemplates(@Req() req: RequestWithUser): Promise<ResponseData> {
    const url = `${this.SERVICE}/${MUNICIPALITY_ID}/templates/search`;
    const res = await this.apiService.post<Template[], any>(
      {
        url,
        data: {
          and: [
            { eq: { application: 'draken' } },
            { or: [{ eq: { namespace: CASEDATA_NAMESPACE } }, { eq: { namespace: SUPPORTMANAGEMENT_NAMESPACE } }] },
          ],
        },
      },
      req.user,
    );

    const templates = res.data;
    const latestTemplates = Object.values(
      templates.reduce((acc, template) => {
        const key = template.identifier ?? template.name;
        const existing = acc[key];

        if (!existing) {
          acc[key] = template;
          return acc;
        }

        const [majorNew, minorNew] = template.version.split('.').map(Number);
        const [majorOld, minorOld] = existing.version.split('.').map(Number);

        const isNewer = majorNew > majorOld || (majorNew === majorOld && minorNew > minorOld);

        if (isNewer) {
          acc[key] = template;
        }

        return acc;
      }, {} as Record<string, Template>),
    );

    const data = latestTemplates.map((template, idx) => ({
      ...template,
      id: idx + 1,
    }));

    return { data, message: 'success' } as ResponseData;
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
  async PreviewDirectPdf(@Req() req: RequestWithUser, @Body() templateSelector: TemplateSelector): Promise<{ data: PdfRender; message: string }> {
    const url = `${this.SERVICE}/${MUNICIPALITY_ID}/render/direct/pdf`;
    const response = await this.apiService.post<PdfRender, TemplateSelector>({ url, data: templateSelector }, req.user).catch(e => {
      throw e;
    });
    return { data: response.data, message: `Decision PDF rendered` } as ResponseData;
  }

  @Post('/templates')
  @HttpCode(201)
  @OpenAPI({ summary: 'Store a template' })
  @UseBefore(authMiddleware, hasPermissions(['canUseAdminPanel']))
  async decisionPreviewDirectPdf(@Req() req: RequestWithUser, @Body() template: Template): Promise<{ data: PdfRender; message: string }> {
    const url = `${this.SERVICE}/${MUNICIPALITY_ID}/templates`;

    let parsedMetadata = template.metadata;
    let parsedDefaultValues = template.defaultValues;
    try {
      if (typeof parsedMetadata === 'string') {
        parsedMetadata = JSON.parse(parsedMetadata);
      }
      if (typeof parsedDefaultValues === 'string') {
        parsedDefaultValues = JSON.parse(parsedDefaultValues);
      }
    } catch {}

    const encodedTemplate = {
      ...template,
      metadata: parsedMetadata,
      defaultValues: parsedDefaultValues,
      content: typeof template.content === 'string' ? Buffer.from(template.content, 'utf-8').toString('base64') : template.content,
    };

    const response = await this.apiService.post<Template, Template>({ url, data: encodedTemplate }, req.user).catch(e => {
      throw e;
    });

    const data = {
      ...response.data,
      content: template.content,
    };
    return { data: data, message: `Decision PDF rendered` } as ResponseData;
  }
}
