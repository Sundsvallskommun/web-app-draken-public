import { create } from 'zustand';
import { Notification as SupportNotification } from '@common/data-contracts/supportmanagement/data-contracts';
import { Notification as CaseDataNotification } from '@common/data-contracts/case-data/data-contracts';
import { SupportAttachment } from '@supportmanagement/services/support-attachment-service';
import {
  Status,
  SupportErrand,
  SupportErrandsData,
  SupportStakeholderFormModel,
} from '@supportmanagement/services/support-errand-service';

interface SupportState {
  supportErrand: SupportErrand | undefined;
  supportErrands: SupportErrandsData;
  supportAttachments: SupportAttachment[] | undefined;
  selectedSupportErrandStatuses: Status[];
  stakeholderContacts: SupportStakeholderFormModel[];
  stakeholderCustomers: SupportStakeholderFormModel[];
  notifications: (SupportNotification | CaseDataNotification)[];
  newSupportErrands: number | null;
  ongoingSupportErrands: number | null;
  suspendedSupportErrands: number | null;
  assignedSupportErrands: number | null;
  solvedSupportErrands: number | null;
}

interface SupportActions {
  setSupportErrand: (errand: SupportErrand | undefined) => void;
  setSupportErrands: (errands: SupportErrandsData) => void;
  setSupportAttachments: (attachments: SupportAttachment[]) => void;
  setSelectedSupportErrandStatuses: (statuses: Status[]) => void;
  setStakeholderContacts: (contacts: SupportStakeholderFormModel[]) => void;
  setStakeholderCustomers: (customers: SupportStakeholderFormModel[]) => void;
  setNotifications: (notifications: (SupportNotification | CaseDataNotification)[]) => void;
  setNewSupportErrands: (count: number | null) => void;
  setOngoingSupportErrands: (count: number | null) => void;
  setSuspendedSupportErrands: (count: number | null) => void;
  setAssignedSupportErrands: (count: number | null) => void;
  setSolvedSupportErrands: (count: number | null) => void;
  reset: () => void;
}

type SupportStore = SupportState & SupportActions;

const initialState: SupportState = {
  supportErrand: undefined,
  supportErrands: { errands: [], labels: [] },
  supportAttachments: undefined,
  selectedSupportErrandStatuses: [Status.NEW],
  stakeholderContacts: [],
  stakeholderCustomers: [],
  notifications: [],
  newSupportErrands: 0,
  ongoingSupportErrands: 0,
  suspendedSupportErrands: 0,
  assignedSupportErrands: 0,
  solvedSupportErrands: 0,
};

export const useSupportStore = create<SupportStore>((set) => ({
  ...initialState,
  setSupportErrand: (supportErrand) => set({ supportErrand }),
  setSupportErrands: (supportErrands) => set({ supportErrands }),
  setSupportAttachments: (supportAttachments) => set({ supportAttachments }),
  setSelectedSupportErrandStatuses: (selectedSupportErrandStatuses) => set({ selectedSupportErrandStatuses }),
  setStakeholderContacts: (stakeholderContacts) => set({ stakeholderContacts }),
  setStakeholderCustomers: (stakeholderCustomers) => set({ stakeholderCustomers }),
  setNotifications: (notifications) => set({ notifications }),
  setNewSupportErrands: (newSupportErrands) => set({ newSupportErrands }),
  setOngoingSupportErrands: (ongoingSupportErrands) => set({ ongoingSupportErrands }),
  setSuspendedSupportErrands: (suspendedSupportErrands) => set({ suspendedSupportErrands }),
  setAssignedSupportErrands: (assignedSupportErrands) => set({ assignedSupportErrands }),
  setSolvedSupportErrands: (solvedSupportErrands) => set({ solvedSupportErrands }),
  reset: () => set(initialState),
}));
