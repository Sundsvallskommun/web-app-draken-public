import { hasDirtyFields } from '@common/services/helper-service';
import WarnIfUnsavedChanges from '@common/utils/warnIfUnsavedChanges';
import { appConfig } from '@config/appconfig';
import { cx, Tabs } from '@sk-web-gui/react';
import { useConfigStore, useMetadataStore, useSupportStore } from '@stores/index';
import { SupportErrandInvoiceTab } from '@supportmanagement/components/support-errand/tabs/support-errand-invoice-tab';
import { SupportErrandRecruitmentTab } from '@supportmanagement/components/support-errand/tabs/support-errand-recruitment-tab';
import type { InvestigationPhaseContext } from '@supportmanagement/investigation/investigation-phase';
import { useInvestigationProfileStore } from '@supportmanagement/investigation/investigation-profile-store';
import {
  isDecisionTabVisible,
  isInvestigationTabVisible,
} from '@supportmanagement/investigation/investigation-variant';
import { getInvestigationVariant } from '@supportmanagement/investigation/investigation-variant-registry';
import { useInvestigationAccess } from '@supportmanagement/investigation/use-investigation-access';
import { SupportMeasuresTab } from '@supportmanagement/measures/support-measures-tab';
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
import { Dispatch, FC, ReactNode, SetStateAction, useCallback, useEffect, useMemo, useState } from 'react';
import { useFormContext, UseFormReturn, useFormState } from 'react-hook-form';

import { SupportMessagesTab } from './tabs/messages/support-messages-tab';
import { SupportErrandServicesTab } from './tabs/services/support-errand-services-tab';
import { SupportErrandAttachmentsTab } from './tabs/support-errand-attachments-tab';
import { SupportErrandBasicsTab } from './tabs/support-errand-basics-tab';
import { SupportErrandDetailsTab } from './tabs/support-errand-details-tab';

export const SupportTabsWrapper: FC<{
  setUnsavedFacility: Dispatch<SetStateAction<boolean>>;
  onUnsavedChangesChange: (hasUnsavedChanges: boolean) => void;
}> = ({ setUnsavedFacility, onUnsavedChangesChange }) => {
  const [messages, setMessages] = useState<any>([]);
  const [supportConversations, setSupportConversations] = useState<any>([]);
  const [messageTree, setMessageTree] = useState<MessageNode[]>([]);
  const [conversationMessageTree, setConversationMessageTree] = useState<MessageNode[]>([]);
  const [conversationReadByCounts, setConversationReadByCounts] = useState<ConversationReadByCount[]>([]);
  const municipalityId = useConfigStore((s) => s.municipalityId);
  const investigationVariant = getInvestigationVariant();
  const investigationProfile = useInvestigationProfileStore((state) => state.profile);
  const supportMetadata = useMetadataStore((s) => s.supportMetadata);
  const { supportErrand, setSupportErrand, supportAttachments, setSupportAttachments } = useSupportStore();
  // Where the errand stands in the workflow, for the tabs that wait for a phase. The access request
  // is deliberately not gated on it: what the handler may read of an already written document does
  // not change with the phase, and Ärendeuppgifter asks the same answer from any phase.
  const investigationPhases: InvestigationPhaseContext = useMemo(
    () => ({ metadataPhases: supportMetadata?.phases, errandPhases: supportErrand?.phases }),
    [supportErrand?.phases, supportMetadata?.phases]
  );
  const { access: investigationAccess, refresh: refreshInvestigationAccess } = useInvestigationAccess(
    appConfig.features.useInvestigation &&
      investigationVariant !== null &&
      investigationProfile?.state === 'active' &&
      investigationProfile.documents.length > 0
  );

  const [tabUnsavedChanges, setTabUnsavedChanges] = useState(false);
  const [measuresDirty, setMeasuresDirty] = useState(false);
  const [followUpDirty, setFollowUpDirty] = useState(false);
  const [investigationDirty, setInvestigationDirty] = useState<Partial<Record<string, boolean>>>({});

  const methods: UseFormReturn<SupportErrand, any, undefined> = useFormContext();
  const { dirtyFields } = useFormState({ control: methods.control });

  const { activeTabKey, setActiveTabKey } = useSupportStore();

  const unsavedChanges =
    hasDirtyFields(dirtyFields) ||
    tabUnsavedChanges ||
    measuresDirty ||
    followUpDirty ||
    Object.values(investigationDirty).some(Boolean);

  useEffect(() => {
    onUnsavedChangesChange(unsavedChanges);
    return () => onUnsavedChangesChange(false);
  }, [onUnsavedChangesChange, unsavedChanges]);

  const setInvestigationDocumentDirty = useCallback((key: string, isDirty: boolean) => {
    setInvestigationDirty((current) => (current[key] === isDirty ? current : { ...current, [key]: isDirty }));
  }, []);

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
            setUnsavedFacility={setUnsavedFacility}
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
        content: supportErrand && <SupportErrandDetailsTab access={investigationAccess} />,
        disabled: false,
        visibleFor: appConfig.features.useDetailsTab,
      },
      {
        key: 'investigation',
        label: investigationVariant?.label ?? 'Utredning',
        content:
          supportErrand &&
          investigationVariant?.renderTab({
            onDirtyChange: setInvestigationDocumentDirty,
            access: investigationAccess,
            refreshAccess: refreshInvestigationAccess,
          }),
        disabled: false,
        visibleFor: isInvestigationTabVisible(appConfig.features, investigationVariant, investigationPhases),
      },
      {
        key: 'measures',
        label: 'Åtgärder',
        content: supportErrand && (
          <SupportMeasuresTab
            key={supportErrand.id}
            errand={supportErrand}
            municipalityId={municipalityId}
            onDirtyChange={setMeasuresDirty}
            isActive={activeTabKey === 'measures'}
          />
        ),
        disabled: false,
        visibleFor: appConfig.features.useMeasures,
      },
      {
        key: 'decision',
        label: investigationVariant?.decisionTab?.label ?? 'Beslut',
        content:
          supportErrand &&
          investigationVariant?.decisionTab?.render({
            onDirtyChange: setInvestigationDocumentDirty,
            access: investigationAccess,
            refreshAccess: refreshInvestigationAccess,
          }),
        disabled: false,
        visibleFor:
          isDecisionTabVisible(
            appConfig.features,
            investigationVariant,
            supportErrand,
            investigationProfile,
            investigationPhases,
            investigationAccess
          ) ||
          investigationProfile?.documents.some(
            (document) => document.placement === 'decision' && investigationDirty[document.key]
          ) === true,
      },
      {
        key: 'follow-up',
        label: 'Uppföljning',
        content: supportErrand && (
          <SupportMeasuresTab
            key={supportErrand.id}
            errand={supportErrand}
            municipalityId={municipalityId}
            onDirtyChange={setFollowUpDirty}
            isActive={activeTabKey === 'follow-up'}
            followUp
          />
        ),
        disabled: false,
        visibleFor: appConfig.features.useMeasures,
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
      activeTabKey,
      conversationMessageTree,
      messageTabLabel,
      messageTree,
      messages,
      municipalityId,
      investigationVariant,
      investigationProfile,
      investigationAccess,
      investigationDirty,
      investigationPhases,
      refreshInvestigationAccess,
      setUnsavedFacility,
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
        {investigationVariant?.renderNotice?.()}
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
