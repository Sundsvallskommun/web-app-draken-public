import { SUPPORTMANAGEMENT_NAMESPACE } from '@/config';
import { Communication, EmailRequest, SmsRequest, WebMessageRequest } from '@/data-contracts/supportmanagement/data-contracts';
import { HttpException } from '@/exceptions/HttpException';
import { RequestWithUser } from '@/interfaces/auth.interface';
import authMiddleware from '@/middlewares/auth.middleware';
import ApiService from '@/services/api.service';
import { validateSupportAction } from '@/services/support-errand.service';
import { fileUploadOptions } from '@/utils/fileUploadOptions';
import { logger } from '@/utils/logger';
import { validateRequestBody } from '@/utils/validate';
import { IsNotEmpty, IsOptional, IsString, ValidateIf } from 'class-validator';
import { Body, Controller, Get, HttpCode, Param, Post, Put, Req, Res, UploadedFiles, UseBefore } from 'routing-controllers';
import { OpenAPI } from 'routing-controllers-openapi';
import { v4 as uuidv4 } from 'uuid';

export interface SupportAttachment {
  id: string;
  fileName: string;
  mimeType: string;
}

export interface SingleSupportAttachment {
  errandAttachmentHeader: {
    id: string;
    fileName: string;
    mimeType: string;
  };
  base64EncodedString: string;
}

class SupportMessageDto {
  @IsString()
  @IsNotEmpty()
  contactMeans: string;
  @IsString()
  @IsNotEmpty()
  @ValidateIf(o => o.contactMeans === 'email')
  recipientEmail: string;
  @IsString()
  @IsNotEmpty()
  @ValidateIf(o => o.contactMeans === 'sms')
  recipientPhone: string;
  @IsString()
  plaintextMessage: string;
  @IsString()
  htmlMessage: string;
  @IsString()
  @IsOptional()
  senderName: string;
  @IsString()
  subject: string;
  @IsOptional()
  files: Express.Multer.File[];
  @IsString()
  reply_to: string;
  @IsString()
  references: string;
  @IsOptional()
  attachmentIds: string[];
}

export const generateMessageId = () => `<${uuidv4()}@CONTACTCENTER>`;

@Controller()
export class SupportMessageController {
  private apiService = new ApiService();
  private namespace = SUPPORTMANAGEMENT_NAMESPACE;
  private SERVICE = `supportmanagement/9.0`;

  @Post('/supportmessage/:municipalityId/:id')
  @HttpCode(201)
  @OpenAPI({ summary: 'Send a support message' })
  @UseBefore(authMiddleware)
  // @UseBefore(authMiddleware, validationMiddleware(SupportMessageDto, 'body'))
  async sendSupportMessage(
    @Req() req: RequestWithUser,
    @UploadedFiles('files', { options: fileUploadOptions, required: false }) files: Express.Multer.File[],
    @Param('id') id: string,
    @Param('municipalityId') municipalityId: string,
    @Body() messageDto: SupportMessageDto,
    @Res() response: any,
  ): Promise<{ data: any; message: string }> {
    const allowed = await validateSupportAction(municipalityId, id.toString(), req.user);
    if (!allowed) {
      throw new HttpException(403, 'Forbidden');
    }
    if (!municipalityId) {
      console.error('No municipality id found, needed to send message.');
      logger.error('No municipality id found, needed to send message.');
      return response.status(400).send('Municipality id missing');
    }
    await validateRequestBody(SupportMessageDto, messageDto);
    let url = `${this.SERVICE}/${municipalityId}/${this.namespace}/errands/${id}/communication`;
    let body: SmsRequest | EmailRequest | WebMessageRequest;
    const MESSAGE_ID = generateMessageId();
    const emailHeaders = {
      MESSAGE_ID: [MESSAGE_ID],
      ...(messageDto.reply_to !== '' && { IN_REPLY_TO: [messageDto.reply_to] }),
      ...(messageDto.references !== '' && { REFERENCES: messageDto.references.split(',') }),
    };
    if (messageDto.contactMeans === 'email') {
      url += '/email';
      body = {
        sender: process.env.SUPPORTMANAGEMENT_SENDER_EMAIL,
        recipient: messageDto.recipientEmail,
        message: messageDto.plaintextMessage,
        htmlMessage: messageDto.htmlMessage,
        senderName: messageDto.senderName,
        subject: messageDto.subject,
        attachments: files.map(file => ({
          name: file.originalname,
          base64EncodedString: file.buffer.toString('base64'),
        })),
        emailHeaders,
        attachmentIds: messageDto.attachmentIds || [],
      } as EmailRequest;
    } else if (messageDto.contactMeans === 'sms') {
      url += '/sms';
      body = {
        sender: process.env.SUPPORTMANAGEMENT_SENDER_SMS,
        recipient: messageDto.recipientPhone,
        message: messageDto.plaintextMessage,
      } as SmsRequest;
    } else if (messageDto.contactMeans === 'webmessage') {
      url += '/webmessage';
      const requestBody: WebMessageRequest = {
        message: messageDto.plaintextMessage,
        attachments: files.map(file => ({
          name: file.originalname,
          base64EncodedString: file.buffer.toString('base64'),
        })),
        attachmentIds: messageDto.attachmentIds || [],
      } as WebMessageRequest;
      body = requestBody;
    } else {
      logger.error('Trying to send message without means of contact specified');
      throw new Error('Means of contact missing, but be email or sms');
    }
    console.log('Sending message: ', body);
    console.log('Sending message to: ', url);
    const res = await this.apiService
      .post<any, Partial<SmsRequest | EmailRequest | WebMessageRequest>>({ url, data: body }, req.user)
      .then(async res => {
        return res.data;
      })
      .catch(e => {
        logger.error('Error when sending support message');
        logger.error(e);
        throw e;
      });
    return response.status(200).send(res.data);
  }

  @Get('/supportmessage/:municipalityId/errands/:id/communication')
  @OpenAPI({ summary: 'Get errand messages' })
  @UseBefore(authMiddleware)
  async fetchSupportMessages(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Param('municipalityId') municipalityId: string,
    @Res() response: any,
  ): Promise<Communication[]> {
    const url = `${this.SERVICE}/${municipalityId}/${this.namespace}/errands/${id}/communication`;
    const res = await this.apiService.get<Communication[]>({ url }, req.user);
    return response.status(200).send(res.data);
  }

  @Put('/supportmessage/:municipalityId/errands/:id/communication/:communicationID/viewed/:isViewed')
  @OpenAPI({ summary: 'Set viewed status' })
  @UseBefore(authMiddleware)
  async setMessageViewedStatus(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Param('municipalityId') municipalityId: string,
    @Param('communicationID') communicationID: string,
    @Param('isViewed') isViewed: boolean,
    @Res() response: Communication[],
  ): Promise<{ data: Communication[]; message: string }> {
    const allowed = await validateSupportAction(municipalityId, id.toString(), req.user);
    if (!allowed) {
      throw new HttpException(403, 'Forbidden');
    }
    const url = `${this.SERVICE}/${municipalityId}/${this.namespace}/errands/${id}/communication/${communicationID}/viewed/${isViewed}`;
    const res = await this.apiService.put<any, any>({ url }, req.user);
    return { data: res.data, message: 'success' };
  }
}
