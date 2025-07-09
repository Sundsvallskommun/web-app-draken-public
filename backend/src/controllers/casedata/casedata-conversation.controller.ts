import { Conversation, ConversationType, Message, PageMessage } from '@/data-contracts/case-data/data-contracts';
import { PortalPersonData } from '@/data-contracts/employee/data-contracts';
import { apiURL } from '@/utils/util';
import { RequestWithUser } from '@interfaces/auth.interface';
import authMiddleware from '@middlewares/auth.middleware';
import ApiService from '@services/api.service';
import { Body, Controller, Get, Param, Post, Req, UseBefore, UploadedFiles } from 'routing-controllers';
import { OpenAPI } from 'routing-controllers-openapi';
import { fileUploadOptions } from '@/utils/fileUploadOptions';

interface ResponseData {
  data: any;
  message: string;
}

@Controller()
export class CaseDataConversationController {
  private apiService = new ApiService();
  SERVICE = `case-data/11.5`;

  @Get('/casedata/:municipalityId/namespace/errands/:errandId/communication/conversations')
  @OpenAPI({ summary: 'Return all conversations by errandId' })
  @UseBefore(authMiddleware)
  async returnAllConversations(
    @Req() req: RequestWithUser,
    @Param('errandId') errandId: string,
    @Param('municipalityId') municipalityId: string,
  ): Promise<ResponseData> {
    const url = `${municipalityId}/${process.env.CASEDATA_NAMESPACE}/errands/${errandId}/communication/conversations`;
    const baseURL = apiURL(this.SERVICE);
    const res = await this.apiService.get<Conversation[]>({ url, baseURL }, req.user);
    return { data: res, message: 'success' } as ResponseData;
  }

  @Get('/casedata/:municipalityId/namespace/errands/:errandId/communication/conversations/:conversationId/messages')
  @OpenAPI({ summary: 'Return all conversations by errandId' })
  @UseBefore(authMiddleware)
  async returnAllMessages(
    @Req() req: RequestWithUser,
    @Param('errandId') errandId: string,
    @Param('municipalityId') municipalityId: string,
    @Param('conversationId') conversationId: string,
  ): Promise<ResponseData> {
    const baseURL = apiURL(this.SERVICE);
    let url = `${municipalityId}/${process.env.CASEDATA_NAMESPACE}/errands/${errandId}/communication/conversations`;
    const resConversation = await this.apiService.get<Conversation[]>({ url, baseURL }, req.user);

    const conversation = resConversation.data.find((c: any) => c.id === conversationId);
    const topic = conversation ? conversation.topic : undefined;

    const messageType = conversation.type === ConversationType.INTERNAL ? 'DRAKEN' : 'MINASIDOR';

    url = `${municipalityId}/${process.env.CASEDATA_NAMESPACE}/errands/${errandId}/communication/conversations/${conversationId}/messages`;
    const resPageMessage = await this.apiService.get<PageMessage>({ url, baseURL }, req.user);

    const mappedMessages = await Promise.all(
      resPageMessage.data?.content?.map(async (msg: any) => {
        let firstName = undefined;
        let lastName = undefined;
        let direction = undefined;
        let viewed = undefined;

        const isReadByCurrentUser = Array.isArray(msg.readBy) && msg.readBy.some((reader: any) => reader.identifier.value === req.user.username);
        if (isReadByCurrentUser) {
          viewed = 'true';
        }

        if (msg?.createdBy?.type === 'AD_ACCOUNT') {
          if (msg?.createdBy?.value === req.user.username) {
            firstName = req.user.firstName;
            lastName = req.user.lastName;
            direction = 'OUTBOUND';
          } else {
            const adAccountUrl = `employee/2.0/${municipalityId}/portalpersondata/PERSONAL/${msg?.createdBy?.value}`;
            const res = await this.apiService.get<PortalPersonData>({ url: adAccountUrl }, req.user);
            firstName = res.data.givenname;
            lastName = res.data.lastname;
            direction = 'INBOUND';
          }
        }

        if (msg?.createdBy?.type === 'PARTY_ID') {
          const adAccountUrl = `citizen/3.0/${municipalityId}/${msg?.createdBy?.value}`;
          const res = await this.apiService.get<any>({ url: adAccountUrl }, req.user);
          firstName = res.data.givenname;
          lastName = res.data.lastname;
          direction = 'INBOUND';
        }

        return {
          conversationId: conversationId,
          messageId: msg?.id,
          sent: msg?.created,
          message: msg?.content,
          attachments: Array.isArray(msg?.attachments)
            ? msg.attachments.map((att: any) => ({
                attachmentId: att?.id,
                name: att?.fileName,
                contentType: att?.mimeType,
              }))
            : [],
          messageType: messageType,
          subject: topic,
          firstName,
          lastName,
          direction,
          viewed,
        };
      }) ?? [],
    );

    return { data: mappedMessages, message: 'success' } as ResponseData;
  }

