import type { ProcessActivity } from '@common/data-contracts/supportmanagement/data-contracts';
import WarnIfUnsavedChanges from '@common/utils/warnIfUnsavedChanges';
import { appConfig } from '@config/appconfig';
import { cx, Tabs, useConfirm } from '@sk-web-gui/react';
import { useConfigStore, useSupportStore } from '@stores/index';
import { SupportErrandInvoiceTab } from '@supportmanagement/components/support-errand/tabs/support-errand-invoice-tab';
import { SupportErrandRecruitmentTab } from '@supportmanagement/components/support-errand/tabs/support-errand-recruitment-tab';
import { countAttachment, getSupportAttachments } from '@supportmanagement/services/support-attachment-service';
import {
  ConversationReadByCount,
  getConversationMessageCountSummary,
  getSupportConversationMessages,
  getSupportConversationReadByCounts,
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
import {
  getSupportErrandProcess,
  getSupportProcessActivities,
  hasVisitedSupportProcessStep,
  SupportProcessStep,
  SupportProcessStepName,
  supportProcessStepName,
} from '@supportmanagement/services/support-process-service';
import { Dispatch, FC, ReactNode, SetStateAction, useCallback, useEffect, useMemo, useState } from 'react';
import { useFormContext, UseFormReturn } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { SupportMessagesTab } from './tabs/messages/support-messages-tab';
import { SupportErrandServicesTab } from './tabs/services/support-errand-services-tab';
import { SupportErrandAttachmentsTab } from './tabs/support-errand-attachments-tab';
import { SupportErrandBasicsTab } from './tabs/support-errand-basics-tab';
import { SupportErrandDecisionTab } from './tabs/support-errand-decision-tab';
import { SupportErrandDetailsTab } from './tabs/support-errand-details-tab';
import { SupportErrandFollowUpTab } from './tabs/support-errand-followup-tab';
import { SupportErrandInvestigationTab } from './tabs/support-errand-investigation-tab';

export const SupportTabsWrapper: FC<{
  setUnsavedFacility: Dispatch<SetStateAction<boolean>>;
}> = (props) => {
  const [messages, setMessages] = useState<any>([]);
  const [supportConversations, setSupportConversations] = useState<any>([]);
  const [messageTree, setMessageTree] = useState<MessageNode[]>([]);
  const [conversationMessageTree, setConversationMessageTree] = useState<MessageNode[]>([]);
  const [conversationReadByCounts, setConversationReadByCounts] = useState<ConversationReadByCount[]>([]);
  const municipalityId = useConfigStore((s) => s.municipalityId);
  const { t } = useTranslation();
  const { supportErrand, setSupportErrand, supportAttachments, setSupportAttachments } = useSupportStore();

  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const unsavedTabs = useSupportStore((s) => s.unsavedTabs);
  const setUnsavedTab = useSupportStore((s) => s.setUnsavedTab);
  const tabsWithContent = useSupportStore((s) => s.tabsWithContent);
  const setTabHasContent = useSupportStore((s) => s.setTabHasContent);
  const setInvestigationContent = useCallback(
    (hasContent: boolean) => setTabHasContent('investigation', hasContent),
    [setTabHasContent]
  );
  const setDecisionContent = useCallback(
    (hasContent: boolean) => setTabHasContent('decision', hasContent),
    [setTabHasContent]
  );
  const setUnsavedInvestigation = useCallback(
    (unsaved: boolean) => setUnsavedTab('investigation', unsaved),
    [setUnsavedTab]
  );
  const setUnsavedDecision = useCallback((unsaved: boolean) => setUnsavedTab('decision', unsaved), [setUnsavedTab]);
  const confirm = useConfirm();
  const [processActivities, setProcessActivities] = useState<ProcessActivity[]>([]);

  const methods: UseFormReturn<SupportErrand, any, undefined> = useFormContext();

  const { activeTabKey, setActiveTabKey } = useSupportStore();

  useEffect(() => {
    if (methods?.getValues as unknown) {
      // Need to define these variables for validation/dirty check to work??
      const _ = Object.keys(methods.formState.dirtyFields).length;
      const __ = methods.formState.isDirty;
      setUnsavedChanges(Object.keys(methods.formState.dirtyFields).length === 0 ? false : methods.formState.isDirty);
    }
  }, [methods]);

  const errandId = supportErrand?.id;
  const stepTheProcessReports = supportErrand?.process?.currentActivityId;
  const processStatus = supportErrand?.process?.processStatus;

  const readProcessLog = useCallback(() => {
    if (!appConfig.features.useProcess || !errandId) return;
    getSupportProcessActivities(errandId, municipalityId)
      .then(setProcessActivities)
      .catch(() => setProcessActivities([]));
  }, [errandId, municipalityId]);

  useEffect(readProcessLog, [readProcessLog, supportErrand?.modified, stepTheProcessReports, processStatus]);

  const getMessagesAndConversations = () => {
    getSupportAttachments(supportErrand!.id!, municipalityId).then(setSupportAttachments);
    fetchSupportMessages(supportErrand!.id!, municipalityId).then((res) => {
      const tree = buildTree(res);
      setMessageTree(tree);
      setMessages(res);
    });
    getSupportConversationReadByCounts(municipalityId, supportErrand!.id!)
      .then(setConversationReadByCounts)
      .catch(() => setConversationReadByCounts([]));
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

  const conversationMessageCountSummary = useMemo(
    () => getConversationMessageCountSummary(conversationReadByCounts, supportErrand?.errandNumber ?? ''),
    [conversationReadByCounts, supportErrand?.errandNumber]
  );
  const totalMessageCount = messages.length + conversationMessageCountSummary.total;
  const unreadMessageCount = countUnreadMessages(messages) + conversationMessageCountSummary.unread;
  const messageTabLabel = `Meddelanden (${totalMessageCount}${
    unreadMessageCount > 0 ? `, ${unreadMessageCount} ${unreadMessageCount === 1 ? 'oläst' : 'olästa'}` : ''
  })`;

  const process = getSupportErrandProcess(supportErrand);

  const awaitsStep = (step: SupportProcessStepName): boolean =>
    appConfig.features.useProcess &&
    Boolean(process) &&
    !hasVisitedSupportProcessStep(step, process, processActivities);

  const tabHoldsSomethingToRead = (key: string): boolean => !!tabsWithContent[key];

  const tabIsClosed = (step: SupportProcessStepName, key: string): boolean =>
    awaitsStep(step) && !tabHoldsSomethingToRead(key);

  const standsInStep = (step: SupportProcessStepName): boolean =>
    appConfig.features.useProcess && Boolean(process) && supportProcessStepName(process) === step;

  const noProcessCloses = (): boolean => !appConfig.features.useProcess || !process;

  const writableInStep = (step: SupportProcessStepName): boolean => noProcessCloses() || standsInStep(step);

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
            setUnsaved={setUnsavedChanges}
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
        key: 'messages',
        label: messageTabLabel,
        content: supportErrand && (
          <SupportMessagesTab
            messages={messages}
            messageTree={messageTree}
            supportConversations={supportConversations}
            conversationMessageTree={conversationMessageTree}
            setUnsaved={setUnsavedChanges}
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
        key: 'investigation',
        label: t('common:tabs.investigation'),
        content: supportErrand && (
          <SupportErrandInvestigationTab
            setUnsaved={setUnsavedInvestigation}
            setHasContent={setInvestigationContent}
            inStep={standsInStep(SupportProcessStep.INVESTIGATION)}
            writable={writableInStep(SupportProcessStep.INVESTIGATION)}
          />
        ),
        disabled: tabIsClosed(SupportProcessStep.INVESTIGATION, 'investigation'),
        visibleFor: appConfig.features.useInvestigationTab,
      },
      {
        key: 'decision',
        label: t('common:tabs.decision'),
        content: supportErrand && (
          <SupportErrandDecisionTab
            setUnsaved={setUnsavedDecision}
            setHasContent={setDecisionContent}
            writable={writableInStep(SupportProcessStep.DECISION)}
          />
        ),
        disabled: tabIsClosed(SupportProcessStep.DECISION, 'decision'),
        visibleFor: appConfig.features.useDecisionTab,
      },
      {
        key: 'followup',
        label: t('common:tabs.followup'),
        content: supportErrand && <SupportErrandFollowUpTab />,
        disabled: awaitsStep(SupportProcessStep.FOLLOW_UP),
        visibleFor: appConfig.features.useFollowUpTab,
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
        content: supportErrand && <SupportErrandRecruitmentTab setUnsaved={setUnsavedChanges} update={update} />,
        disabled: false,
        visibleFor: appConfig.features.useRecruitment,
      },
      {
        key: 'invoice',
        label: 'Fakturering',
        content: supportErrand && (
          <SupportErrandInvoiceTab errand={supportErrand} setUnsaved={setUnsavedChanges} update={update} />
        ),
        disabled: false,
        visibleFor: appConfig.features.useBilling,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      conversationMessageTree,
      messageTabLabel,
      messageTree,
      messages,
      municipalityId,
      props.setUnsavedFacility,
      supportAttachments,
      supportConversations,
      supportErrand,
      t,
    ]
  );

  const [activeTab, setActiveTab] = useState(0);

  const unsavedInActiveTab = (): boolean => !!activeTabKey && !!unsavedTabs[activeTabKey];

  const changeTab = (key: string) => {
    const tabIsAlreadyOpen = key === activeTabKey;
    if (tabIsAlreadyOpen) {
      return;
    }

    if (!unsavedInActiveTab()) {
      setActiveTabKey(key);
      return;
    }

    confirm
      .showConfirmation(
        t('common:tabs.unsaved_title'),
        t(`common:tabs.unsaved_${activeTabKey}`),
        t('common:tabs.unsaved_leave'),
        t('common:tabs.unsaved_stay'),
        'info',
        'info'
      )
      .then((confirmed) => {
        if (confirmed) setActiveTabKey(key);
      });
  };

  useEffect(() => {
    const index = tabs.filter((tab) => tab.visibleFor).findIndex((tab) => tab.key === activeTabKey);
    setActiveTab(index >= 0 ? index : 0);
  }, [activeTabKey, tabs]);

  return (
    <>
      <div className="mb-xl">
        <WarnIfUnsavedChanges showWarning={unsavedChanges || Object.values(unsavedTabs).some(Boolean)}>
          <Tabs
            className="border-1 rounded-12 bg-background-content pt-22 pl-5"
            tabslistClassName="border-0 border-red-500 -m-b-12 flex-wrap ml-10"
            panelsClassName="border-t-1"
            current={activeTab}
            size={'sm'}
          >
            {tabs
              .filter((tab) => tab.visibleFor)
              .map((tab, index) => (
                <Tabs.Item key={tab.key}>
                  <Tabs.Button
                    disabled={tab.disabled}
                    onClick={() => changeTab(tab.key)}
                    className={cx('text-base', index === 0 && 'ml-8')}
                  >
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
