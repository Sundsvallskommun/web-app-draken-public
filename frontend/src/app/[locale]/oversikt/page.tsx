'use client';

import { ContractOverview } from '@casedata/components/contract-overview/contract-overview.component';
import { OngoingCaseDataErrands } from '@casedata/components/ongoing-casedata-errands/ongoing-casedata-errands.component';
import SidebarLayout from '@common/components/layout/sidebar-layout.component';
import { useAppContext } from '@common/contexts/app.context';
import { DeployInfoBanner } from '@common/utils/deploy-info-banner';
import { appConfig, applyRuntimeFeatureFlags } from '@config/appconfig';
import { AttestationTab } from '@supportmanagement/components/attestation-tab/attestation-tab.component';
import { OngoingSupportErrands } from '@supportmanagement/components/ongoing-support-errands/ongoing-support-errands.component';
import { getSupportMetadata } from '@supportmanagement/services/support-metadata-service';
import { useEffect, useState } from 'react';
import { getAdminUsers } from '@common/services/user-service';
import { getFeatureFlags } from '@common/services/feature-flag-service';
import { isMEX } from '@common/services/application-service';

const Oversikt: React.FC = () => {
  const { user, municipalityId, setSupportMetadata, setAdministrators, setMunicipalityId } = useAppContext();
  const [showAttestationTable, setShowAttestationTable] = useState<boolean>(false);
  const [showContractTable, setShowContractTable] = useState<boolean>(false);

  useEffect(() => {
    getFeatureFlags().then((res) => {
      applyRuntimeFeatureFlags(res.data);
    });
    setMunicipalityId(process.env.NEXT_PUBLIC_MUNICIPALITY_ID || '');
    getAdminUsers().then((data) => {
      setAdministrators(data);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    appConfig.isSupportManagement &&
      municipalityId &&
      getSupportMetadata(municipalityId).then((res) => setSupportMetadata(res.metadata));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [municipalityId]);

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
};

export default Oversikt;
