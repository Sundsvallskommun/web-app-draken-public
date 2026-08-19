import { create } from 'zustand';

import type { InvestigationProfile } from './investigation-profile';

interface InvestigationProfileState {
  status: 'idle' | 'loading' | 'ready' | 'error' | 'disabled';
  profile: InvestigationProfile | null;
  documentLoadStates: Readonly<Record<string, 'loading' | 'ready' | 'error'>>;
  startLoading: () => void;
  setProfile: (profile: InvestigationProfile) => void;
  setError: () => void;
  setDisabled: () => void;
  setDocumentLoadState: (key: string, status: 'loading' | 'ready' | 'error') => void;
  reset: () => void;
}

const initialState: Pick<InvestigationProfileState, 'profile' | 'status'> = {
  status: 'idle',
  profile: null,
};

export const useInvestigationProfileStore = create<InvestigationProfileState>((set) => ({
  ...initialState,
  documentLoadStates: {},
  startLoading: () => set({ status: 'loading', profile: null, documentLoadStates: {} }),
  setProfile: (profile) => set({ status: 'ready', profile, documentLoadStates: {} }),
  setError: () => set({ status: 'error', profile: null, documentLoadStates: {} }),
  setDisabled: () => set({ status: 'disabled', profile: null, documentLoadStates: {} }),
  setDocumentLoadState: (key, status) =>
    set((state) => ({ documentLoadStates: { ...state.documentLoadStates, [key]: status } })),
  reset: () => set({ ...initialState, documentLoadStates: {} }),
}));
