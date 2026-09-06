import type { NotificationSource } from '@common/components/notifications/notification-source';
import type { ComponentType } from 'react';

interface OverviewSelection {
  showAttestationTable: boolean;
  setShowAttestationTable: (show: boolean) => void;
  showContractTable: boolean;
  setShowContractTable: (show: boolean) => void;
}

/** The page shell's concrete composition points, selected once by the build. */
export interface ApplicationUi {
  Errand: ComponentType;
  Overview: ComponentType<OverviewSelection>;
  StatusFilters: ComponentType<OverviewSelection & { iconButton: boolean }>;
  ErrandTitle: ComponentType<{ errandNumber: string }>;
  HeaderPhase?: ComponentType;
  useRegistrationEnabled: () => boolean;
  notifications: NotificationSource;
}
