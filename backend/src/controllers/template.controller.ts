import { RequestWithUser } from '@interfaces/auth.interface';
import { validationMiddleware } from '@middlewares/validation.middleware';
import ApiService from '@services/api.service';
import authMiddleware from '@middlewares/auth.middleware';
import { IsObject, IsOptional, IsString } from 'class-validator';
import { Body, Controller, Get, HttpCode, Post, Req, UseBefore } from 'routing-controllers';
import { OpenAPI } from 'routing-controllers-openapi';
import { MUNICIPALITY_ID } from '@/config';

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
}

@Controller()
export class TemplateController {
  private apiService = new ApiService();

  @Post('/templates/phrases')
  @OpenAPI({ summary: 'Fetch phrases for decision' })
  @UseBefore(authMiddleware)
  async templatePhrases(@Req() req: RequestWithUser, @Body() templateSelector: TemplateSelector): Promise<ResponseData> {
    const url = `templating/2.0/${MUNICIPALITY_ID}/templates/${templateSelector.identifier}`;
    const res = await this.apiService.get<Template>({ url }, req.user);
    return { data: res.data, message: 'success' } as ResponseData;
  }

  @Get('/templates/decision/driver/approval')
  @OpenAPI({ summary: 'Fetch template for type: decision.approved' })
  @UseBefore(authMiddleware)
  async templateDecisionDriverApproval(@Req() req: RequestWithUser): Promise<ResponseData> {
    const templateIdentifier = 'sbk.rph.decision.driver.approval';
    const url = `templating/2.0/${MUNICIPALITY_ID}/templates/${templateIdentifier}`;
    const res = await this.apiService.get<Template>({ url }, req.user);
    return { data: res.data, message: 'success' } as ResponseData;
  }

  @Post('/render')
  @HttpCode(201)
  @OpenAPI({ summary: 'Render html preview of decision from stored template' })
  @UseBefore(authMiddleware, validationMiddleware(TemplateSelector, 'body'))
  async decisionPreviewHtml(@Req() req: RequestWithUser, @Body() templateSelector: TemplateSelector): Promise<{ data: PdfRender; message: string }> {
    const url = `templating/2.0/${MUNICIPALITY_ID}/render`;
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
    const url = `templating/2.0/${MUNICIPALITY_ID}/render/pdf`;
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
    const url = `templating/2.0/${MUNICIPALITY_ID}/render/direct/pdf`;
    const response = await this.apiService.post<PdfRender, TemplateSelector>({ url, data: templateSelector }, req.user).catch(e => {
      throw e;
    });
    return { data: response.data, message: `Decision PDF rendered` };
  }
}
