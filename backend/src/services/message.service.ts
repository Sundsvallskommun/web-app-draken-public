import { CASEDATA_NAMESPACE, MUNICIPALITY_ID } from '@/config';
import { apiServiceName } from '@/config/api-config';
import {
  Attachment,
  Classification,
  Conversation,
  EmailHeader,
  Errand as ErrandDTO,
  Header,
  MessageRequest,
  MessageRequestDirectionEnum,
  Stakeholder as StakeholderDTO,
} from '@/data-contracts/case-data/data-contracts';
import {
  DigitalMailAttachment,
  DigitalMailAttachmentContentTypeEnum,
  DigitalMailRequest,
  DigitalMailRequestContentTypeEnum,
  EmailAttachment,
  EmailRequest,
  HistoryResponse,
  LetterRequest,
  SmsRequest,
  WebMessageAttachment,
  WebMessageRequest,
} from '@/data-contracts/messaging/data-contracts';
import { RequestWithUser } from '@/interfaces/auth.interface';
import { AgnosticMessageResponse, LetterResponse, MessageClassification, WebMessageResponse } from '@controllers/message.controller';
import { Role } from '@interfaces/role';
import { User } from '@interfaces/users.interface';
import { logger } from '@utils/logger';
import dayjs from 'dayjs';
import { v4 as uuidv4 } from 'uuid';
import ApiService, { ApiResponse } from './api.service';
import { apiURL, base64ToByteArray } from '@/utils/util';
import { getOwnerStakeholder } from './stakeholder.service';

interface SmsMessage {
  party?: {
    partyId: string;
    externalReferences: { [key: string]: string }[];
  };
  headers?: [
    {
      name: string;
      values: string[];
    },
  ];
  sender?: string;
  mobileNumber: string;
  message: string;
}

const NOTIFY_CONTACTS = false;
const SERVICE = apiServiceName('case-data');
const MESSAGING_SERVICE = apiServiceName('messaging');

export const generateMessageId = () => `<${uuidv4()}@sundsvall.se>`;

export const sendSms = (municipalityId: string, message: SmsRequest, req: RequestWithUser, errandData: ApiResponse<ErrandDTO>) => {
  const url = `${MESSAGING_SERVICE}/${municipalityId}/sms`;
  const apiService = new ApiService();
  return apiService
    .post<AgnosticMessageResponse, SmsRequest>({ url, data: message }, req.user)
    .then(async res => {
      return saveMessageOnErrand(
        municipalityId,
        errandData.data,
        {
          message: message.message,
          id: res.data.messageId,
          messageType: 'SMS',
          messageClassification: MessageClassification.Informationsmeddelande,
          header_message_Id: '',
          header_reply_to: '',
          header_references: '',
          mobileNumber: message.mobileNumber,
        },
        req.user,
      )
        .then(res => {
          return {
            data: res.data,
            message: `SMS sent.`,
          };
        })
        .catch(e => {
          logger.error('Error when saving message id:', e);
          return { data: res.data, message: `Message sent but id could not be stored` };
        });
    })
    .catch(e => {
      logger.error('Error when sending message:', e);
      throw e;
    });
};

export const sendWebMessage = (municipalityId: string, message: WebMessageRequest, req: RequestWithUser, errandData: ApiResponse<ErrandDTO>) => {
  const url = `${MESSAGING_SERVICE}/${municipalityId}/webmessage`;
  const apiService = new ApiService();
  return apiService
    .post<AgnosticMessageResponse, WebMessageRequest>({ url, data: message }, req.user)
    .then(async (res: ApiResponse<WebMessageResponse>) => {
      return saveMessageOnErrand(
        municipalityId,
        errandData.data,
        {
          message: message.message,
          id: res.data.messageId,
          messageType: 'WEBMESSAGE',
          messageClassification: MessageClassification.Informationsmeddelande,
          header_message_Id: '',
          header_reply_to: '',
          header_references: '',
        },
        req.user,
      )
        .then(async _ => {
          if (NOTIFY_CONTACTS) {
            await notifyContactPersons(municipalityId, errandData.data, req.user);
            return { data: res.data, message: `Message sent` };
          } else {
            return { data: res.data, message: `Message sent` };
          }
        })
        .catch(e => {
          logger.error('Error when saving message id:', e);
          return { data: res.data, message: `Message sent but id could not be stored` };
        });
    })
    .catch(e => {
      logger.error('Error when sending message:', e);
      throw e;
    });
};

