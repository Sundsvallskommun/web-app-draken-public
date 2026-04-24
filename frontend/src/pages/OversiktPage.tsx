import { ContractOverview } from '@casedata/components/contract-overview/contract-overview.component';
import { OngoingCaseDataErrands } from '@casedata/components/ongoing-casedata-errands/ongoing-casedata-errands.component';
import SidebarLayout from '@common/components/layout/sidebar-layout.component';
import { isMEX } from '@common/services/application-service';
import { DeployInfoBanner } from '@common/utils/deploy-info-banner';
import { appConfig } from '@config/appconfig';
import { useConfigStore, useUserStore } from '@stores/index';
import { AttestationTab } from '@supportmanagement/components/attestation-tab/attestation-tab.component';
import { OngoingSupportErrands } from '@supportmanagement/components/ongoing-support-errands/ongoing-support-errands.component';
import { useState } from 'react';

export default function OversiktPage() {
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
          {(() => {
            if (appConfig.features.useBilling && showAttestationTable && user.permissions.canViewAttestations) {
              return <AttestationTab />;
            }
            if (municipalityId) {
              return <OngoingSupportErrands ongoing={{ errands: [], labels: [] }} />;
            }
            return null;
          })()}
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
