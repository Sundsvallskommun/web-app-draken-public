import { Asset } from '@casedata/interfaces/asset';
import { ErrandsData, IErrand } from '@casedata/interfaces/errand';
import { UiPhase } from '@casedata/interfaces/errand-phase';
import { emptyErrandList } from '@casedata/services/casedata-errand-service';
import { MessageNode } from '@casedata/services/casedata-message-service';
import { User } from '@common/interfaces/user';
import { Admin, emptyUser } from '@common/services/user-service';
import { SupportAdmin } from '@supportmanagement/services/support-admin-service';
import { SupportAttachment } from '@supportmanagement/services/support-attachment-service';
import {
  Status,
  SupportErrand,
  SupportErrandsData,
  SupportStakeholderFormModel,
  emptySupportErrandList,
} from '@supportmanagement/services/support-errand-service';
import { SupportMetadata } from '@supportmanagement/services/support-metadata-service';
import { SupportNotification } from '@supportmanagement/services/support-notification-service';
import { createContext, useContext, useState } from 'react';
import { SidebarButton } from '@common/interfaces/sidebar-button';

export interface AppContextInterface {
  subPage: string;
  setSubPage: (subPage: string) => void;

  isLoggedIn: boolean;
  setIsLoggedIn: (isLoggedIn: boolean) => void;

  user: User;
  setUser: (user: User) => void;

  avatar: string;
  setAvatar: (avatar: string) => void;

  errand;
  setErrand: (errand: IErrand) => void;

  messages;
  setMessages: (messages: MessageNode[]) => void;

  messageTree;
  setMessageTree: (messages: MessageNode[]) => void;

  assets;
  setAssets: (assets: Asset[]) => void;

  municipalityId;
  setMunicipalityId: (municipalityId: string) => void;

  supportMetadata;
  setSupportMetadata: (supportMetadata: SupportMetadata) => void;

  supportErrand;
  setSupportErrand: (supportErrand: SupportErrand) => void;

  supportAttachments;
  setSupportAttachments: (supportAttachments: SupportAttachment[]) => void;

  selectedErrandStatuses;
  setSelectedErrandStatuses: (selectedErrandStatuses: Status[]) => void;

  supportAdmins;
  setSupportAdmins: (admins: SupportAdmin[]) => void;

  stakeholderContacts;
  setStakeholderContacts: (stakeholderContacts: SupportStakeholderFormModel[]) => void;

  stakeholderCustomers;
  setStakeholderCustomers: (stakeholderCustomers: SupportStakeholderFormModel[]) => void;

  supportNotifications;
  setSupportNotifications: (notifications: SupportNotification[]) => void;

  errands;
  setErrands: (errands: ErrandsData) => void;

  supportErrands;
  setSupportErrands: (supportErrands: SupportErrandsData) => void;

  newSupportErrands;
  setNewSupportErrands: (supportErrands: SupportErrandsData) => void;

  ongoingSupportErrands;
  setOngoingSupportErrands: (supportErrands: SupportErrandsData) => void;

  suspendedSupportErrands;
  setSuspendedSupportErrands: (supportErrands: SupportErrandsData) => void;

  solvedSupportErrands;
  setSolvedSupportErrands: (supportErrands: SupportErrandsData) => void;

  sidebarButtons;
  setSidebarButtons: (sidebarButtons: SidebarButton[]) => void;

  administrators;
  setAdministrators: (admins: Admin[]) => void;

  isCookieConsentOpen: boolean;
  setIsCookieConsentOpen: (isOpen: boolean) => void;

  uiPhase: UiPhase;
  setUiPhase: (phase: UiPhase) => void;
}

const AppContext = createContext<AppContextInterface>(null);

