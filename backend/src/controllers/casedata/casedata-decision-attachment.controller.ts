import { Attachment, CreateAttachmentDto } from '@interfaces/attachment.interface';
import { RequestWithUser } from '@interfaces/auth.interface';
import authMiddleware from '@middlewares/auth.middleware';
import ApiService from '@services/api.service';
import { getDecisionAttachmentAsBase64 } from '@services/casedata-attachment.service';
import { fileUploadOptions } from '@utils/fileUploadOptions';
import { validateRequestBody } from '@utils/validate';
import FormData from 'form-data';
import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Req, Res, UploadedFiles, UseBefore } from 'routing-controllers';
import { OpenAPI } from 'routing-controllers-openapi';

import { CASEDATA_NAMESPACE } from '@/config';
import { apiServiceName } from '@/config/api-config';
import { AttachmentChannelEnum, Errand as ErrandDTO } from '@/data-contracts/case-data/data-contracts';
import { hasPermissions } from '@/middlewares/permissions.middleware';
import { logger } from '@/utils/logger';
import { apiURL } from '@/utils/util';

interface ResponseData<T> {
  data: T;
  message: string;
}

// Decision attachments are a dedicated CaseData sub-resource
// (errands/{errandId}/decisions/{decisionId}/attachments). They are uploaded as
// binary multipart and fetched per attachment, exactly like errand attachments -
// they cannot be embedded in the decision payload (CaseData rejects that).
@Controller()
export class CaseDataDecisionAttachmentController {
  private apiService = new ApiService();
  SERVICE = apiServiceName('case-data');

  @Post('/casedata/:municipalityId/errands/:errandId/decisions/:decisionId/attachments')
  @HttpCode(201)
  @OpenAPI({ summary: 'Add an attachment to a decision' })
  @UseBefore(authMiddleware, hasPermissions(['canEditCasedata']))
  async newDecisionAttachment(
    @Req() req: RequestWithUser,
    @Param('errandId') errandId: number,
    @Param('decisionId') decisionId: number,
    @Param('municipalityId') municipalityId: string,
    @UploadedFiles('files', { options: fileUploadOptions, required: false }) files: Express.Multer.File[],
    @Body() attachmentData: CreateAttachmentDto,
  ): Promise<{ data: ErrandDTO; message: string }> {
    await validateRequestBody(CreateAttachmentDto, attachmentData);
    const baseURL = apiURL(this.SERVICE);

    const url = `${municipalityId}/${CASEDATA_NAMESPACE}/errands/${errandId}/decisions/${decisionId}/attachments`;
    const metadata: CreateAttachmentDto = {
      category: attachmentData.category,
      extension: attachmentData.extension,
      mimeType: attachmentData.mimeType,
      name: attachmentData.name,
      note: attachmentData.note,
      errandNumber: attachmentData.errandNumber,
      channel: AttachmentChannelEnum.WEB_UI,
    };
    const data = new FormData();
    if (files && files.length > 0) {
      data.append(`file`, files[0].buffer, { filename: files[0].originalname });
      data.append('attachment', JSON.stringify(metadata));
    } else {
      logger.error('Trying to save decision attachment without name or data');
      throw new Error('File missing');
    }
    const response = await this.apiService
      .post<ErrandDTO, FormData>({ url, baseURL, data, headers: { 'Content-Type': data.getHeaders()['content-type'] } }, req.user)
      .catch(e => {
        logger.error('Decision attachment post error:', e);
        throw e;
      });
    return { data: response.data, message: `Attachment created on decision ${decisionId}` };
  }

  @Patch('/casedata/:municipalityId/errands/:errandId/decisions/:decisionId/attachments/:id')
  @OpenAPI({ summary: 'Save a modified existing decision attachment' })
  @UseBefore(authMiddleware, hasPermissions(['canEditCasedata']))
  async patchDecisionAttachment(
    @Req() req: RequestWithUser,
    @Param('errandId') errandId: number,
    @Param('decisionId') decisionId: number,
    @Param('municipalityId') municipalityId: string,
    @Param('id') attachmentId: number,
    @Body() attachmentData: Partial<Attachment>,
  ): Promise<ResponseData<string>> {
    if (!attachmentId) {
      throw 'Id not found. Cannot patch decision attachment without id.';
    }
    const url = `${municipalityId}/${CASEDATA_NAMESPACE}/errands/${errandId}/decisions/${decisionId}/attachments/${attachmentId}`;
    const baseURL = apiURL(this.SERVICE);
    await this.apiService.patch<any, Partial<Attachment>>({ url, baseURL, data: attachmentData }, req.user);
    return { data: 'ok', message: 'success' };
  }

  @Get('/casedata/:municipalityId/errands/:errandId/decisions/:decisionId/attachments/:attachmentId')
  @OpenAPI({ summary: 'Return a decision attachment by id' })
  @UseBefore(authMiddleware, hasPermissions(['canEditCasedata']))
  async decisionAttachment(
    @Req() req: RequestWithUser,
    @Param('attachmentId') attachmentId: string,
    @Param('decisionId') decisionId: string,
    @Param('errandId') errandId: string,
    @Param('municipalityId') municipalityId: string,
    @Res() response: any,
  ): Promise<any> {
    const b64 = await getDecisionAttachmentAsBase64(municipalityId, errandId, decisionId, attachmentId, req.user);
    return response.type('text/plain').send(b64);
  }

  @Delete('/casedata/:municipalityId/errands/:errandId/decisions/:decisionId/attachments/:attachmentId')
  @HttpCode(201)
  @OpenAPI({ summary: 'Remove a decision attachment by id' })
  @UseBefore(authMiddleware, hasPermissions(['canEditCasedata']))
  async removeDecisionAttachment(
    @Req() req: RequestWithUser,
    @Param('municipalityId') municipalityId: string,
    @Param('errandId') errandId: string,
    @Param('decisionId') decisionId: string,
    @Param('attachmentId') attachmentId: number,
  ): Promise<ResponseData<string>> {
    const url = `${municipalityId}/${CASEDATA_NAMESPACE}/errands/${errandId}/decisions/${decisionId}/attachments/${attachmentId}`;
    const baseURL = apiURL(this.SERVICE);
    logger.info('Removing decision attachment:', attachmentId, 'from decision', decisionId);
    await this.apiService.delete<ErrandDTO>({ url, baseURL }, req.user).catch(e => {
      logger.error('Something went wrong when deleting decision attachment');
      logger.error(e);
      throw e;
    });
    return { data: 'ok', message: `Attachment ${attachmentId} removed` };
  }
}
