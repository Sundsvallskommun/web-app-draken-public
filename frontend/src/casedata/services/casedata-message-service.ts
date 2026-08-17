import { CasedataMessageTabFormModel } from '@casedata/components/errand/tabs/messages/message-composer.component';
import { IErrand } from '@casedata/interfaces/errand';
import {
  fetchAttachment,
  fetchDecisionAttachment,
  sendAttachments,
} from '@casedata/services/casedata-attachment-service';
import { CasedataMessageType } from '@casedata/services/casedata-message-types';
import { Message } from '@common/interfaces/message';
import { Render, TemplateSelector } from '@common/interfaces/template';
import { ApiResponse, apiService } from '@common/services/api-service';
import { isMEX } from '@common/services/application-service';
import { base64ToFile } from '@common/services/attachment-service';
import { base64Decode } from '@common/services/helper-service';
import { UploadFile } from '@sk-web-gui/react';
import dayjs from 'dayjs';
import { MessageResponse } from 'src/data-contracts/backend/data-contracts';

export const sendDecisionMessage: (
  municipalityId: string,
  errand: IErrand,
  html: string,
  plaintext: string
) => Promise<boolean> = (municipalityId, errand, html, plaintext) => {
  return apiService
    .post<ApiResponse<MessageResponse>[], { errandId: string; html: string; plaintext: string }>(
      `casedata/${municipalityId}/message/decision`,
      {
        errandId: errand.id.toString(),
        html,
        plaintext,
      }
    )
    .then((res) => {
      const allSuccess = res.data.every((c) => c?.data?.messageId);
      if (allSuccess) return true;
      throw new Error('Not all channels returned a messageId');
    })
    .catch((e) => {
      throw new Error(e?.response?.data?.message || 'Något gick fel när beslutet skulle skickas');
    });
};

// Use multipart/form-data
export const sendMessage: (
  municipalityId: string,
  errand: IErrand,
  data: CasedataMessageTabFormModel
) => Promise<boolean> = async (municipalityId, errand, data) => {
  const url =
    data.contactMeans === 'webmessage' ? `casedata/${municipalityId}/webmessage` : `casedata/${municipalityId}/email`;

  const targets = data.contactMeans === 'webmessage' ? [{ value: '' }] : [...data.emails];
  const msgPromises = targets.map(async (target) => {
    const messageFormData = new FormData();

    // Newly picked files are already in hand; only the mime type needs correcting, since
    // the browser does not detect msg files properly.
    (data.messageAttachments ?? []).forEach((f) => {
      const fileItem = f.file?.[0];
      if (!fileItem) {
        return;
      }
      const mimeType = fileItem.name.split('.').pop() === 'msg' ? 'application/vnd.ms-outlook' : fileItem.type;
      messageFormData.append(`files`, new Blob([fileItem], { type: mimeType }), fileItem.name);
    });

    // Attachments already on the errand carry metadata only, so their content has to
    // be fetched one by one before it can be attached to the message.
    const existingAttachmentPromises = (data.existingAttachments ?? []).map(async (existingAttachment) => {
      if (!existingAttachment.id) {
        throw new Error('Existing attachment does not have an id');
      }
      const fetched = existingAttachment.decisionId
        ? await fetchDecisionAttachment(municipalityId, errand.id, existingAttachment.decisionId, existingAttachment)
        : await fetchAttachment(municipalityId, errand.id, existingAttachment);
      return base64ToFile(fetched.base64EncodedString, existingAttachment.name, existingAttachment.mimeType);
    });

    return Promise.allSettled(existingAttachmentPromises)
      .then((results) => {
        results.forEach((result) => {
          if (result.status === 'fulfilled') {
            messageFormData.append(`files`, result.value, result.value.name);
          } else {
            console.error(`Error: attachment could not be processed for the following reason: ${result.reason}`);
          }
        });
      })
      .then(() => {
        messageFormData.append('email', Object(target).value);
        messageFormData.append('contactMeans', data.contactMeans);
        messageFormData.append('subject', `Ärende #${errand.errandNumber}`);
        messageFormData.append(
          'text',
          data.contactMeans === 'webmessage' ? data.messageBodyPlaintext : data.messageBody
        );
        messageFormData.append('attachUtredning', data.attachUtredning ? 'true' : 'false');
        messageFormData.append('errandId', errand.id.toString());
        messageFormData.append('municipalityId', municipalityId);
        messageFormData.append('messageClassification', data.messageClassification || '');
        messageFormData.append('reply_to', data.headerReplyTo || '');
        messageFormData.append('references', data.headerReferences || '');

        return apiService
          .post<boolean, FormData>(url, messageFormData, { headers: { 'Content-Type': 'multipart/form-data' } })
          .then(() => {
            if (data.newAttachments.length) {
              const uploadFiles: UploadFile[] = data.newAttachments.reduce<UploadFile[]>((acc, fObj) => {
                if (!fObj.file || fObj.file.length === 0) return acc;
                const file = fObj.file[0];
                const parts = file.name.split('.');
                const ending = parts.length > 1 ? parts.pop() : '';
                const name = parts.join('.');
                acc.push({
                  id: '',
                  file,
                  meta: {
                    name: name,
                    ending: ending ?? '',
                    category: isMEX() ? 'OTHER' : 'OTHER_ATTACHMENT',
                  },
                });
                return acc;
              }, []);

              sendAttachments(municipalityId, errand.id, errand.errandNumber, uploadFiles);
            }
            data.newAttachments = [];

            return true;
          })
          .catch((e) => {
            console.error('Something went wrong when sending message for errand:', errand);
            throw new Error('Något gick fel när beslutet skulle skickas');
          });
      });
  });
  return Promise.all(msgPromises).then((results) => results.every((r) => r));
};