export const sendEmail = (
  municipalityId: string,
  message: EmailRequest,
  req: RequestWithUser,
  errandData: ApiResponse<ErrandDTO>,
  classification: MessageClassification,
) => {
  const url = `${MESSAGING_SERVICE}/${municipalityId}/email`;
  const apiService = new ApiService();
  return apiService
    .post<AgnosticMessageResponse, EmailRequest>({ url, data: message }, req.user)
    .then(async res => {
      return saveMessageOnErrand(
        municipalityId,
        errandData.data,
        {
          message: message.message,
          id: res.data.messageId,
          messageType: 'EMAIL',
          messageClassification: classification,
          header_message_Id: message.headers['MESSAGE_ID']?.[0],
          header_reply_to: message.headers['IN_REPLY_TO']?.[0],
          header_references: message.headers['REFERENCES']?.join(','),
          email: message.emailAddress,
        },
        req.user,
      )
        .then(async _ => {
          if (NOTIFY_CONTACTS) {
            const notified = await notifyContactPersons(municipalityId, errandData.data, req.user);
            return {
              data: res.data,
              message: notified ? `Message sent, notified contacts.` : `Message sent, but contact notification could not be sent.`,
            };
          } else {
            return {
              data: res.data,
              message: `Message sent.`,
            };
          }
        })
        .catch(e => {
          logger.error('Error when saving message id:', e);
          return { data: res.data, message: `Message sent but id could not be stored` };
        });
    })
    .catch(e => {
      logger.error('Error when sending message:', e);
      throw e;
    });
};

export const sendDigitalMail = (municipalityId, message, req, errandData, classification) => {
  const url = `${MESSAGING_SERVICE}/${municipalityId}/letter?async=false`;
  const apiService = new ApiService();
  return apiService
    .post<LetterResponse, LetterRequest>({ url, data: message }, req.user)
    .then(async (res: ApiResponse<LetterResponse>) => {
      const id = res.data.messages?.[0]?.messageId;
      if (!id) {
        throw new Error('Error: no id returned when sending message');
      }
      return saveMessageOnErrand(
        municipalityId,
        errandData.data,
        {
          message: message.message,
          id: id,
          messageType: 'DIGITAL_MAIL',
          messageClassification: classification,
          header_message_Id: '',
          header_reply_to: '',
          header_references: '',
        },
        req.user,
      )
        .then(async _ => {
          if (NOTIFY_CONTACTS) {
            await notifyContactPersons(municipalityId, errandData.data, req.user);
            return { data: { messageId: id }, message: `Message sent` };
          } else {
            return { data: { messageId: id }, message: `Message sent` };
          }
        })
        .catch(e => {
          logger.error('Error when saving message id:', e);
          return { data: { messageId: id }, message: `Message sent but id could not be stored` };
        });
    })
    .catch(e => {
      logger.error('Error when sending message:', e);
      throw e;
    });
};

