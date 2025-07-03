import { ApiResponse, apiService } from '@common/services/api-service';
import { MessageNode } from '@supportmanagement/services/support-message-service';

export const getSupportConversations: (municipalityId: string, errandId: string) => Promise<ApiResponse<any[]>> = (
  municipalityId,
  errandId
) => {
  if (!errandId) {
    console.error('No errand id found, cannot fetch. Returning.');
  }

  const url = `supportmanagement/${municipalityId}/namespace/errands/${errandId}/communication/conversations`;
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

export const getSupportConversationMessages: (
  municipalityId: string,
  errandId: string,
  conversationId: string
) => Promise<ApiResponse<MessageNode[]>> = (municipalityId, errandId, conversationId) => {
  if (!errandId) {
    console.error('No errand id found, cannot fetch. Returning.');
  }
  const url = `supportmanagement/${municipalityId}/namespace/errands/${errandId}/communication/conversations/${conversationId}/messages`;
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

export const createSupportConversation = async (
  municipalityId: string,
  errandId: string,
  relationId: string,
  topic: string
) => {
  const res = await getSupportConversations(municipalityId, errandId);
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

  const url = `supportmanagement/${municipalityId}/namespace/errand/${errandId}/communication/conversations`;

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

export const sendSupportInternalMessage = (
  municipalityId: string,
  errandId: string,
  conversationId: string,
  message: string,
  files?: { file: File }[]
) => {
  const url = `supportmanagement/${municipalityId}/namespace/errand/${errandId}/communication/conversations/${conversationId}/messages`;

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
        formData.append('attachments', fileList.file[0]);
      }
    });
  }

  return apiService
    .post<ApiResponse<any>, FormData>(url, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((res) => res.data)
    .catch((e) => {
      console.error('Something went wrong when creating relation: ' + e);
      throw e;
    });
};

export const getSupportConversationAttachment: (
  municipalityId: string,
  errandId: number,
  conversationId: string,
  messageId: string,
  attachmentId: string
) => Promise<ApiResponse<any>> = (municipalityId, errandId, conversationId, messageId, attachmentId) => {
  if (!errandId) {
    console.error('No errand id found, cannot fetch. Returning.');
  }

  const url = `supportmanagement/${municipalityId}/namespace/errands/${errandId}/communication/conversations/${conversationId}/messages/${messageId}/attachments/${attachmentId}`;
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