export const sendSms: (
  municipalityId: string,
  errand: IErrand,
  data: CasedataMessageTabFormModel
) => Promise<boolean> = async (municipalityId, errand, data) => {
  const msgPromises = [...data.phoneNumbers].map(async (target) => {
    const messageData: { errandId: string; municipalityId: string; phonenumber: string; text: string } = {
      phonenumber: Object(target).value.replace('-', ''),
      text: data.messageBodyPlaintext,
      errandId: errand.id.toString(),
      municipalityId: municipalityId,
    };
    return apiService
      .post<boolean, any>(`casedata/${municipalityId}/sms`, messageData, {
        headers: { 'Content-Type': 'application/json' },
      })
      .then((res) => {
        return true;
      })
      .catch((e) => {
        console.error('Something went wrong when sending message for errand:', errand);
        throw e;
      });
  });
  return Promise.all(msgPromises).then((results) => results.every((r) => r));
};

const sortMessagesBySentDesc = (messages: MessageResponse[]): MessageResponse[] => {
  return messages.sort((a, b) =>
    dayjs(a.sent).isAfter(dayjs(b.sent)) ? -1 : dayjs(b.sent).isAfter(dayjs(a.sent)) ? 1 : 0
  );
};

export const countAllMessages = (tree: MessageNode[]): number => {
  if (!tree) {
    return 0;
  }
  let c = 0;
  c += tree.length;
  tree.forEach((root) => {
    c += countAllMessages(root.children ?? []);
  });
  return c;
};

export const countUnreadMessages = (tree: MessageNode[]): number => {
  if (!tree) {
    return 0;
  }
  let c = 0;
  c += tree.filter((node) => !node.viewed).length;
  tree.forEach((root) => {
    c += countUnreadMessages(root.children ?? []);
  });
  return c;
};

export interface MessageNode extends MessageResponse {
  children?: MessageNode[];
  conversationId?: string;
}

export const groupByConversationIdSortedTree = (messages: MessageNode[]): MessageNode[] => {
  const conversationMap: Map<string, MessageNode[]> = new Map();

  messages.forEach((msg) => {
    if (!msg.conversationId) return;
    if (!conversationMap.has(msg.conversationId)) {
      conversationMap.set(msg.conversationId, []);
    }
    conversationMap.get(msg.conversationId)?.push(msg);
  });

  const trees: MessageNode[] = [];
  conversationMap.forEach((msgList) => {
    const sorted = msgList.toSorted((a, b) => (dayjs(a.sent).isAfter(dayjs(b.sent)) ? 1 : -1));

    let prevNode: MessageNode | null = null;
    let rootNode: MessageNode | null = null;
    sorted.forEach((msg) => {
      const node: MessageNode = { ...msg, children: [] };
      if (!prevNode) {
        rootNode = node;
      } else {
        prevNode.children = [node];
      }
      prevNode = node;
    });

    if (rootNode) {
      trees.push(rootNode);
    }
  });

  return trees;
};

