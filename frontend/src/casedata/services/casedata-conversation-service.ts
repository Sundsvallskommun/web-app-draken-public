import { User } from '@common/interfaces/user';
import { ApiResponse, apiService } from '@common/services/api-service';
import { MessageNode } from './casedata-message-service';

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
  namespace: string,
  errandId: number,
  relationId: string,
  user: User,
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

  const url = `${municipalityId}/${namespace}/errand/${errandId}/communication/conversations`;

  const body: Partial<any> = {
    topic: topic,
    type: 'INTERNAL',
    relationIds: [relationId],
    participants: [
      {
        type: 'adAccount',
        value: user.username,
      },
    ],
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
  namespace: string,
  errandId: string,
  conversationId: string,
  user: User,
  message: string
) => {
  const url = `${municipalityId}/${namespace}/errand/${errandId}/communication/conversations/${conversationId}/messages`;

  const body: Partial<any> = {
    createdBy: {
      type: 'adAccount',
      value: user.username,
    },
    content: message,
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

export const getConversationAttachment: (
  municipalityId: string,
  namespace: string,
  errandId: number,
  conversationId: string,
  messageId: string,
  attachmentId: string
) => Promise<ApiResponse<any>> = (municipalityId, namespace, errandId, conversationId, messageId, attachmentId) => {
  if (!errandId) {
    console.error('No errand id found, cannot fetch. Returning.');
  }

  const url = `casedata/${municipalityId}/${namespace}/errands/${errandId}/communication/conversations/${conversationId}/messages/${messageId}/attachments/${attachmentId}`;
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
