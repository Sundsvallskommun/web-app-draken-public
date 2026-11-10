import { create } from 'zustand';

interface FeatureFlagState {
  // True once the runtime feature flags have been fetched (or the fetch failed), i.e. appConfig holds its final values.
  loaded: boolean;
}

interface FeatureFlagActions {
  setLoaded: (loaded: boolean) => void;
  reset: () => void;
}

type FeatureFlagStore = FeatureFlagState & FeatureFlagActions;

const initialState: FeatureFlagState = {
  loaded: false,
};

export const useFeatureFlagStore = create<FeatureFlagStore>((set) => ({
  ...initialState,
  setLoaded: (loaded) => set({ loaded }),
  reset: () => set(initialState),
}));