export const saveMessageOnErrand: (
  municipalityId: string,
  errand: ErrandDTO,
  message: {
    message: string;
    id: string;
    messageType: string;
    messageClassification: MessageClassification;
    header_message_Id;
    header_reply_to: string;
    header_references: string;
    mobileNumber?: string;
    email?: string;
  },
  user: User,
) => Promise<ApiResponse<any>> = async (municipalityId, errand, message, user) => {
  const apiService = new ApiService();
  // Fetch message info from Messaging and construct SaveMessage object
  const messagingUrl = `${MESSAGING_SERVICE}/${municipalityId}/messages/${message.id}/metadata`;
  const messagingResponse = await apiService.get<HistoryResponse>({ url: messagingUrl }, user);
  const messagingInfo = messagingResponse.data[0];
  const headers = (messagingInfo.content as EmailRequest)?.headers || {};
  const emailHeaders: EmailHeader[] = Object.entries(headers).map(h => ({ header: h[0] as Header, values: h[1] }));

  const attachments: ((WebMessageAttachment & EmailAttachment) | any)[] = [];

  if (messagingInfo?.content?.attachments && messagingInfo?.content?.attachments?.length > 0) {
    for (const attachment of messagingInfo.content.attachments) {
      const attachmentUrl = `${MESSAGING_SERVICE}/${municipalityId}/messages/${message.id}/attachments`;
      const attachmentResponse = await apiService.get<ArrayBuffer>(
        { url: attachmentUrl, params: { fileName: attachment.name ?? attachment.filename }, responseType: 'arraybuffer' },
        user,
      );
      const attatchmentBase64 = Buffer.from(attachmentResponse.data).toString('base64');
      attachments.push({ ...attachment, content: attatchmentBase64 });
    }
  }

  const saveMessage: MessageRequest = {
    messageId: message.id,
    messageType: message.messageType || '',
    classification: message.messageClassification as unknown as Classification,
    direction: MessageRequestDirectionEnum.OUTBOUND,
    familyId: '',
    externalCaseId: errand.externalCaseId || '',
    message: message.message,
    sent: dayjs(messagingInfo.timestamp).format('YYYY-MM-DD HH:mm:ss'),
    subject: messagingInfo.content.subject || '',
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    mobileNumber: message.mobileNumber || '',
    recipients: message.email ? [message.email] : [],
    email: process.env.CASEDATA_SENDER_EMAIL || '',
    userId: '',
    attachments: attachments.map(a => ({
      content: a.content ?? a.base64Data,
      name: a.name ?? a.fileName ?? a.filename,
      contentType: a.contentType ?? a.mimeType,
    })),
    emailHeaders: emailHeaders,
  };

  const url = `${SERVICE}/${municipalityId}/${CASEDATA_NAMESPACE}/errands/${errand.id}/messages`;
  const saveIdResponse = await apiService
    .post<any, MessageRequest>({ url, data: saveMessage }, user)
    .then(res => {
      return res;
    })
    .catch(e => {
      logger.error('Error when saving message on errand:', e);
      logger.error(e);
      throw e;
    });

  if (saveMessage.direction === MessageRequestDirectionEnum.OUTBOUND) {
    await setMessageViewed(municipalityId, errand.id, message.id, user).catch(e => {
      logger.error('Error when saving viewed status:', e);
    });
  }

  return saveIdResponse;
};

const buildSms = (applicant: StakeholderDTO, contact: StakeholderDTO, message: string) => {
  const sms: SmsMessage = {
    party: {
      partyId: applicant.personId,
      externalReferences: [],
    },
    mobileNumber: contact.contactInformation.find(c => c.contactType === 'PHONE')?.value,
    message: message,
  };
  return sms;
};

const buildEmail = (applicant: StakeholderDTO, contact: StakeholderDTO, message: string) => {
  const email = {
    party: {
      partyId: applicant.personId,
      externalReferences: [],
    },
    emailAddress: contact.contactInformation.find(c => c.contactType === 'EMAIL')?.value,
    subject: 'Meddelande i ärende',
    message: message,
    attachments: [],
  } as EmailRequest;
  return email;
};

