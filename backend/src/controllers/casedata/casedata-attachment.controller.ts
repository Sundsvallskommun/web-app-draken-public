import { Attachment, CreateAttachmentDto } from '@interfaces/attachment.interface';
import { RequestWithUser } from '@interfaces/auth.interface';
import authMiddleware from '@middlewares/auth.middleware';
import ApiService from '@services/api.service';
import { getAttachmentAsBase64 } from '@services/casedata-attachment.service';
import { fileUploadOptions } from '@utils/fileUploadOptions';
import { validateRequestBody } from '@utils/validate';
import FormData from 'form-data';
import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Req, Res, UploadedFiles, UseBefore } from 'routing-controllers';
import { OpenAPI } from 'routing-controllers-openapi';

import { CASEDATA_NAMESPACE } from '@/config';
import { apiServiceName } from '@/config/api-config';
import { AttachmentChannelEnum, Errand as ErrandDTO } from '@/data-contracts/case-data/data-contracts';
import { logger } from '@/utils/logger';
import { apiURL } from '@/utils/util';

interface ResponseData<T> {
  data: T;
  message: string;
}

@Controller()
export class CaseDataAttachmentController {
  private apiService = new ApiService();
  SERVICE = apiServiceName('case-data');

  @Post('/casedata/:municipalityId/errands/:errandId/attachments')
  @HttpCode(201)
  @OpenAPI({ summary: 'Add an attachment to an errand by errand number' })
  @UseBefore(authMiddleware)
  async newAttachment(
    @Req() req: RequestWithUser,
    @Param('errandId') errandId: number,
    @Param('municipalityId') municipalityId: string,
    @UploadedFiles('files', { options: fileUploadOptions, required: false }) files: Express.Multer.File[],
    @Body() attachmentData: CreateAttachmentDto,
  ): Promise<{ data: ErrandDTO; message: string }> {
    await validateRequestBody(CreateAttachmentDto, attachmentData);
    const baseURL = apiURL(this.SERVICE);

    const url = `${municipalityId}/${CASEDATA_NAMESPACE}/errands/${errandId}/attachments`;
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
      logger.error('Trying to save attachment without name or data');
      throw new Error('File missing');
    }
    const response = await this.apiService
      .post<ErrandDTO, FormData>({ url, baseURL, data, headers: { 'Content-Type': data.getHeaders()['content-type'] } }, req.user)
      .catch(e => {
        logger.error('Attachment post error:', e);
        throw e;
      });
    return { data: response.data, message: `Attachment created on errand ${attachmentData.errandNumber}` };
  }

  @Patch('/casedata/:municipalityId/errands/:errandId/attachments/:id')
  @OpenAPI({ summary: 'Save a modified existing attachment' })
  @UseBefore(authMiddleware)
  async patchAttachment(
    @Req() req: RequestWithUser,
    @Param('errandId') errandId: number,
    @Param('municipalityId') municipalityId: string,
    @Param('id') attachmentId: number,
    @Body() attachmentData: Partial<Attachment>,
  ): Promise<ResponseData<string>> {
    if (!attachmentId) {
      throw 'Id not found. Cannot patch attachment without id.';
    }
    const url = `${municipalityId}/${CASEDATA_NAMESPACE}/errands/${errandId}/attachments/${attachmentId}`;
    const baseURL = apiURL(this.SERVICE);
    await this.apiService.patch<any, Partial<Attachment>>({ url, baseURL, data: attachmentData }, req.user);
    return { data: 'ok', message: 'success' } as ResponseData<string>;
  }

  @Get('/casedata/:municipalityId/errands/:errandId/attachments/:id')
  @OpenAPI({ summary: 'Return an attachment by id' })
  @UseBefore(authMiddleware)
  async attachment(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Param('errandId') errandId: string,
    @Param('municipalityId') municipalityId: string,
    @Res() response: any,
  ): Promise<any> {
    const b64 = await getAttachmentAsBase64(municipalityId, errandId, id, req.user);
    return response.type('text/plain').send(b64);
  }

  @Get('/casedata/:municipalityId/errand/:errandId/attachments')
  @OpenAPI({ summary: 'Return attachments for an errand by errand id' })
  @UseBefore(authMiddleware)
  async errandAttachments(
    @Req() req: RequestWithUser,
    @Param('errandId') errandId: string,
    @Param('municipalityId') municipalityId: string,
    @Res() _response: any,
  ): Promise<ResponseData<Attachment[]>> {
    const url = `${municipalityId}/${CASEDATA_NAMESPACE}/errands/${errandId}/attachments`;
    const baseURL = apiURL(this.SERVICE);
    const res = await this.apiService.get<Attachment[]>({ url, baseURL }, req.user).catch(e => {
      if (e.status === 404) {
        logger.error('Attachments not found (404) so returning empty list instead');
        return { data: [] };
      } else {
        logger.error('Error response when fetching attachments: ', e);
        throw e;
      }
    });
    return { data: res.data, message: 'success' } as ResponseData<Attachment[]>;
  }

  @Delete('/casedata/:municipalityId/errands/:errandId/attachments/:attachmentId')
  @HttpCode(201)
  @OpenAPI({ summary: 'Remove an attachment by id' })
  @UseBefore(authMiddleware)
  async removeAttachment(
    @Req() req: RequestWithUser,
    @Param('municipalityId') municipalityId: string,
    @Param('errandId') errandId: string,
    @Param('attachmentId') attachmentId: number,
  ): Promise<{ data: ErrandDTO; message: string }> {
    const url = `${municipalityId}/${CASEDATA_NAMESPACE}/errands/${errandId}/attachments/${attachmentId}`;
    const baseURL = apiURL(this.SERVICE);
    logger.info('Removing attachment:', attachmentId, 'from', baseURL, 'url:', url);
    // TODO validate action but we need errandId for that
    const response = await this.apiService.delete<ErrandDTO>({ url, baseURL }, req.user).catch(e => {
      logger.error('Something went wrong when deleting attachment');
      logger.error(e);
      throw e;
    });
    return { data: response.data, message: `Attachment ${attachmentId} removed` };
  }

  @Get('/casedata/:municipalityId/errand/:errandId/messages/:messageId/attachments/:attachmentId')
  @OpenAPI({ summary: 'Return attachment for a message by errand id and message id' })
  @UseBefore(authMiddleware)
  async messageAttachments(
    @Req() req: RequestWithUser,
    @Param('errandId') errandId: number,
    @Param('messageId') messageId: string,
    @Param('attachmentId') attachmentId: string,
    @Param('municipalityId') municipalityId: string,
    @Res() _response: any,
  ): Promise<ResponseData<string>> {
    if (!errandId) {
      throw Error('ErrandId not found');
    }
    if (!attachmentId) {
      throw Error('AttachmentId not found');
    }

    const url = `${municipalityId}/${CASEDATA_NAMESPACE}/errands/${errandId}/messages/${messageId}/attachments/${attachmentId}`;
    const baseURL = apiURL(this.SERVICE);
    const res = await this.apiService.get<ArrayBuffer>({ url, baseURL, responseType: 'arraybuffer' }, req.user).catch(e => {
      logger.error('Something went wrong when fetching attachment');
      logger.error(e);
      throw e;
    });

    const b64 = Buffer.from(res.data).toString('base64');

    return { data: b64, message: 'good' };
  }
}
