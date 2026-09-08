import { create } from 'zustand';

interface ConfigState {
  municipalityId: string;
  isLoading: boolean;
  isCookieConsentOpen: boolean;
}

interface ConfigActions {
  setMunicipalityId: (municipalityId: string) => void;
  setIsLoading: (isLoading: boolean) => void;
  setIsCookieConsentOpen: (isOpen: boolean) => void;
  reset: () => void;
}

type ConfigStore = ConfigState & ConfigActions;

const initialState: ConfigState = {
  // Known at build time; the same value AppLayout later re-applies. Reading it here keeps the
  // server render and the first client render identical to the hydrated state.
  municipalityId: process.env.NEXT_PUBLIC_MUNICIPALITY_ID || '',
  isLoading: false,
  isCookieConsentOpen: true,
};

export const useConfigStore = create<ConfigStore>((set) => ({
  ...initialState,
  setMunicipalityId: (municipalityId) => set({ municipalityId }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setIsCookieConsentOpen: (isCookieConsentOpen) => set({ isCookieConsentOpen }),
  reset: () => set(initialState),
}));