const buildTree = (_list: MessageResponse[]) => {
  const nodesMap: Map<string, MessageNode> = new Map();
  const roots: MessageNode[] = [];
  const list: MessageResponse[] = _list.sort((a, b) =>
    dayjs(a.sent).isAfter(dayjs(b.sent)) ? -1 : dayjs(b.sent).isAfter(dayjs(a.sent)) ? 1 : 0
  );
  list.forEach((msg) => {
    msg.message = msg.message?.replace(/\r\n/g, '<br>');
    const id =
      msg.messageType === CasedataMessageType.Email
        ? (msg.emailHeaders ?? []).find((h) => h.header === 'MESSAGE_ID')?.values?.[0]
        : msg.messageId;
    if (id) {
      nodesMap.set(id, { ...msg, children: [] });
    }
  });

  list.forEach((msg) => {
    const id =
      msg.messageType === CasedataMessageType.Email
        ? (msg.emailHeaders ?? []).find((h) => h.header === 'MESSAGE_ID')?.values?.[0]
        : msg.messageId;
    const parent = (msg.emailHeaders ?? []).find((h) => h.header === 'IN_REPLY_TO')?.values?.[0];
    if (parent) {
      const parentMsg = nodesMap.get(parent);
      const node = id ? nodesMap.get(id) : undefined;
      if (parentMsg && node) {
        parentMsg.children?.push(node);
      } else if (node) {
        roots.push(node);
      }
    } else {
      const node = id ? nodesMap.get(id) : undefined;
      if (node) {
        roots.push(node);
      }
    }
  });

  return roots;
};

const getErrandMessages = (municipalityId: string, errand: IErrand): Promise<MessageResponse[]> => {
  if (!errand?.errandNumber || !municipalityId) {
    console.error('No errand id or municipality id found, cannot fetch messages. Returning.');
  }

  return apiService
    .get<ApiResponse<MessageResponse[]>>(`casedata/${municipalityId}/errand/${errand?.id}/messages`)
    .then((res) => res.data.data);
};

export const fetchMessagesWithTree: (
  municipalityId: string,
  errand: IErrand
) => Promise<{ messages: MessageResponse[]; messageTree: MessageNode[] }> = (municipalityId, errand) => {
  return getErrandMessages(municipalityId, errand)
    .then((res) => {
      const messages = sortMessagesBySentDesc([...res]);
      const messageTree = buildTree(res.map((message) => ({ ...message })));
      return { messages, messageTree };
    })
    .catch((e) => {
      console.error('Something went wrong when fetching messages for errand:', errand.id, e);
      throw e;
    });
};

export const fetchMessage: (municipalityId: string, messageId: string) => Promise<ApiResponse<Message>> = (
  municipalityId,
  messageId
) => {
  if (!messageId) {
    console.error('No message id found, cannot fetch message. Returning.');
  }
  const url = `casedata/${municipalityId}/messages/${messageId}`;
  return apiService
    .get<ApiResponse<Message>>(url)
    .then((res) => res.data)
    .catch((e) => {
      console.error('Something went wrong when fetching message: ', messageId);
      throw e;
    });
};

export const setMessageViewStatus: (
  errandId: string,
  municipalityId: string,
  messageId: string,
  isViewed: boolean
) => Promise<ApiResponse<any>> = (errandId, municipalityId, messageId, isViewed) => {
  if (!messageId) {
    console.error('No message id found, cannot fetch. Returning.');
  }
  const url = `casedata/${municipalityId}/errand/${errandId}/messages/${messageId}/viewed/${isViewed}`;
  return apiService
    .put<ApiResponse<any>, any>(url, {})
    .then((res) => res.data)
    .catch((e) => {
      console.error('Something went wrong when setting messgae isViewed status: ', messageId);
      throw e;
    });
};

export const renderMessageWithTemplates: (inData: string) => Promise<{ html: string; error?: string }> = async (
  data
) => {
  const identifier = `mex.message`;
  const renderBody: TemplateSelector = {
    identifier: identifier,
    parameters: {
      caseNumber: '',
      administratorName: '',
      description: data.replace(/<p>/g, '<p style="margin: 0;">'),
      decisionDate: '',
    },
  };
  return apiService
    .post<ApiResponse<Render>, TemplateSelector>('render', renderBody)
    .then((res) => {
      const html = base64Decode(res.data.data.output);
      return { html };
    })
    .catch((e) => {
      throw new Error('Något gick fel när mallen skulle renderas');
    });
};
