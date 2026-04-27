import { RequestWithUser } from '@interfaces/auth.interface';
import authMiddleware from '@middlewares/auth.middleware';
import { validationMiddleware } from '@middlewares/validation.middleware';
import ApiService from '@services/api.service';
import {
  generateMessageId,
  sendDecisionToDigitalMail,
  sendDecisionToKatla,
  sendDecisionToMinaSidor,
  sendDecisionToOpenE,
  sendEmail,
  sendSms,
  sendWebMessage,
} from '@services/message.service';
import { getOwnerStakeholder, getOwnerStakeholderEmail } from '@services/stakeholder.service';
import { fileUploadOptions } from '@utils/fileUploadOptions';
import { validateRequestBody } from '@utils/validate';
import { Body, Controller, Get, HttpCode, Param, Post, Put, Req, Res, UploadedFiles, UseBefore } from 'routing-controllers';
import { OpenAPI, ResponseSchema } from 'routing-controllers-openapi';
import { v4 as uuidv4 } from 'uuid';

import { apiServiceName } from '@/config/api-config';
import { Errand as ErrandDTO, MessageResponse as IMessageResponse } from '@/data-contracts/case-data/data-contracts';
import { EmailAttachment, EmailRequest, SmsRequest, WebMessageAttachment, WebMessageRequest } from '@/data-contracts/messaging/data-contracts';
import { AgnosticMessageResponse, DecisionMessageDto, MessageClassification, MessageDto, MessageResponse, SmsDto } from '@/dtos/message.dto';
import { HttpException } from '@/exceptions/HttpException';
import { isPT } from '@/services/application.service';
import { logger } from '@/utils/logger';
import { apiURL, base64Encode } from '@/utils/util';

export { AgnosticMessageResponse, LetterResponse, MessageClassification, WebMessageResponse } from '@/dtos/message.dto';

const MESSAGE_SUBJECT = isPT() ? 'Meddelande gällande er ansökan om parkeringstillstånd' : 'Meddelande från MEX';

@Controller()
export class MessageController {
  private apiService = new ApiService();
  SERVICE = apiServiceName('case-data');

  @Post('/casedata/:municipalityId/message/decision')
  @HttpCode(201)
  @OpenAPI({ summary: 'Send decision message through relevant channel' })
  @UseBefore(authMiddleware, validationMiddleware(DecisionMessageDto, 'body'))
  async decisionMessage(
    @Req() req: RequestWithUser,
    @Param('municipalityId') municipalityId: string,
    @Body() messageDto: { errandId: string },
  ): Promise<{ data: AgnosticMessageResponse; message: string }[]> {
    const baseURL = apiURL(this.SERVICE);

    const errandsUrl = `${municipalityId}/${process.env.CASEDATA_NAMESPACE}/errands/${messageDto.errandId}`;
    const errandData = await this.apiService.get<ErrandDTO>({ url: errandsUrl, baseURL }, req.user);

    const decision = errandData.data?.decisions?.find(d => d.decisionType === 'FINAL');
    const pdf = decision?.attachments?.[0];
    if (!pdf) {
      return [
        {
          data: { messageId: '' },
          message: 'No decision attachment found',
        },
      ];
    }

    const minasidor_success = await sendDecisionToMinaSidor(baseURL, errandData.data.id!.toString(), req.user, pdf);
    if (errandData.data.externalCaseId) {
      const openE_success = await sendDecisionToOpenE(errandData.data, req.user, pdf);
      return [minasidor_success, openE_success];
    } else {
      const katla_success = await sendDecisionToKatla(baseURL, errandData.data, req.user, pdf);
      const digitalMail_success = await sendDecisionToDigitalMail(errandData.data, req.user, pdf);
      return [minasidor_success, katla_success, digitalMail_success];
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

    return sendEmail(
      municipalityId,
      message,
      req,
      errandData,
      MessageClassification[messageDto.messageClassification as unknown as keyof typeof MessageClassification],
    );
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
    let message!: WebMessageRequest;
    if (errandData.data.externalCaseId) {
      const attachments = files.map(file => {
        return {
          base64Data: file.buffer.toString('base64'),
          fileName: file.originalname,
          mimeType: file.mimetype,
        } as WebMessageAttachment;
      });
      message = {
        party: {
          ...(getOwnerStakeholder(errandData.data)?.personId && { partyId: getOwnerStakeholder(errandData.data)?.personId }),
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
