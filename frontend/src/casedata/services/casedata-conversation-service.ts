import { Attachment } from '@casedata/interfaces/attachment';
import { IErrand } from '@casedata/interfaces/errand';
import { ApiResponse, apiService } from '@common/services/api-service';
import { logClientFailure } from '@common/services/client-diagnostics';
import { RelationWithErrandNumber } from '@common/services/relations-service';

import { MessageNode } from './casedata-message-service';

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
    logClientFailure('casedata.casedata-conversation.getConversations');
  }

  const url = `casedata/${municipalityId}/namespace/errands/${errandId}/communication/conversations`;
  return apiService
    .get<ApiResponse<any>>(url)
    .then((res) => {
      return res.data.data;
    })
    .catch((e) => {
      logClientFailure('casedata.casedata-conversation.getConversations', e);
      throw e;
    });
};

export const getConversationMessages: (
  municipalityId: string,
  errandId: number,
  conversationId: string
) => Promise<ApiResponse<MessageNode[]>> = (municipalityId, errandId, conversationId) => {
  if (!errandId) {
    logClientFailure('casedata.casedata-conversation.getConversationMessages');
  }
  const url = `casedata/${municipalityId}/namespace/errands/${errandId}/communication/conversations/${conversationId}/messages`;
  return apiService
    .get<ApiResponse<any>>(url)
    .then((res) => {
      return res.data;
    })
    .catch((e) => {
      logClientFailure('casedata.casedata-conversation.getConversationMessages', e);
      throw e;
    });
};

export const createConversation = async (
  municipalityId: string,
  errandId: number,
  topic: string,
  type: string,
  relationId?: string
) => {
  const url = `casedata/${municipalityId}/namespace/errand/${errandId}/communication/conversations`;

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
      logClientFailure('casedata.casedata-conversation.createConversation', e);
      throw e;
    });
};

export const sendConversationMessage = (
  municipalityId: string,
  errandId: number,
  conversationId: string,
  message: string,
  files?: FileList[],
  existingAttachments?: Attachment[]
) => {
  const url = `${municipalityId}/namespace/errand/${errandId}/communication/conversations/${conversationId}/messages`;

  const formData = new FormData();
  const messageBody: { content: string; attachmentIds?: number[] } = {
    content: message,
  };

  if (existingAttachments && existingAttachments.length > 0) {
    const ids = existingAttachments
      .map((a: any) => a.attachmentId ?? a.id)
      .filter((id: any) => id != null)
      .map((id: any) => Number(id));
    if (ids.length > 0) {
      messageBody.attachmentIds = ids;
    }
  }

  formData.append('message', JSON.stringify(messageBody));

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
      logClientFailure('casedata.casedata-conversation.sendConversationMessage', e);
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
    logClientFailure('casedata.casedata-conversation.getConversationAttachment');
  }

  const url = `casedata/${municipalityId}/namespace/errands/${errandId}/communication/conversations/${conversationId}/messages/${messageId}/attachments/${attachmentId}`;
  return apiService
    .get<ApiResponse<any>>(url)
    .then((res) => {
      return res.data;
    })
    .catch((e) => {
      logClientFailure('casedata.casedata-conversation.getConversationAttachment', e);
      throw e;
    });
};

export const getOrCreateConversationId = async (
  municipalityId: string,
  errand: IErrand,
  contactMeans: string,
  selectedRelationId: string,
  relationErrands: RelationWithErrandNumber[],
  messageConversationId: string
): Promise<string> => {
  const conversationType = contactMeans === 'draken' || contactMeans === 'katla' ? 'INTERNAL' : 'EXTERNAL';

  const selectedEntry = relationErrands.find((entry) => entry.otherResourceId === selectedRelationId);

  const conversations = await getConversations(municipalityId, errand.id);
  const existingExternalConversation = conversations.data.find((c) => c.type === 'EXTERNAL');

  const existingInternalConversation = conversations.data.find(
    (conv: any) => conv.relationIds && conv.relationIds[0] === selectedEntry?.relation.id
  );

  const existingRelationlessConversation = conversations.data.find(
    (c) => c.relationIds.length === 0 && c.type !== 'EXTERNAL'
  );

  let conversationId: string | undefined = undefined;

  if (contactMeans === 'draken' && existingInternalConversation) {
    conversationId = existingInternalConversation.id;
  }

  if (contactMeans === 'minasidor' && existingExternalConversation) {
    conversationId = existingExternalConversation.id;
  }

  if (contactMeans === 'katla' && existingRelationlessConversation) {
    conversationId = existingRelationlessConversation.id;
  }

  if (messageConversationId) {
    conversationId = messageConversationId;
  }

  if (!conversationId) {
    let topic;
    if (conversationType === 'EXTERNAL') {
      topic = `Mina sidor`;
    } else {
      topic = `${errand.errandNumber}${selectedEntry ? ` - ${selectedEntry.errandNumber}` : ''}`;
    }

    const newConversation = await createConversation(
      municipalityId,
      errand.id,
      topic,
      conversationType,
      selectedEntry?.relation.id
    );
    conversationId = newConversation.data.id;
  }

  return conversationId ?? '';
};