export const notifyContactPersons: (municipalityId: string, errand: ErrandDTO, user: User) => Promise<boolean> = (municipalityId, errand, user) => {
  const apiService = new ApiService();
  const applicant = errand.stakeholders.find(s => s.roles.includes(Role.APPLICANT));
  if (!applicant) {
    return Promise.resolve(false);
  }
  const standardMessage = `Ni står som ärendeintressent i ärende ${errand.errandNumber} om ansökan för parkeringstillstånd för ${applicant.firstName}. Vi vill uppmärksamma er på att ett nytt meddelande i ärendet har skickats till den sökande.`;
  const notifiablePrimaryContacts = errand.stakeholders.filter(
    s => s.extraParameters['primaryContact'] === 'true' && s.extraParameters['messageAllowed'] === 'true',
  );
  const smss = notifiablePrimaryContacts
    .filter(c => c.contactInformation.some(c => c.contactType === 'PHONE'))
    .map(c => buildSms(applicant, c, standardMessage));
  const emails = notifiablePrimaryContacts
    .filter(c => c.contactInformation.some(c => c.contactType === 'EMAIL'))
    .map(c => buildEmail(applicant, c, standardMessage));
  const smsPromises = smss.map(async sms => {
    return apiService.post<AgnosticMessageResponse, SmsMessage>({ url: `${MESSAGING_SERVICE}/${municipalityId}/sms`, data: sms }, user);
  });
  const emailPromises = emails.map(async email => {
    return apiService.post<AgnosticMessageResponse, EmailRequest>({ url: `${MESSAGING_SERVICE}/${municipalityId}/email`, data: email }, user);
  });
  return Promise.allSettled([...smsPromises, ...emailPromises]).then(res => {
    const succeeded = res.filter(r => r.status === 'fulfilled').length;
    logger.info(`Sent ${succeeded} notifications to contact persons in errand ${errand.errandNumber}`);
    return true;
  });
};

export const setMessageViewed = (municipalityId: string, errandId: number, messageId: string, user: User) => {
  const apiService = new ApiService();
  const url = `${SERVICE}/${municipalityId}/${CASEDATA_NAMESPACE}/errands/${errandId}/messages/${messageId}/viewed/true`;
  return apiService.put<any, any>({ url }, user);
};

export const createConversation = async (errandId: string, user: User, converastionType: string, topic: string) => {
  const apiService = new ApiService();
  const baseURL = apiURL(SERVICE);
  const url = `${MUNICIPALITY_ID}/${process.env.CASEDATA_NAMESPACE}/errands/${errandId}/communication/conversations`;
  const body = {
    topic: topic,
    type: converastionType,
  };

  const res = await apiService.post<any, any>({ url, baseURL, data: body }, user);

  return res.data;
};

export const sendConversation = async (errandId: string, conversationId: string, user: User, pdf: Attachment) => {
  const apiService = new ApiService();
  const url = `${SERVICE}/${MUNICIPALITY_ID}/${CASEDATA_NAMESPACE}/errands/${errandId}/communication/conversations/${conversationId}/messages`;

  const formData = new FormData();
  const messageObj = {
    createdBy: { type: 'adAccount', value: user.username },
    content: 'Beslut fattat i ärende',
  };
  formData.append('message', JSON.stringify(messageObj));
  const byteArray = base64ToByteArray(pdf.file);
  formData.append('attachments', new Blob([byteArray], { type: pdf.mimeType }), `${pdf.name}.pdf`);

  return await apiService.post<any, any>({ url, data: formData, headers: { 'Content-Type': 'multipart/form-data' } }, user);
};

export const sendDecisionToMinaSidor = async (baseURL: string, errandId: string, user: User, pdf: Attachment) => {
  const apiService = new ApiService();
  const conversationUrl = `${MUNICIPALITY_ID}/${process.env.CASEDATA_NAMESPACE}/errands/${errandId}/communication/conversations`;
  const conversationRes = await apiService.get<Conversation[]>({ url: conversationUrl, baseURL }, user);
  let externalConversation;
  externalConversation = conversationRes.data.find(c => c.type === 'EXTERNAL');

  if (externalConversation === undefined) {
    externalConversation = await createConversation(errandId, user, 'EXTERNAL', 'Mina sidor');
  }
  return sendConversation(errandId, externalConversation.id, user, pdf)
    .then(async res => {
      return { data: { ...res.data, messageId: externalConversation.id }, message: `Message sent to Mina sidor` };
    })
    .catch(e => {
      logger.error('Error when sending message to Mina sidor:', e);
      return { data: e, message: `Error when sending message to Mina sidor` };
    });
};

