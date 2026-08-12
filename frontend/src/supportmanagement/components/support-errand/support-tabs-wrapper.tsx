import WarnIfUnsavedChanges from '@common/utils/warnIfUnsavedChanges';
import { appConfig } from '@config/appconfig';
import { cx, Tabs } from '@sk-web-gui/react';
import { useConfigStore, useSupportStore } from '@stores/index';
import { SupportErrandInvoiceTab } from '@supportmanagement/components/support-errand/tabs/support-errand-invoice-tab';
import { SupportErrandRecruitmentTab } from '@supportmanagement/components/support-errand/tabs/support-errand-recruitment-tab';
import { countAttachment, getSupportAttachments } from '@supportmanagement/services/support-attachment-service';
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
import { Dispatch, FC, ReactNode, SetStateAction, useCallback, useEffect, useMemo, useState } from 'react';
import { useFormContext, UseFormReturn, useFormState } from 'react-hook-form';

import type { InvestigationDocumentKey } from '../../investigation/investigation-document';
import { SupportErrandInvestigationTab } from '../../investigation/support-errand-investigation-tab';
import { SupportMessagesTab } from './tabs/messages/support-messages-tab';
import { SupportErrandServicesTab } from './tabs/services/support-errand-services-tab';
import { SupportErrandAttachmentsTab } from './tabs/support-errand-attachments-tab';
import { SupportErrandBasicsTab } from './tabs/support-errand-basics-tab';
import { SupportErrandDetailsTab } from './tabs/support-errand-details-tab';

export const SupportTabsWrapper: FC<{
  setUnsavedFacility: Dispatch<SetStateAction<boolean>>;
}> = (props) => {
  const [messages, setMessages] = useState<any>([]);
  const [supportConversations, setSupportConversations] = useState<any>([]);
  const [messageTree, setMessageTree] = useState<MessageNode[]>([]);
  const [conversationMessageTree, setConversationMessageTree] = useState<MessageNode[]>([]);
  const municipalityId = useConfigStore((s) => s.municipalityId);
  const { supportErrand, setSupportErrand, supportAttachments, setSupportAttachments } = useSupportStore();

  const [tabUnsavedChanges, setTabUnsavedChanges] = useState(false);
  const [investigationDirty, setInvestigationDirty] = useState<Partial<Record<InvestigationDocumentKey, boolean>>>({});

  const methods: UseFormReturn<SupportErrand, any, undefined> = useFormContext();
  const { isDirty: isErrandDirty } = useFormState({ control: methods.control });

  const { activeTabKey, setActiveTabKey } = useSupportStore();

  const unsavedChanges = isErrandDirty || tabUnsavedChanges || Object.values(investigationDirty).some(Boolean);

  const setInvestigationDocumentDirty = useCallback((key: InvestigationDocumentKey, isDirty: boolean) => {
    setInvestigationDirty((current) => (current[key] === isDirty ? current : { ...current, [key]: isDirty }));
  }, []);

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
    key: string;
    label: string;
    content: ReactNode;
    disabled: boolean;
    visibleFor: boolean;
  }[] = useMemo(
    () => [
      {
        key: 'basics',
        label: 'Grundinformation',
        content: supportErrand && (
          <SupportErrandBasicsTab
            setUnsavedFacility={props.setUnsavedFacility}
            errand={supportErrand}
            setUnsaved={setTabUnsavedChanges}
            update={update}
          />
        ),
        disabled: false,
        visibleFor: true,
      },
      {
        key: 'details',
        label: 'Ärendeuppgifter',
        content: supportErrand && <SupportErrandDetailsTab />,
        disabled: false,
        visibleFor: appConfig.features.useDetailsTab,
      },
      {
        key: 'investigation',
        label: 'Utredning',
        content: supportErrand && <SupportErrandInvestigationTab onDirtyChange={setInvestigationDocumentDirty} />,
        disabled: false,
        visibleFor: appConfig.features.useInvestigation,
      },
      {
        key: 'messages',
        label: `Meddelanden (${countUnreadMessages(messages)})`,
        content: supportErrand && (
          <SupportMessagesTab
            messages={messages}
            messageTree={messageTree}
            supportConversations={supportConversations}
            conversationMessageTree={conversationMessageTree}
            setUnsaved={setTabUnsavedChanges}
            update={update}
            municipalityId={municipalityId}
          />
        ),
        disabled: false,
        visibleFor: true,
      },
      {
        key: 'attachments',
        label: `Bilagor (${countAttachment(supportAttachments ?? [])})`,
        content: supportErrand && <SupportErrandAttachmentsTab update={update} />,
        disabled: false,
        visibleFor: true,
      },
      {
        key: 'services',
        label: 'Beslut och dokument',
        content: supportErrand && (
          <SupportErrandServicesTab
            partyId={supportErrand?.stakeholders?.find((s) => s.role === 'PRIMARY')?.externalId ?? ''}
          />
        ),
        disabled: false,
        visibleFor: appConfig.features.useServices && !!supportErrand?.stakeholders?.some((s) => s.role === 'PRIMARY'),
      },
      {
        key: 'recruitment',
        label: 'Rekryteringsprocess',
        content: supportErrand && <SupportErrandRecruitmentTab setUnsaved={setTabUnsavedChanges} update={update} />,
        disabled: false,
        visibleFor: appConfig.features.useRecruitment,
      },
      {
        key: 'invoice',
        label: 'Fakturering',
        content: supportErrand && (
          <SupportErrandInvoiceTab errand={supportErrand} setUnsaved={setTabUnsavedChanges} update={update} />
        ),
        disabled: false,
        visibleFor: appConfig.features.useBilling,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      conversationMessageTree,
      messageTree,
      messages,
      municipalityId,
      props.setUnsavedFacility,
      supportAttachments,
      supportConversations,
      supportErrand,
      setInvestigationDocumentDirty,
    ]
  );

  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    const index = tabs.filter((tab) => tab.visibleFor).findIndex((tab) => tab.key === activeTabKey);
    setActiveTab(index >= 0 ? index : 0);
  }, [activeTabKey, tabs]);

  return (
    <>
      <div className="mb-xl">
        <WarnIfUnsavedChanges showWarning={unsavedChanges}>
          <Tabs
            className="border-1 rounded-12 bg-background-content pt-22 pl-5"
            tabslistClassName="border-0 border-red-500 -m-b-12 flex-wrap ml-10"
            panelsClassName="border-t-1"
            current={activeTab}
            onTabChange={(e) => {
              setActiveTabKey(tabs.filter((tab) => tab.visibleFor)[e].key);
            }}
            size={'sm'}
          >
            {tabs
              .filter((tab) => tab.visibleFor)
              .map((tab, index) => (
                <Tabs.Item key={tab.key}>
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
