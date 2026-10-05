import { IsIn, IsISO8601, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import FormData from 'form-data';
import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Req, Res, UploadedFiles, UseBefore } from 'routing-controllers';
import { OpenAPI } from 'routing-controllers-openapi';

import { MUNICIPALITY_ID, SUPPORTMANAGEMENT_NAMESPACE } from '@/config';
import { apiServiceName } from '@/config/api-config';
import { AttachmentPurpose, ErrandAttachment, Statement } from '@/data-contracts/supportmanagement/data-contracts';
import { HttpException } from '@/exceptions/HttpException';
import { RequestWithUser } from '@/interfaces/auth.interface';
import authMiddleware from '@/middlewares/auth.middleware';
import { hasPermissions } from '@/middlewares/permissions.middleware';
import { validationMiddleware } from '@/middlewares/validation.middleware';
import ApiService from '@/services/api.service';
import { fileUploadOptions } from '@/utils/fileUploadOptions';
import { apiURL } from '@/utils/util';

const DRAFT_STATUS = 'DRAFT';
const STATUSES = [DRAFT_STATUS, 'ACTIVE', 'COMPLETED', 'CANCELLED'];
const PURPOSE_PATTERN = /^[A-Z_]+_(REQUEST|RESPONSE)$/;

/** Support Management names the attachment it created in the Location header, so nothing has to be guessed. */
const attachmentIdOfLocation = (location: string | undefined): string | undefined => {
  const last = location && new URL(location, 'http://unused').pathname.split('/').filter(Boolean).pop();
  return last ? decodeURIComponent(last) : undefined;
};

class SupportStatementFieldsDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  counterpartyName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  counterpartyExternalId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  counterpartyExternalIdType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  counterpartyReference?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(65535)
  question?: string;

  @IsOptional()
  @IsString()
  @MaxLength(65535)
  responseText?: string;

  @IsOptional()
  @IsISO8601()
  dueAt?: string;

  @IsOptional()
  @IsISO8601()
  sentAt?: string;

  @IsOptional()
  @IsISO8601()
  respondedAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  outcome?: string;
}

export class CreateSupportStatementDto extends SupportStatementFieldsDto {
  @IsOptional()
  @IsString()
  @MaxLength(128)
  type?: string;
}

export class UpdateSupportStatementDto extends SupportStatementFieldsDto {
  @IsOptional()
  @IsIn(STATUSES)
  status?: string;
}

export class StatementAttachmentDto {
  @IsString()
  @MinLength(1)
  @Matches(PURPOSE_PATTERN)
  purpose!: string;
}

@Controller()
export class SupportStatementController {
  private readonly apiService = new ApiService();
  private readonly namespace = SUPPORTMANAGEMENT_NAMESPACE;
  private readonly SERVICE = apiServiceName('supportmanagement');

  private readonly statementsUrl = (municipalityId: string, errandId: string): string =>
    `${municipalityId}/${this.namespace}/errands/${errandId}/statements`;

  private async readStatements(municipalityId: string, errandId: string, user: RequestWithUser['user']): Promise<Statement[]> {
    const res = await this.apiService.get<Statement[]>(
      { url: this.statementsUrl(municipalityId, errandId), baseURL: apiURL(this.SERVICE), propagateClientError: true },
      user,
    );
    return res.data ?? [];
  }

  private async readStatement(municipalityId: string, errandId: string, statementId: string, user: RequestWithUser['user']): Promise<Statement> {
    const res = await this.apiService.get<Statement>(
      {
        url: `${this.statementsUrl(municipalityId, errandId)}/${statementId}`,
        baseURL: apiURL(this.SERVICE),
        propagateClientError: true,
      },
      user,
    );
    return res.data;
  }

  /**
   * The id the namespace has given a purpose. A purpose is written by id while the caller knows it by
   * name, so the two are matched here rather than in every caller.
   */
  private async purposeId(municipalityId: string, name: string, user: RequestWithUser['user']): Promise<string> {
    const res = await this.apiService.get<AttachmentPurpose[]>(
      {
        url: `${municipalityId}/${this.namespace}/metadata/attachmentpurposes`,
        baseURL: apiURL(this.SERVICE),
        propagateClientError: true,
      },
      user,
    );
    const purpose = (res.data ?? []).find(candidate => candidate.name === name);
    if (!purpose?.id) {
      throw new HttpException(502, `The namespace has no attachment purpose named ${name}`);
    }
    return purpose.id;
  }

  @Get('/supportstatements/:municipalityId/:id')
  @OpenAPI({ summary: 'Get the statements of a support errand' })
  @UseBefore(authMiddleware)
  async fetchStatements(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Param('municipalityId') municipalityId: string,
    @Res() response: any,
  ): Promise<any> {
    if (municipalityId !== MUNICIPALITY_ID) {
      return response.status(400).send('Invalid municipality id');
    }
    return response.status(200).send(await this.readStatements(municipalityId, id, req.user));
  }

  @Post('/supportstatements/:municipalityId/:id')
  @HttpCode(201)
  @OpenAPI({ summary: 'Start a statement on a support errand' })
  @UseBefore(authMiddleware, hasPermissions(['canEditSupportManagement']), validationMiddleware(CreateSupportStatementDto, 'body'))
  async createStatement(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Param('municipalityId') municipalityId: string,
    @Body() data: CreateSupportStatementDto,
    @Res() response: any,
  ): Promise<any> {
    if (municipalityId !== MUNICIPALITY_ID) {
      return response.status(400).send('Invalid municipality id');
    }

    const res = await this.apiService.post<Statement, Statement>(
      {
        url: this.statementsUrl(municipalityId, id),
        baseURL: apiURL(this.SERVICE),
        data: { ...data, status: DRAFT_STATUS },
        propagateClientError: true,
      },
      req.user,
    );
    return response.status(201).send(res.data);
  }

