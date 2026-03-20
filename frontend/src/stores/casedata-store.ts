import { create } from 'zustand';
import { Asset } from '@casedata/interfaces/asset';
import { ErrandsData, IErrand } from '@casedata/interfaces/errand';
import { UiPhase } from '@casedata/interfaces/errand-phase';
import { MessageNode } from '@casedata/services/casedata-message-service';

interface CasedataState {
  errand: IErrand | undefined;
  errands: ErrandsData;
  messages: MessageNode[] | undefined;
  messageTree: MessageNode[] | undefined;
  conversation: MessageNode[] | undefined;
  conversationTree: MessageNode[] | undefined;
  assets: Asset[] | undefined;
  selectedErrandStatuses: string[];
  sidebarLabel: string;
  newErrands: number | null;
  ongoingErrands: number | null;
  suspendedErrands: number | null;
  assignedErrands: number | null;
  closedErrands: number | null;
  uiPhase: UiPhase | undefined;
}

interface CasedataActions {
  setErrand: (errand: IErrand | undefined) => void;
  setErrands: (errands: ErrandsData) => void;
  setMessages: (messages: MessageNode[]) => void;
  setMessageTree: (messages: MessageNode[]) => void;
  setConversation: (conversation: MessageNode[]) => void;
  setConversationTree: (conversationTree: MessageNode[]) => void;
  setAssets: (assets: Asset[]) => void;
  setSelectedErrandStatuses: (statuses: string[]) => void;
  setSidebarLabel: (label: string) => void;
  setNewErrands: (count: number | null) => void;
  setOngoingErrands: (count: number | null) => void;
  setSuspendedErrands: (count: number | null) => void;
  setAssignedErrands: (count: number | null) => void;
  setClosedErrands: (count: number | null) => void;
  setUiPhase: (phase: UiPhase) => void;
  reset: () => void;
}

type CasedataStore = CasedataState & CasedataActions;

const initialState: CasedataState = {
  errand: undefined,
  errands: { errands: [], labels: [] },
  messages: undefined,
  messageTree: undefined,
  conversation: undefined,
  conversationTree: undefined,
  assets: undefined,
  selectedErrandStatuses: ['ArendeInkommit'],
  sidebarLabel: '',
  newErrands: 0,
  ongoingErrands: 0,
  suspendedErrands: 0,
  assignedErrands: 0,
  closedErrands: 0,
  uiPhase: undefined,
};

export const useCasedataStore = create<CasedataStore>((set) => ({
  ...initialState,
  setErrand: (errand) => set({ errand }),
  setErrands: (errands) => set({ errands }),
  setMessages: (messages) => set({ messages }),
  setMessageTree: (messageTree) => set({ messageTree }),
  setConversation: (conversation) => set({ conversation }),
  setConversationTree: (conversationTree) => set({ conversationTree }),
  setAssets: (assets) => set({ assets }),
  setSelectedErrandStatuses: (selectedErrandStatuses) => set({ selectedErrandStatuses }),
  setSidebarLabel: (sidebarLabel) => set({ sidebarLabel }),
  setNewErrands: (newErrands) => set({ newErrands }),
  setOngoingErrands: (ongoingErrands) => set({ ongoingErrands }),
  setSuspendedErrands: (suspendedErrands) => set({ suspendedErrands }),
  setAssignedErrands: (assignedErrands) => set({ assignedErrands }),
  setClosedErrands: (closedErrands) => set({ closedErrands }),
  setUiPhase: (uiPhase) => set({ uiPhase }),
  reset: () => set(initialState),
}));
