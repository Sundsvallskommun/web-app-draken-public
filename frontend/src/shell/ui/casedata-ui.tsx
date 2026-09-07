'use client';

import type { CaseDataFilter } from '@casedata/components/casedata-filtering/casedata-filtering.component';
import { CasedataFilterSidebarStatusSelector } from '@casedata/components/casedata-filtering/components/casedata-filter-sidebarstatus-selector.component';
import { CaseStatusValues } from '@casedata/components/casedata-filtering/components/casedata-filter-status.component';
import { ContractOverview } from '@casedata/components/contract-overview/contract-overview.component';
import { CasedataErrandComponent } from '@casedata/components/errand/casedata-errand.component';
import { UiPhaseWrapper } from '@casedata/components/errand/ui-phase/ui-phase-wrapper';
import { CasedataStatusLabelComponent } from '@casedata/components/ongoing-casedata-errands/components/casedata-status-label.component';
import { OngoingCaseDataErrands } from '@casedata/components/ongoing-casedata-errands/ongoing-casedata-errands.component';
import {
  acknowledgeCasedataNotification,
  getCasedataNotifications,
} from '@casedata/services/casedata-notification-service';
import type { Notification } from '@common/data-contracts/case-data/data-contracts';
import { isMEX } from '@common/services/application-service';
import { useCasedataStore } from '@stores/casedata-store';
import { FormProvider, useForm } from 'react-hook-form';

import type { ApplicationUi } from './application-ui';

export const applicationUi: ApplicationUi = {
  Errand: CasedataErrandComponent,
  Overview: ({ showContractTable }) =>
    isMEX() && showContractTable ? <ContractOverview /> : <OngoingCaseDataErrands />,
  StatusFilters: function CaseStatusFilters({ showContractTable, setShowContractTable, iconButton }) {
    const form = useForm<CaseDataFilter>({ defaultValues: CaseStatusValues });
    return (
      <FormProvider {...form}>
        <CasedataFilterSidebarStatusSelector
          showContractTable={showContractTable}
          setShowContractTable={setShowContractTable}
          iconButton={iconButton}
        />
      </FormProvider>
    );
  },
  ErrandTitle: function CaseErrandTitle({ errandNumber }) {
    const errand = useCasedataStore((state) => state.errand);
    return (
      <>
        <CasedataStatusLabelComponent status={errand?.status?.statusType ?? ''} />
        <span className="font-bold ml-8">Ärende: </span>
        {errandNumber}
      </>
    );
  },
  HeaderPhase: UiPhaseWrapper,
  useRegistrationEnabled: () => true,
  notifications: {
    list: getCasedataNotifications,
    acknowledge: (municipalityId, notification) =>
      acknowledgeCasedataNotification(municipalityId, notification as Notification),
  },
};
