'use client';

import type { Notification } from '@common/data-contracts/supportmanagement/data-contracts';
import { appConfig } from '@config/appconfig';
import { useConfigStore } from '@stores/config-store';
import { useMetadataStore } from '@stores/metadata-store';
import { useSupportStore } from '@stores/support-store';
import { useUserStore } from '@stores/user-store';
import { AttestationTab } from '@supportmanagement/components/attestation-tab/attestation-tab.component';
import { SupportStatusLabelComponent } from '@supportmanagement/components/ongoing-support-errands/components/support-status-label.component';
import { OngoingSupportErrands } from '@supportmanagement/components/ongoing-support-errands/ongoing-support-errands.component';
import { SupportErrandComponent } from '@supportmanagement/components/support-errand/support-errand.component';
import { SupportManagementFilterSidebarStatusSelector } from '@supportmanagement/components/supportmanagement-filtering/components/supportmanagement-filter-sidebarstatus-selector.component';
import {
  type SupportManagementFilter,
  SupportManagementValues,
} from '@supportmanagement/components/supportmanagement-filtering/supportmanagement-filtering.component';
import { isSupportRegistrationEnabled } from '@supportmanagement/investigation/investigation-profile';
import { useInvestigationProfileStore } from '@supportmanagement/investigation/investigation-profile-store';
import { getErrandTypeLabel } from '@supportmanagement/services/support-label-classification-service';
import {
  acknowledgeSupportNotification,
  getSupportNotifications,
} from '@supportmanagement/services/support-notification-service';
import { FormProvider, useForm } from 'react-hook-form';

import type { ApplicationUi } from './application-ui';

export const supportUi: ApplicationUi = {
  Errand: SupportErrandComponent,
  Overview: function SupportOverview({ showAttestationTable }) {
    const user = useUserStore((state) => state.user);
    const municipalityId = useConfigStore((state) => state.municipalityId);
    if (appConfig.features.useBilling && showAttestationTable && user.permissions.canViewAttestations) {
      return <AttestationTab />;
    }
    return municipalityId ? <OngoingSupportErrands /> : null;
  },
  StatusFilters: function SupportStatusFilters({ showAttestationTable, setShowAttestationTable, iconButton }) {
    const form = useForm<SupportManagementFilter>({ defaultValues: SupportManagementValues });
    return (
      <FormProvider {...form}>
        <SupportManagementFilterSidebarStatusSelector
          showAttestationTable={showAttestationTable}
          setShowAttestationTable={setShowAttestationTable}
          iconButton={iconButton}
        />
      </FormProvider>
    );
  },
  ErrandTitle: function SupportErrandTitle({ errandNumber }) {
    const errand = useSupportStore((state) => state.supportErrand);
    const metadata = useMetadataStore((state) => state.supportMetadata);
    const typeLabel = appConfig.features.useThreeLevelCategorization
      ? getErrandTypeLabel(errand, metadata)?.displayName ?? '(Ärendetyp saknas)'
      : metadata?.categories
          ?.find((category) => category.name === errand?.category)
          ?.types?.find((type) => type.name === errand?.classification?.type)?.displayName || errand?.type;
    return (
      <>
        <SupportStatusLabelComponent
          status={errand?.status ?? ''}
          resolution={errand?.resolution ?? ''}
          actions={errand?.actions ?? []}
        />
        <span className="font-bold ml-8">{typeLabel} </span>
        <span className="text-small">({errandNumber})</span>
      </>
    );
  },
  useRegistrationEnabled: () => isSupportRegistrationEnabled(useInvestigationProfileStore((state) => state.profile)),
  notifications: {
    list: getSupportNotifications,
    acknowledge: (municipalityId, notification) =>
      acknowledgeSupportNotification(municipalityId, notification as Notification),
  },
};
