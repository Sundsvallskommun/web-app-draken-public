import { create } from 'zustand';
import { CPageBillingRecord } from 'src/data-contracts/backend/data-contracts';

interface BillingState {
  billingRecords: CPageBillingRecord;
}

interface BillingActions {
  setBillingRecords: (records: CPageBillingRecord) => void;
  reset: () => void;
}

type BillingStore = BillingState & BillingActions;

const initialState: BillingState = {
  billingRecords: { content: [] },
};

export const useBillingStore = create<BillingStore>((set) => ({
  ...initialState,
  setBillingRecords: (billingRecords) => set({ billingRecords }),
  reset: () => set(initialState),
}));