export const sendDecisionToKatla = async (baseURL: string, errand: ErrandDTO, user: User, pdf: Attachment) => {
  if (errand.channel !== 'ESERVICE_KATLA') {
    return { data: { messageId: 'Non Katla errand' }, message: `Non Katla errand` };
  }

  const apiService = new ApiService();
  const conversationUrl = `${MUNICIPALITY_ID}/${process.env.CASEDATA_NAMESPACE}/errands/${errand.id}/communication/conversations`;
  const conversationRes = await apiService.get<Conversation[]>({ url: conversationUrl, baseURL }, user);
  let relationlessConversation;

  relationlessConversation = conversationRes.data.find(c => c.relationIds.length === 0 && c.type !== 'EXTERNAL');

  if (relationlessConversation === undefined) {
    relationlessConversation = await createConversation(errand.id.toString(), user, 'INTERNAL', errand.errandNumber);
  }
  return sendConversation(errand.id.toString(), relationlessConversation.id, user, pdf)
    .then(async res => {
      return { data: { ...res.data, messageId: relationlessConversation.id }, message: `Message sent to Katla` };
    })
    .catch(e => {
      logger.error('Error when sending message to Katla:', e);
      return { data: e, message: `Error when sending message to Katla` };
    });
};

export const sendDecisionToOpenE = (errand: ErrandDTO, user: User, pdf: Attachment) => {
  const url = `${MESSAGING_SERVICE}/${MUNICIPALITY_ID}/webmessage`;
  const apiService = new ApiService();

  const attachments = [
    {
      base64Data: pdf.file,
      fileName: `${pdf.name}.pdf`,
      mimeType: pdf.mimeType,
    } as WebMessageAttachment,
  ];
  const message: WebMessageRequest = {
    party: {
      partyId: getOwnerStakeholder(errand).personId,
      externalReferences: [
        {
          key: 'flowInstanceId',
          value: errand.externalCaseId,
        },
      ],
    },
    message: 'Beslut fattat i ärende',
    attachments,
  } as WebMessageRequest;

  return apiService
    .post<AgnosticMessageResponse, WebMessageRequest>({ url, data: message }, user)
    .then(async (res: ApiResponse<WebMessageResponse>) => {
      return saveMessageOnErrand(
        MUNICIPALITY_ID,
        errand,
        {
          message: message.message,
          id: res.data.messageId,
          messageType: 'WEBMESSAGE',
          messageClassification: MessageClassification.Informationsmeddelande,
          header_message_Id: '',
          header_reply_to: '',
          header_references: '',
        },
        user,
      )
        .then(async _ => {
          return { data: res.data, message: `Message sent to OpenE` };
        })
        .catch(e => {
          logger.error('Error when saving message id:', e);
          return { data: res.data, message: `Message to OpenE sent but id could not be stored` };
        });
    })
    .catch(e => {
      logger.error('Error when sending message to OpenE:', e);
      throw e;
    });
};

export const sendDecisionToDigitalMail = (errand: ErrandDTO, user: User, pdf: Attachment) => {
  const url = `${MESSAGING_SERVICE}/${MUNICIPALITY_ID}/letter?async=false`;
  const apiService = new ApiService();

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
      partyIds: [getOwnerStakeholder(errand).personId],
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
    //Change subject depending on application and casetype?
    subject: 'Meddelande gällande er ansökan om parkeringstillstånd',
    contentType: DigitalMailRequestContentTypeEnum.TextPlain,
    body: 'Beslut fattat i ärende',
    department: 'SBK(Gatuavdelningen, Trafiksektionen)',
    attachments: attachments,
  };

  return apiService
    .post<LetterResponse, DigitalMailRequest>({ url, data: message }, user)
    .then(async (res: ApiResponse<LetterResponse>) => {
      const id = res.data.messages?.[0]?.messageId;
      if (!id) {
        throw new Error('Error: no id returned when sending message');
      }
      return saveMessageOnErrand(
        MUNICIPALITY_ID,
        errand,
        {
          message: message.body,
          id: id,
          messageType: 'DIGITAL_MAIL',
          messageClassification: MessageClassification.Informationsmeddelande,
          header_message_Id: '',
          header_reply_to: '',
          header_references: '',
        },
        user,
      )
        .then(async _ => {
          return { data: { messageId: id }, message: `Digital mail sent` };
        })
        .catch(e => {
          logger.error('Error when saving message id:', e);
          return { data: { messageId: id }, message: `Digital mail sent but id could not be stored` };
        });
    })
    .catch(e => {
      logger.error('Error when sending digital mail:', e);
      throw e;
    });
};
