import { Relation } from '@common/data-contracts/relations/data-contracts';
import { ApiResponse, apiService } from '@common/services/api-service';
import { MessageNode } from '@supportmanagement/services/support-message-service';
import { SupportErrand } from './support-errand-service';

export const getSupportConversations: (errandId: string) => Promise<ApiResponse<any[]>> = (errandId) => {
  if (!errandId) {
    console.error('No errand id found, cannot fetch. Returning.');
  }

  const url = `supportmanagement/namespace/errands/${errandId}/communication/conversations`;
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
  errandId: string,
  conversationId: string
) => Promise<ApiResponse<MessageNode[]>> = (errandId, conversationId) => {
  if (!errandId) {
    console.error('No errand id found, cannot fetch. Returning.');
  }
  const url = `supportmanagement/namespace/errands/${errandId}/communication/conversations/${conversationId}/messages`;
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

export const createSupportConversation = async (errandId: string, topic: string, type: string, relationId?: string) => {
  const url = `supportmanagement/namespace/errand/${errandId}/communication/conversations`;

  const body: Partial<any> = {
    topic: topic,
    type: type,
    ...(relationId ? { relationIds: [relationId] } : {}),
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

export const sendSupportConversationMessage = (
  errandId: string,
  conversationId: string,
  message: string,
  files?: { file: File }[]
) => {
  const url = `supportmanagement/namespace/errand/${errandId}/communication/conversations/${conversationId}/messages`;

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
  errandId: number,
  conversationId: string,
  messageId: string,
  attachmentId: string
) => Promise<ApiResponse<any>> = (errandId, conversationId, messageId, attachmentId) => {
  if (!errandId) {
    console.error('No errand id found, cannot fetch. Returning.');
  }

  const url = `supportmanagement/namespace/errands/${errandId}/communication/conversations/${conversationId}/messages/${messageId}/attachments/${attachmentId}`;
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

export const getOrCreateSupportConversationId = async (
  supportErrand: SupportErrand,
  contactMeans: string,
  selectedRelationId: string,
  relationErrands: Relation[],
  messageConversationId: string
): Promise<string> => {
  const conversationType = contactMeans === 'draken' ? 'INTERNAL' : 'EXTERNAL';
  const selectedRelation = relationErrands.find((relation) => relation.target.resourceId === selectedRelationId);

  const conversations = await getSupportConversations(supportErrand.id);
  const existingExternalConversation = conversations.data.find((c) => c.type === 'EXTERNAL');
  const existingInternalConversation = conversations.data.find(
    (conv: any) => conv.relationIds && conv.relationIds[0] === selectedRelation?.id
  );

  let conversationId: string | undefined = undefined;

  if (contactMeans === 'draken' && existingInternalConversation) {
    conversationId = existingInternalConversation.id;
  }

  if (contactMeans === 'minasidor' && existingExternalConversation) {
    conversationId = existingExternalConversation.id;
  }

  if (messageConversationId) {
    conversationId = messageConversationId;
  }

  if (!conversationId) {
    let topic;
    if (conversationType === 'EXTERNAL') {
      topic = `Mina sidor`;
    } else {
      topic = `${supportErrand.errandNumber}${selectedRelation ? ` - ${selectedRelation.target.type}` : ''}`;
    }

    const newConversation = await createSupportConversation(
      supportErrand.id,
      topic,
      conversationType,
      selectedRelation?.id
    );
    conversationId = newConversation.data.id;
  }

  return conversationId;
};
