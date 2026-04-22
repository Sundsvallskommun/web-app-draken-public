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
}

interface SupportActions {
  setSupportErrand: (errand: SupportErrand | undefined) => void;
  setSupportErrands: (errands: SupportErrandsData) => void;
  setSupportAttachments: (attachments: SupportAttachment[]) => void;
  setStakeholderContacts: (contacts: SupportStakeholderFormModel[]) => void;
  setStakeholderCustomers: (customers: SupportStakeholderFormModel[]) => void;
  setNotifications: (notifications: (SupportNotification | CaseDataNotification)[]) => void;
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
};

export const useSupportStore = create<SupportStore>((set) => ({
  ...initialState,
  setSupportErrand: (supportErrand) => set({ supportErrand }),
  setSupportErrands: (supportErrands) => set({ supportErrands }),
  setSupportAttachments: (supportAttachments) => set({ supportAttachments }),
  setStakeholderContacts: (stakeholderContacts) => set({ stakeholderContacts }),
  setStakeholderCustomers: (stakeholderCustomers) => set({ stakeholderCustomers }),
  setNotifications: (notifications) => set({ notifications }),
  reset: () => set(initialState),
}));
