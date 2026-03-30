import { Asset } from '@casedata/interfaces/asset';
import { ErrandsData, IErrand } from '@casedata/interfaces/errand';
import { UiPhase } from '@casedata/interfaces/errand-phase';
import { emptyErrandList } from '@casedata/services/casedata-errand-service';
import { MessageNode } from '@casedata/services/casedata-message-service';
import { Notification as CaseDataNotification } from '@common/data-contracts/case-data/data-contracts';
import { Notification as SupportNotification } from '@common/data-contracts/supportmanagement/data-contracts';
import { User } from '@common/interfaces/user';
import { Admin, emptyUser } from '@common/services/user-service';
import { SupportAttachment } from '@supportmanagement/services/support-attachment-service';
import {
  emptySupportErrandList,
  Status,
  SupportErrand,
  SupportErrandsData,
  SupportStakeholderFormModel,
} from '@supportmanagement/services/support-errand-service';
import { SupportMetadata } from '@supportmanagement/services/support-metadata-service';
import { createContext, useContext, useState } from 'react';
import { CPageBillingRecord } from 'src/data-contracts/backend/data-contracts';

export interface AppContextInterface {
  isLoading: boolean;
  setIsLoading: (isLoading: boolean) => void;

  user: User;
  setUser: (user: User) => void;

  avatar: string;
  setAvatar: (avatar: string) => void;

  errand: IErrand | undefined;
  setErrand: (errand: IErrand | undefined) => void;

  messages: MessageNode[] | undefined;
  setMessages: (messages: MessageNode[]) => void;

  messageTree: MessageNode[] | undefined;
  setMessageTree: (messages: MessageNode[]) => void;

  conversation: MessageNode[] | undefined;
  setConversation: (conversation: MessageNode[]) => void;

  conversationTree: MessageNode[] | undefined;
  setConversationTree: (conversationTree: MessageNode[]) => void;

  assets: Asset[] | undefined;
  setAssets: (assets: Asset[]) => void;

  municipalityId: string;
  setMunicipalityId: (municipalityId: string) => void;

  supportMetadata: SupportMetadata | undefined;
  setSupportMetadata: (supportMetadata: SupportMetadata) => void;

  supportErrand: SupportErrand | undefined;
  setSupportErrand: (supportErrand: SupportErrand) => void;

  supportAttachments: SupportAttachment[] | undefined;
  setSupportAttachments: (supportAttachments: SupportAttachment[]) => void;

  selectedErrandStatuses: string[];
  setSelectedErrandStatuses: (selectedErrandStatuses: string[]) => void;

  selectedSupportErrandStatuses: Status[];
  setSelectedSupportErrandStatuses: (selectedSupportErrandStatuses: Status[]) => void;

  stakeholderContacts: SupportStakeholderFormModel[];
  setStakeholderContacts: (stakeholderContacts: SupportStakeholderFormModel[]) => void;

  stakeholderCustomers: SupportStakeholderFormModel[];
  setStakeholderCustomers: (stakeholderCustomers: SupportStakeholderFormModel[]) => void;

  notifications: (SupportNotification | CaseDataNotification)[];
  setNotifications: (notifications: (SupportNotification | CaseDataNotification)[]) => void;

  errands: ErrandsData;
  setErrands: (errands: ErrandsData) => void;

  newErrands: number | null;
  setNewErrands: (count: number | null) => void;

  ongoingErrands: number | null;
  setOngoingErrands: (count: number | null) => void;

  suspendedErrands: number | null;
  setSuspendedErrands: (count: number | null) => void;

  assignedErrands: number | null;
  setAssignedErrands: (count: number | null) => void;

  closedErrands: number | null;
  setClosedErrands: (count: number | null) => void;

  supportErrands: SupportErrandsData;
  setSupportErrands: (supportErrands: SupportErrandsData) => void;

  newSupportErrands: number | null;
  setNewSupportErrands: (count: number | null) => void;

  ongoingSupportErrands: number | null;
  setOngoingSupportErrands: (count: number | null) => void;

  suspendedSupportErrands: number | null;
  setSuspendedSupportErrands: (count: number | null) => void;

