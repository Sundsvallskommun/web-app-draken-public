import { Notification as CaseDataNotification } from '@common/data-contracts/case-data/data-contracts';
import { Notification as SupportNotification } from '@common/data-contracts/supportmanagement/data-contracts';
import { SupportAttachment } from '@supportmanagement/services/support-attachment-service';
import {
  SupportErrand,
  SupportErrandsData,
  SupportStakeholderFormModel,
} from '@supportmanagement/services/support-errand-service';
import { create } from 'zustand';

interface SupportState {
  supportErrand: SupportErrand | undefined;
  supportErrands: SupportErrandsData;
  supportAttachments: SupportAttachment[] | undefined;
  stakeholderContacts: SupportStakeholderFormModel[];
  stakeholderCustomers: SupportStakeholderFormModel[];
  notifications: (SupportNotification | CaseDataNotification)[];
  activeTabKey?: string;
  unsavedTabs: Record<string, boolean>;
  tabsWithContent: Record<string, boolean>;
  processSignal: { errandId: string; at: number } | undefined;
  pbiSignal: { errandId: string; at: number } | undefined;
  tabSavers: Record<string, () => Promise<boolean>>;
}

interface SupportActions {
  setSupportErrand: (errand: SupportErrand | undefined) => void;
  setSupportErrands: (errands: SupportErrandsData) => void;
  setSupportAttachments: (attachments: SupportAttachment[]) => void;
  setStakeholderContacts: (contacts: SupportStakeholderFormModel[]) => void;
  setStakeholderCustomers: (customers: SupportStakeholderFormModel[]) => void;
  setNotifications: (notifications: (SupportNotification | CaseDataNotification)[]) => void;
  setActiveTabKey: (activeTabKey: string) => void;
  setUnsavedTab: (key: string, unsaved: boolean) => void;
  setTabHasContent: (key: string, hasContent: boolean) => void;
  setProcessSignal: (processSignal: { errandId: string; at: number } | undefined) => void;
  setPbiSignal: (pbiSignal: { errandId: string; at: number } | undefined) => void;
  setTabSaver: (key: string, saver: (() => Promise<boolean>) | undefined) => void;
  reset: () => void;
}

type SupportStore = SupportState & SupportActions;

const initialState: SupportState = {
  supportErrand: undefined,
  supportErrands: { errands: [], labels: [] },
  supportAttachments: undefined,
  stakeholderContacts: [],
  stakeholderCustomers: [],
  notifications: [],
  activeTabKey: 'basics',
  unsavedTabs: {},
  tabsWithContent: {},
  processSignal: undefined,
  pbiSignal: undefined,
  tabSavers: {},
};

const flagsWithChange = (
  flags: Record<string, boolean>,
  key: string,
  value: boolean
): Record<string, boolean> | undefined => (flags[key] === value ? undefined : { ...flags, [key]: value });

export const useSupportStore = create<SupportStore>((set) => ({
  ...initialState,
  setSupportErrand: (supportErrand) => set({ supportErrand }),
  setSupportErrands: (supportErrands) => set({ supportErrands }),
  setSupportAttachments: (supportAttachments) => set({ supportAttachments }),
  setStakeholderContacts: (stakeholderContacts) => set({ stakeholderContacts }),
  setStakeholderCustomers: (stakeholderCustomers) => set({ stakeholderCustomers }),
  setNotifications: (notifications) => set({ notifications }),
  setActiveTabKey: (activeTabKey) => set({ activeTabKey }),
  setProcessSignal: (processSignal) => set({ processSignal }),
  setPbiSignal: (pbiSignal) => set({ pbiSignal }),
  setTabSaver: (key, saver) =>
    set((state) => {
      if (state.tabSavers[key] === saver) return state;
      const tabSavers = { ...state.tabSavers };
      if (saver) tabSavers[key] = saver;
      else delete tabSavers[key];
      return { tabSavers };
    }),
  setUnsavedTab: (key, unsaved) =>
    set((state) => {
      const unsavedTabs = flagsWithChange(state.unsavedTabs, key, unsaved);
      return unsavedTabs ? { unsavedTabs } : state;
    }),
  setTabHasContent: (key, hasContent) =>
    set((state) => {
      const tabsWithContent = flagsWithChange(state.tabsWithContent, key, hasContent);
      return tabsWithContent ? { tabsWithContent } : state;
    }),
  reset: () => set(initialState),
}));
