import { useAppContext } from '@common/contexts/app.context';
import { getApplicationEnvironment, isIK, isLOP, isROB } from '@common/services/application-service';
import WarnIfUnsavedChanges from '@common/utils/warnIfUnsavedChanges';
import { appConfig } from '@config/appconfig';
import { cx, Tabs } from '@sk-web-gui/react';
import { SupportErrandInvoiceTab } from '@supportmanagement/components/support-errand/tabs/support-errand-invoice-tab';
import {
  countAttachment,
  getSupportAttachments,
  SupportAttachment,
} from '@supportmanagement/services/support-attachment-service';
import { getSupportErrandById, SupportErrand } from '@supportmanagement/services/support-errand-service';
import {
  buildTree,
  countUnreadMessages,
  fetchSupportMessages,
} from '@supportmanagement/services/support-message-service';
import { getSupportNotes, SupportNoteData } from '@supportmanagement/services/support-note-service';
import { Dispatch, SetStateAction, useEffect, useRef, useState } from 'react';
import { useFormContext, UseFormReturn } from 'react-hook-form';
import { SupportMessagesTab } from './tabs/messages/support-messages-tab';
import { SupportErrandAttachmentsTab } from './tabs/support-errand-attachments-tab';
import { SupportErrandBasicsTab } from './tabs/support-errand-basics-tab';
import { SupportErrandDetailsTab } from './tabs/support-errand-details-tab';
import { SupportErrandRecruitmentTab } from '@supportmanagement/components/support-errand/tabs/support-errand-recruitment-tab';

export const SupportTabsWrapper: React.FC<{
  setUnsavedFacility: Dispatch<SetStateAction<boolean>>;
}> = (props) => {
  const [messages, setMessages] = useState<any>([]);
  const [messageTree, setMessageTree] = useState([]);
  const [supportNotes, setSupportNotes] = useState<SupportNoteData>();
  const {
    municipalityId,
    supportErrand,
    setSupportErrand,
    supportAttachments,
    setSupportAttachments,
  }: {
    municipalityId: string;
    supportErrand: SupportErrand;
    setSupportErrand: (e: SupportErrand) => void;
    supportAttachments: SupportAttachment[];
    setSupportAttachments: (e: SupportAttachment[]) => void;
  } = useAppContext();

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [unsavedUppgifter, setUnsavedUppgifter] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const methods: UseFormReturn<SupportErrand, any, undefined> = useFormContext();

  useEffect(() => {
    if (methods?.getValues) {
      // Need to define these variables for validation/dirty check to work??
      const _ = Object.keys(methods.formState.dirtyFields).length;
      const __ = methods.formState.isDirty;
      setUnsavedChanges(Object.keys(methods.formState.dirtyFields).length === 0 ? false : methods.formState.isDirty);
    }
  }, [methods]);

  const update = () => {
    if (supportErrand.id) {
      getSupportErrandById(supportErrand.id, municipalityId).then((res) => setSupportErrand(res.errand));
      getSupportNotes(supportErrand.id, municipalityId).then(setSupportNotes);
      getSupportAttachments(supportErrand.id, municipalityId).then(setSupportAttachments);
      fetchSupportMessages(supportErrand.id, municipalityId).then((res) => {
        const tree = buildTree(res);
        setMessageTree(tree);
        setMessages(res);
      });
    }
  };

  useEffect(() => {
    if (supportErrand.id) {
      getSupportNotes(supportErrand.id, municipalityId).then(setSupportNotes);
      getSupportAttachments(supportErrand.id, municipalityId).then(setSupportAttachments);
      fetchSupportMessages(supportErrand.id, municipalityId).then((res) => {
        const tree = buildTree(res);
        setMessageTree(tree);
        setMessages(res);
      });
    }
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
          setUnsaved={setUnsavedChanges}
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
          setUnsaved={setUnsavedChanges}
          update={update}
          municipalityId={municipalityId}
        />
      ),
      disabled: false,
      visibleFor: true,
    },
    {
      label: `Bilagor (${countAttachment(supportAttachments)})`,
      content: supportErrand && <SupportErrandAttachmentsTab update={update} />,
      disabled: false,
      visibleFor: true,
    },
    {
      label: 'Rekryteringsprocess',
      content: supportErrand && <SupportErrandRecruitmentTab setUnsaved={setUnsavedChanges} update={update} />,
      disabled: false,
      visibleFor: appConfig.features.useRecruitment,
    },
    {
      label: 'Fakturering',
      content: supportErrand && (
        <SupportErrandInvoiceTab errand={supportErrand} setUnsaved={setUnsavedChanges} update={update} />
      ),
      disabled: false,
      visibleFor: appConfig.features.useBilling,
    },
  ];

  const modalFocus = useRef(null);
  const setModalFocus = () => {
    setTimeout(() => {
      modalFocus.current && modalFocus.current.focus();
    });
  };

  const [current, setCurrent] = useState<number | undefined>(0);

  return (
    <>
      <div className="mb-xl">
        <WarnIfUnsavedChanges showWarning={unsavedChanges || unsavedUppgifter}>
          <Tabs
            className="border-1 rounded-12 bg-background-content pt-22 pl-5"
            tabslistClassName="border-0 border-red-500 -m-b-12 flex-wrap ml-10"
            panelsClassName="border-t-1"
            current={current}
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