  @Post('/casedata/:municipalityId/namespace/errand/:errandId/communication/conversations')
  @OpenAPI({ summary: 'Create new conversation' })
  @UseBefore(authMiddleware)
  async createConversation(
    @Req() req: RequestWithUser,
    @Param('errandId') errandId: string,
    @Param('municipalityId') municipalityId: string,
    @Body() conversation: Conversation,
  ): Promise<{ data: any; message: string }> {
    const url = `${municipalityId}/${process.env.CASEDATA_NAMESPACE}/errands/${errandId}/communication/conversations`;
    const baseURL = apiURL(this.SERVICE);
    const response = await this.apiService.post<any, any>({ url, baseURL, data: conversation }, req.user).catch(e => {
      console.log('Something went wrong when creating conversation: ' + e);
      throw e;
    });
    return { data: response.data, message: `Conversation created` };
  }

  @Post('/:municipalityId/namespace/errand/:errandId/communication/conversations/:conversationId/messages')
  @OpenAPI({ summary: 'Create new message' })
  @UseBefore(authMiddleware)
  async sendInternalMessage(
    @Req() req: RequestWithUser,
    @Param('errandId') errandId: string,
    @Param('municipalityId') municipalityId: string,
    @Param('conversationId') conversationId: string,
    @UploadedFiles('attachments', { options: fileUploadOptions, required: false }) files: Express.Multer.File[],
    @Body() body: any,
  ): Promise<{ data: any; message: string }> {
    const formData = new FormData();
    formData.append('message', body.message);

    if (files && files.length > 0) {
      files.forEach(file => {
        formData.append('attachments', new Blob([file.buffer], { type: file.mimetype }), file.originalname);
      });
    }

    const attachments = (files || []).map(file => file.buffer);

    const url = `${municipalityId}/${process.env.CASEDATA_NAMESPACE}/errands/${errandId}/communication/conversations/${conversationId}/messages`;
    const baseURL = apiURL(this.SERVICE);

    const response = await this.apiService
      .post<any, any>({ url, baseURL, data: formData, headers: { 'Content-Type': 'multipart/form-data' } }, req.user)
      .catch(e => {
        console.error('Error', e);
      });

    return { data: { response, attachments }, message: 'Message created' };
  }

  @Get(
    '/casedata/:municipalityId/namespace/errands/:errandId/communication/conversations/:conversationId/messages/:messageId/attachments/:attachmentId',
  )
  @OpenAPI({ summary: 'Get an attachment' })
  @UseBefore(authMiddleware)
  async getAttachment(
    @Req() req: RequestWithUser,
    @Param('errandId') errandId: string,
    @Param('municipalityId') municipalityId: string,
    @Param('conversationId') conversationId: string,
    @Param('messageId') messageId: string,
    @Param('attachmentId') attachmentId: string,
  ): Promise<{ data: any; message: string }> {
    const url = `${municipalityId}/${process.env.CASEDATA_NAMESPACE}/errands/${errandId}/communication/conversations/${conversationId}/messages/${messageId}/attachments/${attachmentId}`;
    const baseURL = apiURL(this.SERVICE);
    const response = await this.apiService.get<any>({ url, baseURL, responseType: 'arraybuffer' }, req.user).catch(e => {
      console.log('Something went wrong when getting conversation attachment: ' + e);
      throw e;
    });
    const binaryString = Array.from(new Uint8Array(response.data), v => String.fromCharCode(v)).join('');
    const b64 = Buffer.from(binaryString, 'binary').toString('base64');
    return { data: b64, message: `Success` };
  }
}
