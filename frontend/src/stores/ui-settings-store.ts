import { appConfig } from '@config/appconfig';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface PersistedState {
  colorScheme: string;
  filter: Record<string, string | boolean>;
  sort: Record<string, string | number>;
  attestationFilter: Record<string, string | boolean>;
  selectedErrandStatuses: string[];
  sidebarLabel: string;
}

interface UiState extends PersistedState {
  newErrands: number | null;
  ongoingErrands: number | null;
  suspendedErrands: number | null;
  assignedErrands: number | null;
  closedErrands: number | null;
}

interface UiActions {
  setColorScheme: (colorScheme: string) => void;
  setFilter: (filter: Record<string, string | boolean>) => void;
  setSort: (sort: Record<string, string | number>) => void;
  setAttestationFilter: (filter: Record<string, string | boolean>) => void;

  setSelectedErrandStatuses: (statuses: string[]) => void;
  setSidebarLabel: (label: string) => void;
  setNewErrands: (count: number | null) => void;
  setOngoingErrands: (count: number | null) => void;
  setSuspendedErrands: (count: number | null) => void;
  setAssignedErrands: (count: number | null) => void;
  setClosedErrands: (count: number | null) => void;
}

type UiSettingsStore = UiState & UiActions;

const initialState: UiState = {
  colorScheme: 'system',
  filter: {},
  sort: {},
  attestationFilter: {},

  selectedErrandStatuses: appConfig.isCaseData ? ['ArendeInkommit'] : ['NEW'],
  sidebarLabel: 'Nya ärenden',
  newErrands: 0,
  ongoingErrands: 0,
  suspendedErrands: 0,
  assignedErrands: 0,
  closedErrands: 0,
};

export const useUiSettingsStore = create(
  persist<UiSettingsStore>(
    (set) => ({
      ...initialState,

      setColorScheme: (colorScheme) => set({ colorScheme }),
      setFilter: (filter) => set({ filter }),
      setSort: (sort) => set({ sort }),
      setAttestationFilter: (attestationFilter) => set({ attestationFilter }),

      setSelectedErrandStatuses: (selectedErrandStatuses) => set({ selectedErrandStatuses }),
      setSidebarLabel: (sidebarLabel) => set({ sidebarLabel }),
      setNewErrands: (newErrands) => set({ newErrands }),
      setOngoingErrands: (ongoingErrands) => set({ ongoingErrands }),
      setSuspendedErrands: (suspendedErrands) => set({ suspendedErrands }),
      setAssignedErrands: (assignedErrands) => set({ assignedErrands }),
      setClosedErrands: (closedErrands) => set({ closedErrands }),
    }),
    {
      name: `${process.env.NEXT_PUBLIC_APPLICATION || 'app'}-ui-settings`,
      partialize: (state) =>
        ({
          colorScheme: state.colorScheme,
          filter: state.filter,
          sort: state.sort,
          attestationFilter: state.attestationFilter,
          selectedErrandStatuses: state.selectedErrandStatuses,
          sidebarLabel: state.sidebarLabel,
        } as UiSettingsStore),
    }
  )
);
