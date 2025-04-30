import {
  AttachmentResponse,
  Classification,
  EmailHeader,
  Errand as ErrandDTO,
  MessageResponse as IMessageResponse,
  MessageResponseDirectionEnum,
} from '@/data-contracts/case-data/data-contracts';
import {
  DigitalMailAttachment,
  DigitalMailAttachmentContentTypeEnum,
  DigitalMailRequest,
  DigitalMailRequestContentTypeEnum,
  EmailAttachment,
  EmailRequest,
  SmsRequest,
  WebMessageAttachment,
  WebMessageRequest,
} from '@/data-contracts/messaging/data-contracts';
import { HttpException } from '@/exceptions/HttpException';
import { isPT } from '@/services/application.service';
import { logger } from '@/utils/logger';
import { apiURL, base64Encode } from '@/utils/util';
import { RequestWithUser } from '@interfaces/auth.interface';
import authMiddleware from '@middlewares/auth.middleware';
import { validationMiddleware } from '@middlewares/validation.middleware';
import ApiService from '@services/api.service';
import { generateMessageId, sendDigitalMail, sendEmail, sendSms, sendWebMessage } from '@services/message.service';
import { getOwnerStakeholder, getOwnerStakeholderEmail } from '@services/stakeholder.service';
import { fileUploadOptions } from '@utils/fileUploadOptions';
import { validateRequestBody } from '@utils/validate';
import { IsArray, IsOptional, IsString, Validate, ValidateNested } from 'class-validator';
import { Body, Controller, Get, HttpCode, Param, Post, Put, Req, Res, UploadedFiles, UseBefore } from 'routing-controllers';
import { OpenAPI, ResponseSchema } from 'routing-controllers-openapi';
import { v4 as uuidv4 } from 'uuid';

export enum MessageClassification {
  'Efterfrågan komplettering' = 'COMPLETION_REQUEST',
  'Informationsmeddelande' = 'INFORMATION',
  'Hämta yttrande' = 'OBTAIN_OPINION',
  'Intern dialog' = 'INTERNAL_COMMUNICATION',
  // 'Övrigt' = 'OTHER
}

class MessageDto {
  @IsString()
  @IsOptional()
  email: string;
  @IsString()
  @IsOptional()
  contactMeans: string;
  @IsString()
  @IsOptional()
  subject: string;
  @IsString()
  text: string;
  @IsString()
  attachUtredning: string;
  @IsString()
  errandId: string;
  @IsString()
  municipalityId: string;
  @IsString()
  messageClassification: MessageClassification;
  @IsString()
  reply_to: string;
  @IsString()
  references: string;
  @IsOptional()
  files: Express.Multer.File[];
}

class SmsDto {
  @IsString()
  phonenumber: string;
  @IsString()
  text: string;
  @IsString()
  errandId: string;
  @IsString()
  municipalityId: string;
}

class DecisionMessageDto {
  @IsString()
  errandId: string;
}

class MessageResponse implements IMessageResponse {
  @IsOptional()
  @IsString()
  messageId?: string;
  @IsOptional()
  @IsString()
  errandId?: number;
  @IsOptional()
  @IsString()
  municipalityId?: string;
  @IsOptional()
  @IsString()
  namespace?: string;
  @IsOptional()
  @IsString()
  direction?: MessageResponseDirectionEnum;
  @IsOptional()
  @IsString()
  familyId?: string;
  @IsOptional()
  @IsString()
  externalCaseId?: string;
  @IsOptional()
  @IsString()
  message?: string;
  @IsOptional()
  @IsString()
  sent?: string;
  @IsOptional()
  @IsString()
  subject?: string;
  @IsOptional()
  @IsString()
  username?: string;
  @IsOptional()
  @IsString()
  firstName?: string;
  @IsOptional()
  @IsString()
  lastName?: string;
  @IsOptional()
  @IsString()
  messageType?: string;
  @IsOptional()
  @IsString()
  mobileNumber?: string;
  @IsOptional()
  @IsArray()
  recipients?: string[];
  @IsOptional()
  @IsString()
  email?: string;
  @IsOptional()
  @IsString()
  userId?: string;
  @IsOptional()
  @IsString()
  viewed?: boolean;
  @IsOptional()
  @IsString()
  classification?: Classification;
  @IsOptional()
  @IsArray()
  attachments?: AttachmentResponse[];
  @IsOptional()
  @IsArray()
  emailHeaders?: EmailHeader[];
}

export interface AgnosticMessageResponse {
  messageId: string;
}

export interface WebMessageResponse {
  messageId: string;
  deliveries: {
    deliveryId: string;
    messageType: string;
    status: string;
  }[];
}

export interface LetterResponse {
  batchId: string;
  messages: [
    {
      messageId: string;
      deliveries: {
        deliveryId: string;
        messageType: 'DIGITAL_MAIL' | 'SNAIL_MAIL';
        status: string;
      }[];
    },
  ];
}

const MESSAGE_SUBJECT = isPT() ? 'Meddelande gällande er ansökan om parkeringstillstånd' : 'Meddelande från MEX';

