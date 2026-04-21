import { Asset } from '@casedata/interfaces/asset';
import { ErrandsData, IErrand } from '@casedata/interfaces/errand';
import { UiPhase } from '@casedata/interfaces/errand-phase';
import { MessageNode } from '@casedata/services/casedata-message-service';
import { create } from 'zustand';

interface CasedataState {
  errand: IErrand | undefined;
  errands: ErrandsData;
  messages: MessageNode[] | undefined;
  messageTree: MessageNode[] | undefined;
  conversation: MessageNode[] | undefined;
  conversationTree: MessageNode[] | undefined;
  assets: Asset[] | undefined;
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
  setUiPhase: (uiPhase) => set({ uiPhase }),
  reset: () => set(initialState),
}));
