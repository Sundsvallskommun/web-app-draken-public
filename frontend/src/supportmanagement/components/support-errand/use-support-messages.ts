import { useConfigStore, useSupportStore } from '@stores/index';
import { SupportMessages } from '@stores/support-store';
import {
  getSupportConversationMessages,
  getSupportConversationReadByCounts,
  getSupportConversations,
} from '@supportmanagement/services/support-conversation-service';
import { getSupportErrandById } from '@supportmanagement/services/support-errand-service';
import {
  buildTree,
  fetchSupportMessages,
  groupByConversationIdSortedTree,
  Message,
} from '@supportmanagement/services/support-message-service';
import { useCallback, useEffect } from 'react';

// One empty list for all, so the lists keep their identity between renders while nothing is read.
const noMessages: Message[] = [];

const readConversationMessages = async (municipalityId: string, errandId: string): Promise<Message[]> => {
  const conversations = await getSupportConversations(municipalityId, errandId);
  const perConversation = await Promise.all(
    conversations.data.map((conversation: any) =>
      getSupportConversationMessages(municipalityId, errandId, conversation.id).then((res) =>
        res.data.map((msg) => (Array.isArray(msg) ? msg : msg ? [msg] : [])).flat()
      )
    )
  );
  return perConversation.flat();
};

const readMessages = async (municipalityId: string, errandId: string): Promise<SupportMessages> => {
  const [messages, conversationMessages, conversationReadByCounts] = await Promise.all([
    fetchSupportMessages(errandId, municipalityId),
    readConversationMessages(municipalityId, errandId),
    getSupportConversationReadByCounts(municipalityId, errandId).catch(() => []),
  ]);
  return {
    errandId,
    messages,
    messageTree: buildTree(messages),
    conversationMessages,
    conversationMessageTree: groupByConversationIdSortedTree(conversationMessages),
    conversationReadByCounts,
  };
};

/**
 * The errand's messages, fetched by whoever shows them, so the messages block works
 * wherever it is placed on the page. The tab title reads the same messages from the store.
 */
export const useSupportMessages = () => {
  const errandId = useSupportStore((s) => s.supportErrand?.id);
  const errandModified = useSupportStore((s) => s.supportErrand?.modified);
  const storedMessages = useSupportStore((s) => s.supportMessages);
  // The store keeps the previous errand's messages until the new ones are read.
  const supportMessages = storedMessages?.errandId === errandId ? storedMessages : undefined;
  const setSupportMessages = useSupportStore((s) => s.setSupportMessages);
  const setSupportErrand = useSupportStore((s) => s.setSupportErrand);
  const municipalityId = useConfigStore((s) => s.municipalityId);

  const fetchMessages = useCallback(async () => {
    if (!errandId) return;
    const read = await readMessages(municipalityId, errandId);
    const stillTheSameErrand = useSupportStore.getState().supportErrand?.id === errandId;
    if (stillTheSameErrand) setSupportMessages(read);
  }, [errandId, municipalityId, setSupportMessages]);

  // A changed errand may have new messages, so they are read again when it changes.
  useEffect(() => {
    fetchMessages().catch((e) => console.error('Could not read the errand messages', e));
  }, [fetchMessages, errandModified]);

  /**
   * After a message was sent or read: the errand may have changed with it, so both are read again.
   * It never rejects, so a failed reload is not reported as a failed send.
   */
  const refresh = useCallback(async () => {
    if (!errandId) return;
    await Promise.allSettled([
      fetchMessages(),
      getSupportErrandById(errandId, municipalityId).then((res) => setSupportErrand(res.errand)),
    ]);
  }, [errandId, municipalityId, fetchMessages, setSupportErrand]);

  return {
    messages: supportMessages?.messages ?? noMessages,
    messageTree: supportMessages?.messageTree ?? noMessages,
    conversationMessages: supportMessages?.conversationMessages ?? noMessages,
    conversationMessageTree: supportMessages?.conversationMessageTree ?? noMessages,
    refresh,
  };
};