@Controller()
export class MessageController {
  private apiService = new ApiService();
  SERVICE = `case-data/11.0`;
  MESSAGING_SERVICE = `messaging/7.0`;

  @Post('/casedata/:municipalityId/message/decision')
  @HttpCode(201)
  @OpenAPI({ summary: 'Send decision message through relevant channel' })
  @UseBefore(authMiddleware, validationMiddleware(DecisionMessageDto, 'body'))
  async decisionMessage(
    @Req() req: RequestWithUser,
    @Param('municipalityId') municipalityId: string,
    @Body() messageDto: { errandId: string },
  ): Promise<{ data: AgnosticMessageResponse; message: string }> {
    const errandsUrl = `${municipalityId}/${process.env.CASEDATA_NAMESPACE}/errands/${messageDto.errandId}`;
    const baseURL = apiURL(this.SERVICE);
    const errandData = await this.apiService.get<ErrandDTO>({ url: errandsUrl, baseURL }, req.user);
    const decision = errandData.data?.decisions.find(d => d.decisionType === 'FINAL');
    const pdf = decision?.attachments[0];
    if (!pdf) {
      return {
        data: {
          messageId: undefined,
        },
        message: 'No decision attachment found',
      };
    }
    if (errandData.data.externalCaseId) {
      // WEBMESSAGE
      const attachments = [
        {
          base64Data: pdf.file,
          fileName: `${pdf.name}.pdf`,
          mimeType: pdf.mimeType,
        } as WebMessageAttachment,
      ];
      const message: WebMessageRequest = {
        party: {
          partyId: getOwnerStakeholder(errandData.data).personId,
          externalReferences: [
            {
              key: 'flowInstanceId',
              value: errandData.data.externalCaseId,
            },
          ],
        },
        message: 'Beslut fattat i ärende',
        attachments,
      } as WebMessageRequest;
      return sendWebMessage(municipalityId, message, req, errandData);
    } else {
      // Digital mail (Letter endpoint)
      const owner = getOwnerStakeholder(errandData.data);
      const attachments = [
        {
          deliveryMode: 'ANY',
          contentType: DigitalMailAttachmentContentTypeEnum.ApplicationPdf,
          content: pdf.file,
          filename: `${pdf.name}.pdf`,
        } as DigitalMailAttachment,
      ];
      const message: DigitalMailRequest = {
        party: {
          partyIds: [owner?.personId],
          externalReferences: [],
        },
        sender: {
          supportInfo: {
            text: 'Sundsvalls kommun',
            emailAddress: '',
            phoneNumber: '',
            url: '',
          },
        },
        subject: MESSAGE_SUBJECT,
        contentType: DigitalMailRequestContentTypeEnum.TextPlain,
        body: 'Beslut fattat i ärende',
        department: 'SBK(Gatuavdelningen, Trafiksektionen)',
        attachments: attachments,
      };
      return sendDigitalMail(municipalityId, message, req, errandData, MessageClassification.Informationsmeddelande);
    }
  }

  @Post('/casedata/:municipalityId/sms')
  @HttpCode(201)
  @OpenAPI({ summary: 'Send sms' })
  @UseBefore(authMiddleware)
  async sms(
    @Req() req: RequestWithUser,
    @Param('municipalityId') municipalityId: string,
    @Body() smsDto: { errandId: string; municipalityId: string; phonenumber: string; text: string },
  ): Promise<{ data: AgnosticMessageResponse; message: string }> {
    await validateRequestBody(SmsDto, smsDto);
    const errandsUrl = `${smsDto.municipalityId}/${process.env.CASEDATA_NAMESPACE}/errands/${smsDto.errandId}`;
    const baseURL = apiURL(this.SERVICE);
    const errandData = await this.apiService.get<ErrandDTO>({ url: errandsUrl, baseURL }, req.user);

    const message: SmsRequest = {
      sender: process.env.CASEDATA_SENDER_SMS,
      mobileNumber: smsDto.phonenumber,
      message: smsDto.text,
    };
    return sendSms(municipalityId, message, req, errandData);
  }

