import { NotificationView } from '@common/components/notifications/notification-view';
import { Subscription } from '@common/data-contracts/supportmanagement/data-contracts';
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
  notifications: NotificationView[];
  /** Errand and namespace subscriptions belonging to the logged in user. */
  subscriptions: Subscription[];
  activeTabKey?: string;
}

interface SupportActions {
  setSupportErrand: (errand: SupportErrand | undefined) => void;
  setSupportErrands: (errands: SupportErrandsData) => void;
  setSupportAttachments: (attachments: SupportAttachment[]) => void;
  setStakeholderContacts: (contacts: SupportStakeholderFormModel[]) => void;
  setStakeholderCustomers: (customers: SupportStakeholderFormModel[]) => void;
  setNotifications: (notifications: NotificationView[]) => void;
  setSubscriptions: (subscriptions: Subscription[]) => void;
  setActiveTabKey: (activeTabKey: string) => void;
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
  subscriptions: [],
  activeTabKey: 'basics',
};

export const useSupportStore = create<SupportStore>((set) => ({
  ...initialState,
  setSupportErrand: (supportErrand) => set({ supportErrand }),
  setSupportErrands: (supportErrands) => set({ supportErrands }),
  setSupportAttachments: (supportAttachments) => set({ supportAttachments }),
  setStakeholderContacts: (stakeholderContacts) => set({ stakeholderContacts }),
  setStakeholderCustomers: (stakeholderCustomers) => set({ stakeholderCustomers }),
  setNotifications: (notifications) => set({ notifications }),
  setSubscriptions: (subscriptions) => set({ subscriptions }),
  setActiveTabKey: (activeTabKey) => set({ activeTabKey }),
  reset: () => set(initialState),
}));
