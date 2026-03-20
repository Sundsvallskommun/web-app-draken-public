'use client';

import { ContractOverview } from '@casedata/components/contract-overview/contract-overview.component';
import { OngoingCaseDataErrands } from '@casedata/components/ongoing-casedata-errands/ongoing-casedata-errands.component';
import SidebarLayout from '@common/components/layout/sidebar-layout.component';
import { useConfigStore, useUserStore } from '@stores/index';
import { DeployInfoBanner } from '@common/utils/deploy-info-banner';
import { appConfig } from '@config/appconfig';
import { AttestationTab } from '@supportmanagement/components/attestation-tab/attestation-tab.component';
import { OngoingSupportErrands } from '@supportmanagement/components/ongoing-support-errands/ongoing-support-errands.component';
import { useState } from 'react';
import { isMEX } from '@common/services/application-service';

export function OversiktPageClient() {
  const user = useUserStore((s) => s.user);
  const municipalityId = useConfigStore((s) => s.municipalityId);
  const [showAttestationTable, setShowAttestationTable] = useState<boolean>(false);
  const [showContractTable, setShowContractTable] = useState<boolean>(false);

  return (
    <>
      {appConfig.isSupportManagement ? (
        <SidebarLayout
          title={`${appConfig.applicationName} - Översikt`}
          setShowAttestationTable={setShowAttestationTable}
          showAttestationTable={showAttestationTable}
          setShowContractTable={setShowContractTable}
          showContractTable={showContractTable}
        >
          {appConfig.features.useBilling && showAttestationTable && user.permissions.canViewAttestations ? (
            <AttestationTab />
          ) : municipalityId ? (
            <OngoingSupportErrands ongoing={{ errands: [], labels: [] }} />
          ) : null}
        </SidebarLayout>
      ) : null}

      {appConfig.isCaseData ? (
        <SidebarLayout
          title={`${appConfig.applicationName} - Översikt`}
          setShowAttestationTable={setShowAttestationTable}
          showAttestationTable={showAttestationTable}
          setShowContractTable={setShowContractTable}
          showContractTable={showContractTable}
        >
          {isMEX() && showContractTable ? <ContractOverview /> : <OngoingCaseDataErrands />}
        </SidebarLayout>
      ) : null}
      <DeployInfoBanner />
    </>
  );
}