  @Post('/casedata/:municipalityId/email')
  @HttpCode(201)
  @OpenAPI({ summary: 'Send email' })
  @UseBefore(authMiddleware)
  async email(
    @Req() req: RequestWithUser,
    @Param('municipalityId') municipalityId: string,
    @UploadedFiles('files', { options: fileUploadOptions, required: false }) files: Express.Multer.File[],
    @Body() messageDto: MessageDto,
  ): Promise<{ data: AgnosticMessageResponse; message: string }> {
    await validateRequestBody(MessageDto, messageDto);
    const errandsUrl = `${messageDto.municipalityId}/${process.env.CASEDATA_NAMESPACE}/errands/${messageDto.errandId}`;
    const baseURL = apiURL(this.SERVICE);
    const errandData = await this.apiService.get<ErrandDTO>({ url: errandsUrl, baseURL }, req.user);
    const MESSAGE_ID = generateMessageId();

    let recipientEmail = messageDto.email;
    if (!recipientEmail) {
      const ownerEmail = getOwnerStakeholderEmail(errandData.data);
      if (!ownerEmail || ownerEmail === '') {
        throw new HttpException(400, `Email address for applicant not found`);
      }
      recipientEmail = ownerEmail;
    }
    const attachments = files.map(file => {
      return {
        content: file.buffer.toString('base64'),
        name: file.originalname,
        contentType: file.mimetype,
      } as EmailAttachment;
    });
    const message: EmailRequest = {
      party: {
        // Fake uuid since Messaging demands one
        partyId: uuidv4(),
      },
      emailAddress: recipientEmail,
      subject: messageDto.subject || MESSAGE_SUBJECT,
      message: messageDto.text.replace(/<p><br \/><\/p>/g, ''),
      htmlMessage: base64Encode(messageDto.text.replace(/<p><br \/><\/p>/g, '')),
      attachments: attachments,
      sender: {
        name: process.env.CASEDATA_SENDER,
        address: process.env.CASEDATA_SENDER_EMAIL,
        replyTo: process.env.CASEDATA_REPLY_TO,
      },
      headers: {
        MESSAGE_ID: [MESSAGE_ID],
        ...(messageDto.reply_to !== '' && { IN_REPLY_TO: [messageDto.reply_to] }),
        ...(messageDto.references !== '' && { REFERENCES: messageDto.references.split(',') }),
      },
    } as EmailRequest;

    return sendEmail(municipalityId, message, req, errandData, MessageClassification[messageDto.messageClassification]);
  }

  @Post('/casedata/:municipalityId/webmessage')
  @HttpCode(201)
  @OpenAPI({ summary: 'Send webmessage' })
  @UseBefore(authMiddleware)
  async webmessage(
    @Req() req: RequestWithUser,
    @Param('municipalityId') municipalityId: string,
    @UploadedFiles('files', { options: fileUploadOptions, required: false }) files: Express.Multer.File[],
    @Body() messageDto: MessageDto,
  ): Promise<{ data: AgnosticMessageResponse; message: string }> {
    await validateRequestBody(MessageDto, messageDto);
    const errandsUrl = `${messageDto.municipalityId}/${process.env.CASEDATA_NAMESPACE}/errands/${messageDto.errandId}`;
    const baseURL = apiURL(this.SERVICE);
    const errandData = await this.apiService.get<ErrandDTO>({ url: errandsUrl, baseURL }, req.user);
    let url;
    let message: WebMessageRequest;
    const MESSAGE_ID = generateMessageId();
    if (errandData.data.externalCaseId) {
      url = `${this.MESSAGING_SERVICE}/${municipalityId}/webmessage`;
      const attachments = files.map(file => {
        return {
          base64Data: file.buffer.toString('base64'),
          fileName: file.originalname,
          mimeType: file.mimetype,
        } as WebMessageAttachment;
      });
      message = {
        party: {
          ...(getOwnerStakeholder(errandData.data).personId && { partyId: getOwnerStakeholder(errandData.data).personId }),
          externalReferences: [
            {
              key: 'flowInstanceId',
              value: errandData.data.externalCaseId,
            },
          ],
        },
        message: messageDto.text,
      } as WebMessageRequest;
      if (attachments.length > 0) {
        message.attachments = attachments;
      }
    }
    return sendWebMessage(municipalityId, message, req, errandData);
  }

  @Get('/casedata/:municipalityId/errand/:errandId/messages')
  @OpenAPI({ summary: 'Return all messages by errand id' })
  @UseBefore(authMiddleware)
  @ResponseSchema(MessageResponse)
  async errandMessages(
    @Req() req: RequestWithUser,
    @Param('errandId') errandId: string,
    @Param('municipalityId') municipalityId: string,
    @Res() response: IMessageResponse[],
  ): Promise<{ data: IMessageResponse[]; message: string }> {
    const url = `${municipalityId}/${process.env.CASEDATA_NAMESPACE}/errands/${errandId}/messages`;
    const baseURL = apiURL(this.SERVICE);
    const res = await this.apiService.get<IMessageResponse[]>({ url, baseURL }, req.user).catch(e => {
      logger.error('Error when fetching messages for errand: ', errandId);
      throw e;
    });
    return { data: res.data, message: 'success' };
  }

  @Put('/casedata/:municipalityId/errand/:errandId/messages/:messageId/viewed/:isViewed')
  @OpenAPI({ summary: 'Set message isViewed status' })
  @UseBefore(authMiddleware)
  async setMessageViewed(
    @Req() req: RequestWithUser,
    @Param('errandId') errandId: string,
    @Param('messageId') messageId: string,
    @Param('municipalityId') municipalityId: string,
    @Param('isViewed') isViewed: boolean,
    @Res() response: IMessageResponse[],
  ): Promise<{ data: IMessageResponse[]; message: string }> {
    const url = `${municipalityId}/${process.env.CASEDATA_NAMESPACE}/errands/${errandId}/messages/${messageId}/viewed/${isViewed}`;
    const baseURL = apiURL(this.SERVICE);
    const res = await this.apiService.put<any, any>({ url, baseURL }, req.user);
    return { data: res.data, message: 'success' };
  }
}
