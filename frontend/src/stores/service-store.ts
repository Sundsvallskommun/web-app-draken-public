import { Service } from '@common/services/service-assets-service';
import { create } from 'zustand';

interface ServiceState {
  errandServices: Service[];
  partyServices: Service[];
}

interface ServiceActions {
  setErrandServices: (services: Service[]) => void;
  setPartysServices: (services: Service[]) => void;
  reset: () => void;
}

type ServiceStore = ServiceState & ServiceActions;

const initialState: ServiceState = {
  errandServices: [],
  partyServices: [],
};

export const useServiceStore = create<ServiceStore>((set) => ({
  ...initialState,
  setErrandServices: (services) => set({ errandServices: services }),
  setPartysServices: (services) => set({ partyServices: services }),
  reset: () => set(initialState),
}));