  assignedSupportErrands: number | null;
  setAssignedSupportErrands: (count: number | null) => void;

  solvedSupportErrands: number | null;
  setSolvedSupportErrands: (count: number | null) => void;

  sidebarLabel: string;
  setSidebarLabel: (sidebarLabel: string) => void;

  administrators: Admin[];
  setAdministrators: (admins: Admin[]) => void;

  isCookieConsentOpen: boolean;
  setIsCookieConsentOpen: (isOpen: boolean) => void;

  uiPhase: UiPhase | undefined;
  setUiPhase: (phase: UiPhase) => void;

  billingRecords: CPageBillingRecord;
  setBillingRecords: (billingRecords: CPageBillingRecord) => void;

  notesCount: number;
  setNotesCount: (notesCount: number) => void;

  serviceNotesCount: number;
  setServiceNotesCount: (serviceNotesCount: number) => void;
}

const AppContext = createContext<AppContextInterface | null>(null);

export function AppWrapper({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<User>(emptyUser);
  const [avatar, setAvatar] = useState<string>('');
  const [errands, setErrands] = useState<ErrandsData>(emptyErrandList);
  const [newErrands, setNewErrands] = useState<number | null>(0);
  const [ongoingErrands, setOngoingErrands] = useState<number | null>(0);
  const [suspendedErrands, setSuspendedErrands] = useState<number | null>(0);
  const [assignedErrands, setAssignedErrands] = useState<number | null>(0);
  const [closedErrands, setClosedErrands] = useState<number | null>(0);
  const [supportErrands, setSupportErrands] = useState<SupportErrandsData>(emptySupportErrandList);
  const [newSupportErrands, setNewSupportErrands] = useState<number | null>(0);
  const [ongoingSupportErrands, setOngoingSupportErrands] = useState<number | null>(0);
  const [suspendedSupportErrands, setSuspendedSupportErrands] = useState<number | null>(0);
  const [assignedSupportErrands, setAssignedSupportErrands] = useState<number | null>(0);
  const [solvedSupportErrands, setSolvedSupportErrands] = useState<number | null>(0);
  const [errand, setErrand] = useState<IErrand>();
  const [messages, setMessages] = useState<MessageNode[]>();
  const [messageTree, setMessageTree] = useState<MessageNode[]>();
  const [conversation, setConversation] = useState<MessageNode[]>();
  const [conversationTree, setConversationTree] = useState<MessageNode[]>();
  const [assets, setAssets] = useState<Asset[]>();
  const [supportErrand, setSupportErrand] = useState<SupportErrand>();
  const [supportMetadata, setSupportMetadata] = useState<SupportMetadata>();
  const [supportAttachments, setSupportAttachments] = useState<SupportAttachment[]>();
  const [selectedSupportErrandStatuses, setSelectedSupportErrandStatuses] = useState<Status[]>([Status.NEW]);
  const [selectedErrandStatuses, setSelectedErrandStatuses] = useState<string[]>(['ArendeInkommit']);
  const [stakeholderContacts, setStakeholderContacts] = useState<SupportStakeholderFormModel[]>([]);
  const [stakeholderCustomers, setStakeholderCustomers] = useState<SupportStakeholderFormModel[]>([]);
  const [municipalityId, setMunicipalityId] = useState<string>('');
  const [sidebarLabel, setSidebarLabel] = useState<string>('');
  const [administrators, setAdministrators] = useState<Admin[]>([]);
  const [isCookieConsentOpen, setIsCookieConsentOpen] = useState(true);
  const [notifications, setNotifications] = useState<(SupportNotification | CaseDataNotification)[]>([]);
  const [uiPhase, setUiPhase] = useState<UiPhase>();
  const [billingRecords, setBillingRecords] = useState<CPageBillingRecord>({ content: [] });
  const [notesCount, setNotesCount] = useState<number>(0);
  const [serviceNotesCount, setServiceNotesCount] = useState<number>(0);

  return (
    <AppContext.Provider
      value={{
        isLoading,
        setIsLoading: (isLoading: boolean) => setIsLoading(isLoading),

        user,
        setUser: (user: User) => setUser(user),

        avatar,
        setAvatar: (avatar: string) => setAvatar(avatar),

        errand,
        setErrand: (errand: IErrand | undefined) => setErrand(errand),

        messages,
        setMessages: (messages: MessageNode[]) => setMessages(messages),

        messageTree,
        setMessageTree: (messages: MessageNode[]) => setMessageTree(messages),

        conversation,
        setConversation: (conversation: MessageNode[]) => setConversation(conversation),

        conversationTree,
        setConversationTree: (conversationTree: MessageNode[]) => setConversationTree(conversationTree),

        assets,
        setAssets: (assets: Asset[]) => setAssets(assets),

        supportErrand,
        setSupportErrand: (errand: SupportErrand) => setSupportErrand(errand),

        supportMetadata,
        setSupportMetadata: (supportMetadata: SupportMetadata) => setSupportMetadata(supportMetadata),

        supportAttachments,
        setSupportAttachments: (supportAttachments: SupportAttachment[]) => setSupportAttachments(supportAttachments),

        selectedSupportErrandStatuses,
        setSelectedSupportErrandStatuses: (selectedSupportErrandStatuses: Status[]) =>
          setSelectedSupportErrandStatuses(selectedSupportErrandStatuses),

        selectedErrandStatuses,
        setSelectedErrandStatuses: (selectedErrandStatuses: string[]) =>
          setSelectedErrandStatuses(selectedErrandStatuses),

        stakeholderContacts,
        setStakeholderContacts: (stakeholderContacts: SupportStakeholderFormModel[]) =>
          setStakeholderContacts(stakeholderContacts),

        stakeholderCustomers,
        setStakeholderCustomers: (stakeholderCustomers: SupportStakeholderFormModel[]) =>
          setStakeholderCustomers(stakeholderCustomers),

        municipalityId,
        setMunicipalityId: (municipalityId: string) => setMunicipalityId(municipalityId),

        errands,
        setErrands: (errands: ErrandsData) => setErrands(errands),

        newErrands,
        setNewErrands: (count: number | null) => setNewErrands(count),

        ongoingErrands,
        setOngoingErrands: (count: number | null) => setOngoingErrands(count),

        suspendedErrands,
        setSuspendedErrands: (count: number | null) => setSuspendedErrands(count),

        assignedErrands,
        setAssignedErrands: (count: number | null) => setAssignedErrands(count),

        closedErrands,
        setClosedErrands: (count: number | null) => setClosedErrands(count),

        supportErrands,
        setSupportErrands: (errands: SupportErrandsData) => setSupportErrands(errands),

        newSupportErrands,
        setNewSupportErrands: (count: number | null) => setNewSupportErrands(count),

        ongoingSupportErrands,
        setOngoingSupportErrands: (count: number | null) => setOngoingSupportErrands(count),

        suspendedSupportErrands,
        setSuspendedSupportErrands: (count: number | null) => setSuspendedSupportErrands(count),

        assignedSupportErrands,
        setAssignedSupportErrands: (count: number | null) => setAssignedSupportErrands(count),

        solvedSupportErrands,
        setSolvedSupportErrands: (count: number | null) => setSolvedSupportErrands(count),

        sidebarLabel,
        setSidebarLabel: (sidebarLabel: string) => setSidebarLabel(sidebarLabel),

        notifications,
        setNotifications: (notifications: (SupportNotification | CaseDataNotification)[]) =>
          setNotifications(notifications),

        administrators,
        setAdministrators: (admins: Admin[]) => {
          setAdministrators(admins);
        },

        isCookieConsentOpen,
        setIsCookieConsentOpen: (isOpen: boolean) => setIsCookieConsentOpen(isOpen),

        uiPhase,
        setUiPhase: (phase: UiPhase) => setUiPhase(phase),

        billingRecords,
        setBillingRecords: (billingRecords: CPageBillingRecord) => setBillingRecords(billingRecords),

        notesCount,
        setNotesCount: (notesCount: number) => setNotesCount(notesCount),

        serviceNotesCount,
        setServiceNotesCount: (serviceNotesCount: number) => setServiceNotesCount(serviceNotesCount),
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext(): AppContextInterface {
  return useContext(AppContext)!;
}