export function AppWrapper({ children }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [subPage, setSubPage] = useState('');
  const [user, setUser] = useState<User>(emptyUser);
  const [avatar, setAvatar] = useState<string>('');
  const [errands, setErrands] = useState<ErrandsData>(emptyErrandList);
  const [supportErrands, setSupportErrands] = useState<SupportErrandsData>(emptySupportErrandList);
  const [newSupportErrands, setNewSupportErrands] = useState<SupportErrandsData>(emptySupportErrandList);
  const [ongoingSupportErrands, setOngoingSupportErrands] = useState<SupportErrandsData>(emptySupportErrandList);
  const [suspendedSupportErrands, setSuspendedSupportErrands] = useState<SupportErrandsData>(emptySupportErrandList);
  const [solvedSupportErrands, setSolvedSupportErrands] = useState<SupportErrandsData>(emptySupportErrandList);
  const [errand, setErrand] = useState<IErrand>();
  const [messages, setMessages] = useState<MessageNode[]>();
  const [messageTree, setMessageTree] = useState<MessageNode[]>();
  const [assets, setAssets] = useState<Asset[]>();
  const [supportErrand, setSupportErrand] = useState<SupportErrand>();
  const [supportMetadata, setSupportMetadata] = useState<SupportMetadata>();
  const [supportAttachments, setSupportAttachments] = useState<SupportAttachment[]>();
  const [selectedErrandStatuses, setSelectedErrandStatuses] = useState<Status[]>([Status.NEW]);
  const [supportAdmins, setSupportAdmins] = useState<SupportAdmin[]>([]);
  const [stakeholderContacts, setStakeholderContacts] = useState<SupportStakeholderFormModel[]>([]);
  const [stakeholderCustomers, setStakeholderCustomers] = useState<SupportStakeholderFormModel[]>([]);

  const [municipalityId, setMunicipalityId] = useState<string>();
  const [sidebarButtons, setSidebarButtons] = useState<SidebarButton[]>();
  const [administrators, setAdministrators] = useState<Admin[]>([]);
  const [isCookieConsentOpen, setIsCookieConsentOpen] = useState(true);
  const [supportNotifications, setSupportNotifications] = useState<SupportNotification[]>([]);
  const [uiPhase, setUiPhase] = useState<UiPhase>();

  return (
    <AppContext.Provider
      value={{
        subPage,
        setSubPage: (subPage: string) => setSubPage(subPage),

        isLoggedIn,
        setIsLoggedIn: (isLoggedIn: boolean) => setIsLoggedIn(isLoggedIn),

        user,
        setUser: (user: User) => setUser(user),

        avatar,
        setAvatar: (avatar: string) => setAvatar(avatar),

        errand,
        setErrand: (errand: IErrand) => setErrand(errand),

        messages,
        setMessages: (messages: MessageNode[]) => setMessages(messages),

        messageTree,
        setMessageTree: (messages: MessageNode[]) => setMessageTree(messages),

        assets,
        setAssets: (assets: Asset[]) => setAssets(assets),

        supportErrand,
        setSupportErrand: (errand: SupportErrand) => setSupportErrand(errand),

        supportMetadata,
        setSupportMetadata: (supportMetadata: SupportMetadata) => setSupportMetadata(supportMetadata),

        supportAttachments,
        setSupportAttachments: (supportAttachments: SupportAttachment[]) => setSupportAttachments(supportAttachments),

        selectedErrandStatuses,
        setSelectedErrandStatuses: (selectedErrandStatuses: Status[]) =>
          setSelectedErrandStatuses(selectedErrandStatuses),

        supportAdmins,
        setSupportAdmins: (admins: SupportAdmin[]) => setSupportAdmins(admins),

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

        supportErrands,
        setSupportErrands: (errands: SupportErrandsData) => setSupportErrands(errands),

        newSupportErrands,
        setNewSupportErrands: (supportErrands: SupportErrandsData) => setNewSupportErrands(supportErrands),

        ongoingSupportErrands,
        setOngoingSupportErrands: (supportErrands: SupportErrandsData) => setOngoingSupportErrands(supportErrands),

        suspendedSupportErrands,
        setSuspendedSupportErrands: (supportErrands: SupportErrandsData) => setSuspendedSupportErrands(supportErrands),

        solvedSupportErrands,
        setSolvedSupportErrands: (supportErrands: SupportErrandsData) => setSolvedSupportErrands(supportErrands),

        sidebarButtons,
        setSidebarButtons: (sidebarButtons: SidebarButton[]) => setSidebarButtons(sidebarButtons),

        supportNotifications,
        setSupportNotifications: (notifications: SupportNotification[]) => setSupportNotifications(notifications),

        administrators,
        setAdministrators: (admins: Admin[]) => {
          setAdministrators(admins);
        },

        isCookieConsentOpen,
        setIsCookieConsentOpen: (isOpen: boolean) => setIsCookieConsentOpen(isOpen),

        uiPhase,
        setUiPhase: (phase: UiPhase) => setUiPhase(phase),
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  return useContext(AppContext);
}
