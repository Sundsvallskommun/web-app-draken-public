'use client';

import { OngoingCaseDataErrands } from '@casedata/components/ongoing-casedata-errands/ongoing-casedata-errands.component';
import SidebarLayout from '@common/components/layout/sidebar-layout.component';
import { useAppContext } from '@common/contexts/app.context';
import { getAdminUsers } from '@common/services/user-service';
import { DeployInfoBanner } from '@common/utils/deploy-info-banner';
import { appConfig } from '@config/appconfig';
import { AttestationTab } from '@supportmanagement/components/attestation-tab/attestation-tab.component';
import { OngoingSupportErrands } from '@supportmanagement/components/ongoing-support-errands/ongoing-support-errands.component';
import { getSupportMetadata } from '@supportmanagement/services/support-metadata-service';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

const Oversikt: React.FC = () => {
  const { user, setAdministrators, municipalityId, setMunicipalityId, setSupportMetadata } = useAppContext();
  const [showAttestationTable, setShowAttestationTable] = useState<boolean>(false);

  const initialFocus = useRef(null);
  const setInitalFocus = (e) => {
    setTimeout(() => {
      initialFocus.current && initialFocus.current.focus();
    });
  };

  useEffect(() => {
    setMunicipalityId(process.env.NEXT_PUBLIC_MUNICIPALITY_ID);
    getAdminUsers().then(setAdministrators);
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
        >
          <OngoingCaseDataErrands />
        </SidebarLayout>
      ) : null}
      <DeployInfoBanner />
    </>
  );
};

export default Oversikt;
