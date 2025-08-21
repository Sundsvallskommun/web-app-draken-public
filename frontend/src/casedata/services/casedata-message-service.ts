import { CasedataMessageTabFormModel } from '@casedata/components/errand/tabs/messages/message-composer.component';
import { Attachment } from '@casedata/interfaces/attachment';
import { IErrand } from '@casedata/interfaces/errand';
import { sendAttachments } from '@casedata/services/casedata-attachment-service';
import { Message, MessageStatus } from '@common/interfaces/message';
import { Render, TemplateSelector } from '@common/interfaces/template';
import { ApiResponse, apiService } from '@common/services/api-service';
import { isMEX } from '@common/services/application-service';
import { base64Decode } from '@common/services/helper-service';
import { toBase64 } from '@common/utils/toBase64';
import dayjs from 'dayjs';
import { MessageResponse } from 'src/data-contracts/backend/data-contracts';

export const sendDecisionMessage: (municipalityId: string, errand: IErrand) => Promise<boolean> = (
  municipalityId,
  errand
) => {
  return apiService
    .post<ApiResponse<MessageResponse>, { errandId: string }>(`casedata/${municipalityId}/message/decision`, {
      errandId: errand.id.toString(),
    })
    .then((res) => {
      if (res.data.data.messageId) {
        return true;
      }
      throw 'No message id received';
    })
    .catch((e) => {
      throw new Error('Något gick fel när beslutet skulle skickas');
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
    const newAttachmentPromises: Promise<{ attachment: Attachment; blob: Blob }>[] = data.messageAttachments?.map(
      async (f) => {
        const fileItem = f.file[0];
        const fileData = await toBase64(fileItem);
        const attachment: Attachment = {
          category: 'MESSAGE_ATTACHMENT',
          name: fileItem.name,
          note: '',
          extension: fileItem.name.split('.').pop(),
          // msg files not handled properly by the browser, so we need to set the mime type manually
          mimeType: fileItem.name.split('.').pop() === 'msg' ? 'application/vnd.ms-outlook' : fileItem.type,
          file: fileData,
        };
        const buf = Buffer.from(attachment.file, 'base64');
        const blob = new Blob([buf], { type: attachment.mimeType });
        return Promise.resolve({ attachment, blob });
      }
    ) || [new Promise((resolve) => resolve({ attachment: null, blob: null }))];
    return Promise.allSettled(newAttachmentPromises)
      .then((r) => {
        r.forEach((r) => {
          if (r.status === 'fulfilled') {
            const attachment = r.value.attachment;
            const blob = r.value.blob;
            messageFormData.append(`files`, blob, attachment.name);
          } else {
            console.error(`Error: attachment could not be processed for the following reason: ${r.reason}`);
          }
        });
      })
      .then(() => {
        data.existingAttachments?.forEach((attachment) => {
          const buf = Buffer.from(attachment.file, 'base64');
          const blob = new Blob([buf], { type: attachment.mimeType });
          messageFormData.append(`files`, blob, attachment.name);
        });

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
              const attachmentsToSave: { type: string; file: FileList; attachmentName: string }[] =
                data.newAttachments?.map((f) => {
                  return {
                    type: isMEX() ? 'OTHER' : 'OTHER_ATTACHMENT',
                    file: f.file,
                    attachmentName: f.file[0].name,
                  };
                });

              sendAttachments(municipalityId, errand.id, errand.errandNumber, attachmentsToSave);
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

const sortBySentDate = (a, b) =>
  dayjs(a.sent).isAfter(dayjs(b.sent)) ? 1 : dayjs(b.sent).isAfter(dayjs(a.sent)) ? -1 : 0;

export const countAllMessages = (tree: MessageNode[]): number => {
  if (!tree) {
    return 0;
  }
  let c = 0;
  c += tree.length;
  tree.forEach((root) => {
    c += countAllMessages(root.children);
  });
  return c;
};

export const countUnreadMessages = (tree: MessageNode[], conversationMessages: any): number => {
  let c = conversationMessages?.filter((m) => !m.viewed)?.length ?? 0;
  if (!tree) {
    return 0;
  }
  c += tree.filter((node) => !node.viewed).length;
  tree.forEach((root) => {
    c += countUnreadMessages(root.children, []);
  });
  return c;
};

// export const countAllChildren = (node: MessageNode): number => {
//   let c = node.children?.length || 0;
//   node.children?.forEach((n) => {
//     c += countAllChildren(n);
//   });
//   return c;
// };

// export const countUnreadChildren = (node: MessageNode): number => {
//   let c = node.children.filter((c) => !c.viewed)?.length || 0;
//   node.children?.forEach((n) => {
//     c += countUnreadChildren(n);
//   });
//   return c;
// };

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
      msg.messageType === 'EMAIL'
        ? msg.emailHeaders.find((h) => h.header === 'MESSAGE_ID')?.values?.[0]
        : msg.messageId;
    nodesMap.set(id, { ...msg, children: [] });
  });

  list.forEach((msg) => {
    const id =
      msg.messageType === 'EMAIL'
        ? msg.emailHeaders.find((h) => h.header === 'MESSAGE_ID')?.values?.[0]
        : msg.messageId;
    const parent = msg.emailHeaders.find((h) => h.header === 'IN_REPLY_TO')?.values?.[0];
    if (parent) {
      const parentMsg = nodesMap.get(parent);
      parentMsg?.children?.push(nodesMap.get(id));
    } else {
      roots.push(nodesMap.get(id));
    }
  });

  return roots;
};

export const fetchMessagesTree: (municipalityId: string, errand: IErrand) => Promise<MessageNode[]> = (
  municipalityId,
  errand
) => {
  if (!errand?.errandNumber || !municipalityId) {
    console.error('No errand id or municipality id found, cannot fetch messages. Returning.');
  }
  return apiService
    .get<ApiResponse<MessageResponse[]>>(`casedata/${municipalityId}/errand/${errand?.id}/messages`)
    .then((res) => {
      return res.data.data; //.sort(sortBySentDate); //.reduce(findLastInThread, []);
    })
    .then((res) => {
      const tree = buildTree(res);
      return tree;
    })
    .catch((e) => {
      console.error('Something went wrong when fetching messages for errand:', errand.id, e);
      throw e;
    });
};

export const fetchMessages: (municipalityId: string, errand: IErrand) => Promise<MessageResponse[]> = (
  municipalityId,
  errand
) => {
  if (!errand?.errandNumber || !municipalityId) {
    console.error('No errand id or municipality id found, cannot fetch messages. Returning.');
  }
  return apiService
    .get<ApiResponse<MessageResponse[]>>(`casedata/${municipalityId}/errand/${errand?.id}/messages`)
    .then((res) => {
      const list: MessageResponse[] = res.data.data.sort((a, b) =>
        dayjs(a.sent).isAfter(dayjs(b.sent)) ? -1 : dayjs(b.sent).isAfter(dayjs(a.sent)) ? 1 : 0
      );
      return list;
    })
    .catch((e) => {
      console.error('Something went wrong when fetching messages for errand:', errand.errandNumber, e);
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

export const messageStatusMap = (s: MessageStatus) => {
  switch (s) {
    case 'AWAITING_FEEDBACK':
      return 'Väntar på status';
    case 'PENDING':
      return 'Väntar';
    case 'SENT':
      return 'Skickat';
    case 'FAILED':
      return 'Misslyckades';
    case 'NO_FEEDBACK_SETTINGS_FOUND':
      return 'Okänt';
    case 'NO_FEEDBACK_WANTED':
      return 'Okänt';
  }
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