  @Patch('/supportstatements/:municipalityId/:id/:statementId')
  @OpenAPI({ summary: 'Update a statement of a support errand' })
  @UseBefore(authMiddleware, hasPermissions(['canEditSupportManagement']), validationMiddleware(UpdateSupportStatementDto, 'body'))
  async updateStatement(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Param('municipalityId') municipalityId: string,
    @Param('statementId') statementId: string,
    @Body() data: UpdateSupportStatementDto,
    @Res() response: any,
  ): Promise<any> {
    if (municipalityId !== MUNICIPALITY_ID) {
      return response.status(400).send('Invalid municipality id');
    }

    const res = await this.apiService.patch<Statement, UpdateSupportStatementDto>(
      {
        url: `${this.statementsUrl(municipalityId, id)}/${statementId}`,
        baseURL: apiURL(this.SERVICE),
        data,
        propagateClientError: true,
      },
      req.user,
    );
    return response.status(200).send(res.data);
  }

  @Delete('/supportstatements/:municipalityId/:id/:statementId')
  @OpenAPI({ summary: 'Delete a statement of a support errand' })
  @UseBefore(authMiddleware, hasPermissions(['canEditSupportManagement']))
  async deleteStatement(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Param('municipalityId') municipalityId: string,
    @Param('statementId') statementId: string,
    @Res() response: any,
  ): Promise<any> {
    if (municipalityId !== MUNICIPALITY_ID) {
      return response.status(400).send('Invalid municipality id');
    }

    await this.apiService.delete<void>(
      {
        url: `${this.statementsUrl(municipalityId, id)}/${statementId}`,
        baseURL: apiURL(this.SERVICE),
        propagateClientError: true,
      },
      req.user,
    );
    return response.status(204).send();
  }

  /**
   * Stores the file as an attachment of the errand, links it to the statement and marks what it is for.
   * The purpose belongs to the attachment rather than to the link and is written in a second call,
   * since Support Management takes no purpose while the file is being uploaded.
   */
  @Post('/supportstatements/:municipalityId/:id/:statementId/attachments')
  @HttpCode(201)
  @OpenAPI({ summary: 'Upload a file as an attachment of the errand, linked to the statement' })
  @UseBefore(authMiddleware, hasPermissions(['canEditSupportManagement']))
  async uploadStatementAttachment(
    @Req() req: RequestWithUser,
    @UploadedFiles('files', { options: fileUploadOptions, required: true }) files: Express.Multer.File[],
    @Param('id') id: string,
    @Param('municipalityId') municipalityId: string,
    @Param('statementId') statementId: string,
    @Body() data: Partial<StatementAttachmentDto>,
    @Res() response: any,
  ): Promise<any> {
    if (municipalityId !== MUNICIPALITY_ID) {
      return response.status(400).send('Invalid municipality id');
    }
    const [file] = files ?? [];
    if (!file) {
      throw new HttpException(400, 'A file is required');
    }
    if (!data.purpose || !PURPOSE_PATTERN.test(data.purpose)) {
      throw new HttpException(400, 'A known attachment purpose is required');
    }

    const baseURL = apiURL(this.SERVICE);
    const form = new FormData();
    form.append('attachment', file.buffer, { filename: file.originalname });

    const created = await this.apiService.post<void, FormData>(
      {
        url: `${this.statementsUrl(municipalityId, id)}/${statementId}/attachments`,
        baseURL,
        data: form,
        headers: { 'Content-Type': form.getHeaders()['content-type'] },
        followLocation: false,
        propagateClientError: true,
      },
      req.user,
    );

    const attachmentId = attachmentIdOfLocation(created.location);
    if (!attachmentId) {
      throw new HttpException(502, 'Support Management did not say which attachment it created');
    }

    await this.apiService.patch<ErrandAttachment, { purpose: { id: string } }>(
      {
        url: `${municipalityId}/${this.namespace}/errands/${id}/attachments/${attachmentId}`,
        baseURL,
        data: { purpose: { id: await this.purposeId(municipalityId, data.purpose, req.user) } },
        propagateClientError: true,
      },
      req.user,
    );

    return response.status(201).send(await this.readStatement(municipalityId, id, statementId, req.user));
  }

  @Delete('/supportstatements/:municipalityId/:id/:statementId/attachments/:attachmentId')
  @OpenAPI({ summary: 'Unlink an attachment from the statement, leaving it on the errand' })
  @UseBefore(authMiddleware, hasPermissions(['canEditSupportManagement']))
  async unlinkStatementAttachment(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Param('municipalityId') municipalityId: string,
    @Param('statementId') statementId: string,
    @Param('attachmentId') attachmentId: string,
    @Res() response: any,
  ): Promise<any> {
    if (municipalityId !== MUNICIPALITY_ID) {
      return response.status(400).send('Invalid municipality id');
    }

    await this.apiService.delete<void>(
      {
        url: `${this.statementsUrl(municipalityId, id)}/${statementId}/attachments/${attachmentId}`,
        baseURL: apiURL(this.SERVICE),
        propagateClientError: true,
      },
      req.user,
    );
    return response.status(204).send();
  }
}
