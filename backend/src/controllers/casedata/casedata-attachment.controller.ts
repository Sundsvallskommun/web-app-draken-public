import { Errand as ErrandDTO } from '@/data-contracts/case-data/data-contracts';
import { logger } from '@/utils/logger';
import { apiURL } from '@/utils/util';
import { Attachment, CreateAttachmentDto } from '@interfaces/attachment.interface';
import { RequestWithUser } from '@interfaces/auth.interface';
import authMiddleware from '@middlewares/auth.middleware';
import ApiService from '@services/api.service';
import { fileUploadOptions } from '@utils/fileUploadOptions';
import { validateRequestBody } from '@utils/validate';
import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put, Req, Res, UploadedFiles, UseBefore } from 'routing-controllers';
import { OpenAPI } from 'routing-controllers-openapi';

interface ResponseData {
  data: any;
  message: string;
}

@Controller()
export class CaseDataAttachmentController {
  private apiService = new ApiService();
  SERVICE = `case-data/8.0`;

  @Post('/casedata/:municipalityId/attachments')
  @HttpCode(201)
  @OpenAPI({ summary: 'Add an attachment to an errand by errand number' })
  @UseBefore(authMiddleware)
  async newAttachment(
    @Req() req: RequestWithUser,
    @Param('municipalityId') municipalityId: string,
    @UploadedFiles('files', { options: fileUploadOptions, required: false }) files: Express.Multer.File[],
    @Body() attachmentData: CreateAttachmentDto,
  ): Promise<{ data: ErrandDTO; message: string }> {
    await validateRequestBody(CreateAttachmentDto, attachmentData);
    const baseURL = apiURL(this.SERVICE);

    const url = `${municipalityId}/attachments`;
    const data: CreateAttachmentDto = {
      file: files[0].buffer.toString('base64'),
      category: attachmentData.category,
      extension: attachmentData.extension,
      mimeType: attachmentData.mimeType,
      name: attachmentData.name,
      note: attachmentData.note,
      errandNumber: attachmentData.errandNumber,
    };
    const response = await this.apiService.post<ErrandDTO, CreateAttachmentDto>({ url, baseURL, data }, req.user).catch(e => {
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
  ): Promise<ResponseData> {
    if (!attachmentId) {
      throw 'Id not found. Cannot patch attachment without id.';
    }
    const url = `${municipalityId}/attachments/${attachmentId}`;
    const baseURL = apiURL(this.SERVICE);
    const res = await this.apiService.patch<any, Partial<Attachment>>({ url, baseURL, data: attachmentData }, req.user);
    return { data: 'ok', message: 'success' } as ResponseData;
  }

  @Put('/casedata/:municipalityId/errands/:errandId/attachments/:id')
  @OpenAPI({ summary: 'Save a modified existing attachment' })
  @UseBefore(authMiddleware)
  async putAttachment(
    @Req() req: RequestWithUser,
    @Param('errandId') errandId: number,
    @Param('municipalityId') municipalityId: string,
    @Param('id') attachmentId: number,
    @UploadedFiles('files', { options: fileUploadOptions, required: false }) files: Express.Multer.File[],
    @Body() attachmentData: Attachment,
  ): Promise<ResponseData> {
    await validateRequestBody(Attachment, attachmentData);
    if (!attachmentId) {
      throw 'Id not found. Cannot replace attachment without id.';
    }

    const url = `${municipalityId}/attachments/${attachmentId}`;
    const baseURL = apiURL(this.SERVICE);
    const data: Attachment = {
      id: attachmentId,
      file: files[0].buffer.toString('base64'),
      extraParameters: {},
      category: attachmentData.category,
      extension: attachmentData.extension,
      mimeType: attachmentData.mimeType,
      name: attachmentData.name,
      note: attachmentData.note,
    };
    const res = await this.apiService.put<any, Attachment>({ url, baseURL, data }, req.user);
    return { data: 'ok', message: 'success' } as ResponseData;
  }

  @Get('/casedata/:municipalityId/attachments/:id')
  @OpenAPI({ summary: 'Return an attachment by id' })
  @UseBefore(authMiddleware)
  async attachment(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Param('municipalityId') municipalityId: string,
    @Res() response: any,
  ): Promise<ResponseData> {
    const url = `${municipalityId}/attachments/${id}`;
    const baseURL = apiURL(this.SERVICE);
    const res = await this.apiService.get<Attachment[]>({ url, baseURL }, req.user);
    return { data: res.data, message: 'success' } as ResponseData;
  }

  @Get('/casedata/:municipalityId/attachments/errand/:errandNumber')
  @OpenAPI({ summary: 'Return attachments for an errand by errand id' })
  @UseBefore(authMiddleware)
  async errandAttachments(
    @Req() req: RequestWithUser,
    @Param('errandNumber') errandNumber: string,
    @Param('municipalityId') municipalityId: string,
    @Res() response: any,
  ): Promise<ResponseData> {
    const url = `${municipalityId}/attachments/errand/${errandNumber}`;
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
    return { data: res.data, message: 'success' } as ResponseData;
  }

  @Delete('/casedata/:municipalityId/errands/:errandId/attachments/:attachmentId')
  @HttpCode(201)
  @OpenAPI({ summary: 'Remove an attachment by id' })
  @UseBefore(authMiddleware)
  async removeAttachment(
    @Req() req: RequestWithUser,
    @Param('municipalityId') municipalityId: string,
    @Param('attachmentId') attachmentId: number,
  ): Promise<{ data: ErrandDTO; message: string }> {
    const url = `${municipalityId}/attachments/${attachmentId}`;
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
}
