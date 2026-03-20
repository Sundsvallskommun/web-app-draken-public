import { useConfigStore, useSupportStore } from '@stores/index';
import WarnIfUnsavedChanges from '@common/utils/warnIfUnsavedChanges';
import { appConfig } from '@config/appconfig';
import { cx, Tabs } from '@sk-web-gui/react';
import { SupportErrandInvoiceTab } from '@supportmanagement/components/support-errand/tabs/support-errand-invoice-tab';
import { SupportErrandRecruitmentTab } from '@supportmanagement/components/support-errand/tabs/support-errand-recruitment-tab';
import {
  countAttachment,
  getSupportAttachments,
  SupportAttachment,
} from '@supportmanagement/services/support-attachment-service';
import {
  getSupportConversationMessages,
  getSupportConversations,
} from '@supportmanagement/services/support-conversation-service';
import { getSupportErrandById, SupportErrand } from '@supportmanagement/services/support-errand-service';
import {
  buildTree,
  countUnreadMessages,
  fetchSupportMessages,
  groupByConversationIdSortedTree,
  MessageNode,
} from '@supportmanagement/services/support-message-service';
import { Dispatch, SetStateAction, useEffect, useState } from 'react';
import { useFormContext, UseFormReturn } from 'react-hook-form';
import { SupportMessagesTab } from './tabs/messages/support-messages-tab';
import { SupportErrandAttachmentsTab } from './tabs/support-errand-attachments-tab';
import { SupportErrandBasicsTab } from './tabs/support-errand-basics-tab';
import { SupportErrandDetailsTab } from './tabs/support-errand-details-tab';

export const SupportTabsWrapper: React.FC<{
  setUnsavedFacility: Dispatch<SetStateAction<boolean>>;
}> = (props) => {
  const [messages, setMessages] = useState<any>([]);
  const [supportConversations, setSupportConversations] = useState<any>([]);
  const [messageTree, setMessageTree] = useState<MessageNode[]>([]);
  const [conversationMessageTree, setConversationMessageTree] = useState<MessageNode[]>([]);
  const municipalityId = useConfigStore((s) => s.municipalityId);
  const supportErrand = useSupportStore((s) => s.supportErrand);
  const setSupportErrand = useSupportStore((s) => s.setSupportErrand);
  const supportAttachments = useSupportStore((s) => s.supportAttachments);
  const setSupportAttachments = useSupportStore((s) => s.setSupportAttachments);

  const [subFormUnsaved, setSubFormUnsaved] = useState(false);

  const methods: UseFormReturn<SupportErrand, any, undefined> = useFormContext();

  const { formState: { isDirty, dirtyFields } } = methods;
  const unsavedChanges = (isDirty && Object.keys(dirtyFields).length > 0) || subFormUnsaved;

  const getMessagesAndConversations = () => {
    getSupportAttachments(supportErrand!.id!, municipalityId).then(setSupportAttachments);
    fetchSupportMessages(supportErrand!.id!, municipalityId).then((res) => {
      const tree = buildTree(res);
      setMessageTree(tree);
      setMessages(res);
    });
    getSupportConversations(municipalityId, supportErrand!.id!).then((res) => {
      Promise.all(
        res.data.map((conversation: any) =>
          getSupportConversationMessages(municipalityId, supportErrand!.id!, conversation.id).then((messages) => {
            return messages.data.map((msgRes) => (Array.isArray(msgRes) ? msgRes : msgRes ? [msgRes] : [])).flat();
          })
        )
      ).then((allMessageGroups) => {
        const allMessages = allMessageGroups.flat();
        const conversationTree = groupByConversationIdSortedTree(allMessages);

        setConversationMessageTree(conversationTree);
        setSupportConversations(allMessages);
      });
    });
  };

  const update = () => {
    if (supportErrand?.id) {
      getSupportErrandById(supportErrand.id, municipalityId).then((res) => setSupportErrand(res.errand));
      getMessagesAndConversations();
    }
  };

  useEffect(() => {
    if (supportErrand?.id) {
      getMessagesAndConversations();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supportErrand]);

  const tabs: {
    label: string;
    content: React.ReactNode;
    disabled: boolean;
    visibleFor: boolean;
  }[] = [
    {
      label: 'Grundinformation',
      content: supportErrand && (
        <SupportErrandBasicsTab
          setUnsavedFacility={props.setUnsavedFacility}
          errand={supportErrand}
          setUnsaved={setSubFormUnsaved}
          update={update}
        />
      ),
      disabled: false,
      visibleFor: true,
    },
    {
      label: 'Ärendeuppgifter',
      content: supportErrand && <SupportErrandDetailsTab />,
      disabled: false,
      visibleFor: appConfig.features.useDetailsTab,
    },
    {
      label: `Meddelanden (${countUnreadMessages(messages)})`,
      content: supportErrand && (
        <SupportMessagesTab
          messages={messages}
          messageTree={messageTree}
          supportConversations={supportConversations}
          conversationMessageTree={conversationMessageTree}
          setUnsaved={setSubFormUnsaved}
          update={update}
          municipalityId={municipalityId}
        />
      ),
      disabled: false,
      visibleFor: true,
    },
    {
      label: `Bilagor (${countAttachment(supportAttachments ?? [])})`,
      content: supportErrand && <SupportErrandAttachmentsTab update={update} />,
      disabled: false,
      visibleFor: true,
    },
    {
      label: 'Rekryteringsprocess',
      content: supportErrand && <SupportErrandRecruitmentTab setUnsaved={setSubFormUnsaved} update={update} />,
      disabled: false,
      visibleFor: appConfig.features.useRecruitment,
    },
    {
      label: 'Fakturering',
      content: supportErrand && (
        <SupportErrandInvoiceTab errand={supportErrand} setUnsaved={setSubFormUnsaved} update={update} />
      ),
      disabled: false,
      visibleFor: appConfig.features.useBilling,
    },
  ];

  return (
    <>
      <div className="mb-xl">
        <WarnIfUnsavedChanges showWarning={unsavedChanges}>
          <Tabs
            className="border-1 rounded-12 bg-background-content pt-22 pl-5"
            tabslistClassName="border-0 border-red-500 -m-b-12 flex-wrap ml-10"
            panelsClassName="border-t-1"
            current={0}
            onTabChange={() => {}}
            size={'sm'}
          >
            {tabs
              .filter((tab) => tab.visibleFor)
              .map((tab, index) => (
                <Tabs.Item key={tab.label}>
                  <Tabs.Button disabled={tab.disabled} className={cx('text-base', index === 0 && 'ml-8')}>
                    {tab.label}
                  </Tabs.Button>
                  <Tabs.Content>{tab.content}</Tabs.Content>
                </Tabs.Item>
              ))}
          </Tabs>
        </WarnIfUnsavedChanges>
      </div>
    </>
  );
};
