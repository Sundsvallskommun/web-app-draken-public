import { ApiResponse, apiService } from '@common/services/api-service';
import { MessageNode } from './casedata-message-service';
import { Attachment } from '@casedata/interfaces/attachment';

export interface Identifier {
  type?: string;
  value: string;
}

export interface ReadBy {
  identifier?: Identifier;
  readAt?: string;
}

export interface Message {
  id?: string;
  inReplyToMessageId?: string;
  created?: string;
  createdBy?: Identifier;
  content: string;
  readBy?: ReadBy[];
  attachments?: Attachment[];
}

export const getConversations: (municipalityId: string, errandId: number) => Promise<ApiResponse<any[]>> = (
  municipalityId,
  errandId
) => {
  if (!errandId) {
    console.error('No errand id found, cannot fetch. Returning.');
  }

  const url = `casedata/${municipalityId}/namespace/errands/${errandId}/communication/conversations`;
  return apiService
    .get<ApiResponse<any>>(url)
    .then((res) => {
      return res.data.data;
    })
    .catch((e) => {
      console.error('Something went wrong when fetching conversation for errand: ', errandId);
      throw e;
    });
};

export const getConversationMessages: (
  municipalityId: string,
  errandId: number,
  conversationId: string
) => Promise<ApiResponse<MessageNode[]>> = (municipalityId, errandId, conversationId) => {
  if (!errandId) {
    console.error('No errand id found, cannot fetch. Returning.');
  }
  const url = `casedata/${municipalityId}/namespace/errands/${errandId}/communication/conversations/${conversationId}/messages`;
  return apiService
    .get<ApiResponse<any>>(url)
    .then((res) => {
      return res.data;
    })
    .catch((e) => {
      console.error('Something went wrong when fetching conversation for errand: ', errandId);
      throw e;
    });
};

export const createConversation = async (
  municipalityId: string,
  errandId: number,
  relationId: string,
  topic: string
) => {
  const res = await getConversations(municipalityId, errandId);
  if (res && res.data) {
    const existingConversation = res.data.find((conv: any) => conv.relationIds && conv.relationIds[0] === relationId);
    if (existingConversation) {
      return {
        data: {
          id: existingConversation.id,
        },
      };
    }
  }

  const url = `casedata/${municipalityId}/namespace/errand/${errandId}/communication/conversations`;

  const body: Partial<any> = {
    topic: topic,
    type: 'INTERNAL',
    relationIds: [relationId],
  };

  return apiService
    .post<ApiResponse<any>, Partial<any>>(url, body)
    .then((res) => {
      return res.data;
    })
    .catch((e) => {
      console.error('Something went wrong when creating relation: ' + e);
      throw e;
    });
};

export const sendInternalMessage = (
  municipalityId: string,
  errandId: number,
  conversationId: string,
  message: string,
  files?: FileList[]
) => {
  const url = `${municipalityId}/namespace/errand/${errandId}/communication/conversations/${conversationId}/messages`;

  const formData = new FormData();
  formData.append(
    'message',
    JSON.stringify({
      content: message,
    })
  );

  if (files && files.length > 0) {
    files.forEach((fileList) => {
      if (fileList) {
        Array.from(fileList).forEach((file) => {
          formData.append('attachments', file);
        });
      }
    });
  }

  return apiService
    .post<ApiResponse<Message>, FormData>(url, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((res) => res.data)
    .catch((e) => {
      console.error('Something went wrong when creating relation: ' + e);
      throw e;
    });
};

export const getConversationAttachment: (
  municipalityId: string,
  errandId: number,
  conversationId: string,
  messageId: string,
  attachmentId: string
) => Promise<ApiResponse<any>> = (municipalityId, errandId, conversationId, messageId, attachmentId) => {
  if (!errandId) {
    console.error('No errand id found, cannot fetch. Returning.');
  }

  const url = `casedata/${municipalityId}/namespace/errands/${errandId}/communication/conversations/${conversationId}/messages/${messageId}/attachments/${attachmentId}`;
  return apiService
    .get<ApiResponse<any>>(url)
    .then((res) => {
      return res.data;
    })
    .catch((e) => {
      console.error('Something went wrong when fetching conversation attachment for errand: ', errandId);
      throw e;
    });
};
