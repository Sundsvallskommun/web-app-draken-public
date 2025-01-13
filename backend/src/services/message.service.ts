import {
  Classification,
  EmailHeader,
  Errand as ErrandDTO,
  Header,
  MessageRequest,
  MessageRequestDirectionEnum,
  Stakeholder as StakeholderDTO,
} from '@/data-contracts/case-data/data-contracts';
import {
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
import { CASEDATA_NAMESPACE } from '@/config';

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
const SERVICE = `case-data/9.0`;
const MESSAGING_SERVICE = `messaging/6.0`;

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
            const notify = await notifyContactPersons(municipalityId, errandData.data, req.user);
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
            const notify = await notifyContactPersons(municipalityId, errandData.data, req.user);
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
  },
  user: User,
) => Promise<ApiResponse<any>> = async (municipalityId, errand, message, user) => {
  const apiService = new ApiService();

  // Fetch message info from Messaging and construct SaveMessage object
  const messagingUrl = `${MESSAGING_SERVICE}/${municipalityId}/message/${message.id}`;
  const messagingResponse = await apiService.get<HistoryResponse>({ url: messagingUrl }, user);
  const messagingInfo = messagingResponse.data[0];
  const headers = (messagingInfo.content as EmailRequest)?.headers || {};
  const emailHeaders: EmailHeader[] = Object.entries(headers).map(h => ({ header: h[0] as Header, values: h[1] }));
  const attachments = (messagingInfo.content.attachments || []) as ((WebMessageAttachment & EmailAttachment) | any)[];
  const saveMessage: MessageRequest = {
    messageId: message.id,
    messageType: message.messageType || '',
    classification: message.messageClassification as unknown as Classification,
    errandNumber: errand.errandNumber,
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
    email: process.env.CASEDATA_SENDER_EMAIL || '',
    userId: '',
    attachmentRequests: attachments.map(a => ({
      content: a.content || a.base64Data,
      name: a.name || a.filename || a.fileName,
      contentType: a.contentType || a.mimeType,
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
