'use client';

import { CasedataMessagesTab } from '@casedata/components/errand/tabs/messages/casedata-messages-tab';
import { getConversationMessages, getConversations } from '@casedata/services/casedata-conversation-service';
import { getErrand } from '@casedata/services/casedata-errand-service';
import { fetchMessagesTree, groupByConversationIdSortedTree } from '@casedata/services/casedata-message-service';
import { appConfig } from '@config/appconfig';
import { useAppContext } from '@contexts/app.context';
import { useSnackbar } from '@sk-web-gui/react';
import { SupportMessagesTab } from '@supportmanagement/components/support-errand/tabs/messages/support-messages-tab';
import { getSupportAttachments } from '@supportmanagement/services/support-attachment-service';
import {
  getSupportConversationMessages,
  getSupportConversations,
} from '@supportmanagement/services/support-conversation-service';
import { getSupportErrandById } from '@supportmanagement/services/support-errand-service';
import {
  buildTree,
  fetchSupportMessages,
  groupByConversationIdSortedTree as supportManagementGroupByConversationIdSortedTree,
} from '@supportmanagement/services/support-message-service';
import { useEffect, useState } from 'react';

const Meddelanden: React.FC = () => {
  const [messages, setMessages] = useState<any>([]);
  const [supportConversations, setSupportConversations] = useState<any>([]);
  const [messageTree, setMessageTree] = useState([]);
  const [conversationMessageTree, setConversationMessageTree] = useState([]);
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const toastMessage = useSnackbar();

  const {
    municipalityId,
    supportErrand,
    setSupportErrand,
    setSupportAttachments,
    setConversation,
    setConversationTree,
    errand,
    setErrand,
  } = useAppContext();

  useEffect(() => {
    if (appConfig.isSupportManagement && supportErrand?.id) getMessagesAndConversations();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supportErrand]);

  async function handleConversation(municipalityId: string, errandId: number) {
    try {
      const res = await getConversations(municipalityId, errandId);
      const allMessages: any[] = [];
      for (const conversation of res.data) {
        try {
          const messages = await getConversationMessages(municipalityId, errandId, conversation.id);
          const mappedMessages = messages.data.map((msgRes) => {
            if (Array.isArray(msgRes)) return msgRes;
            if (msgRes) return [msgRes];
            return [];
          });
          allMessages.push(...mappedMessages.flat());
        } catch (e) {
          console.error(`Error fetching messages for conversation ${conversation.id}: `, e);
        }
      }

      const tree = groupByConversationIdSortedTree(allMessages);
      setConversationTree(tree);
      setConversation(allMessages);
    } catch (e) {
      console.error('Error fetching conversations: ', e);
    }
  }

  const getMessagesAndConversations = () => {
    getSupportAttachments(supportErrand.id, municipalityId).then(setSupportAttachments);
    fetchSupportMessages(supportErrand.id, municipalityId).then((res) => {
      const tree = buildTree(res);
      setMessageTree(tree);
      setMessages(res);
    });
    getSupportConversations(municipalityId, supportErrand.id).then((res) => {
      Promise.all(
        res.data.map((conversation: any) =>
          getSupportConversationMessages(municipalityId, supportErrand.id, conversation.id).then((messages) => {
            return messages.data.map((msgRes) => (Array.isArray(msgRes) ? msgRes : msgRes ? [msgRes] : [])).flat();
          })
        )
      ).then((allMessageGroups) => {
        const allMessages = allMessageGroups.flat();
        const conversationTree = supportManagementGroupByConversationIdSortedTree(allMessages);

        setConversationMessageTree(conversationTree);
        setSupportConversations(allMessages);
      });
    });
  };

  const update = () => {
    if (appConfig.isSupportManagement) {
      getSupportErrandById(supportErrand.id, municipalityId).then((res) => setSupportErrand(res.errand));
      getMessagesAndConversations();
    }

    if (appConfig.isCaseData) {
      setTimeout(() => {
        getErrand(municipalityId, errand.id.toString())
          .then((res) => {
            setErrand(res.errand);
            return res;
          })
          .then((res) => fetchMessagesTree(municipalityId, errand).then(setMessages))
          .catch((e) => {
            toastMessage({
              position: 'bottom',
              closeable: false,
              message: `Något gick fel när ärendet skulle hämtas`,
              status: 'error',
            });
          });
        handleConversation(municipalityId, errand.id);
      }, 500);
    }
  };

  return (
    <>
      {appConfig.isSupportManagement && (
        <SupportMessagesTab
          messages={messages}
          messageTree={messageTree}
          supportConversations={supportConversations}
          conversationMessageTree={conversationMessageTree}
          setUnsaved={setUnsavedChanges}
          update={update}
        />
      )}

      {appConfig.isCaseData && <CasedataMessagesTab update={update} />}
    </>
  );
};

export default Meddelanden;
