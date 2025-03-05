import { OngoingCaseDataErrands } from '@casedata/components/ongoing-casedata-errands/ongoing-casedata-errands.component';
import Layout from '@common/components/layout/layout.component';
import SidebarLayout from '@common/components/layout/sidebar-layout.component';
import { useAppContext } from '@common/contexts/app.context';
import { getApplicationName, isKC, isPT, isMEX, isLOP, isIK } from '@common/services/application-service';
import { getAdminUsers } from '@common/services/user-service';
import { OngoingSupportErrands } from '@supportmanagement/components/ongoing-support-errands/ongoing-support-errands.component';
import { getSupportMetadata } from '@supportmanagement/services/support-metadata-service';
import { useRouter } from 'next/router';
import { useEffect, useRef, useState } from 'react';
import { AttestationTab } from '@supportmanagement/components/attestation-tab/attestation-tab.component';
import OngoingCaseDataHeader from '@casedata/components/ongoing-casedata-errands/ongoing-casedata-errands-header.component';
import OngoingSupportManagementHeader from '@supportmanagement/components/ongoing-support-errands/ongoing-support-errands-header.component';

export const Oversikt: React.FC = () => {
  const router = useRouter();

  const { user, isLoggedIn, administrators, setAdministrators, municipalityId, setMunicipalityId, setSupportMetadata } =
    useAppContext();
  const [showAttestationTable, setShowAttestationTable] = useState<boolean>(false);

  useEffect(() => {
    if (!isLoggedIn) {
      // router.push('/login');
    }
  }, [isLoggedIn, router]);

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
    (isKC() || isIK() || isLOP()) &&
      municipalityId &&
      getSupportMetadata(municipalityId).then((res) => setSupportMetadata(res.metadata));
  }, [municipalityId]);

  return (
    <>
      {isKC() || isIK() || isLOP() ? (
        <>
          <OngoingSupportManagementHeader />
          <SidebarLayout
            title={`${getApplicationName()} - Översikt`}
            setShowAttestationTable={setShowAttestationTable}
            showAttestationTable={showAttestationTable}
          >
            {isLOP() && showAttestationTable && user.permissions.canViewAttestations ? (
              <AttestationTab />
            ) : municipalityId ? (
              <OngoingSupportErrands ongoing={{ errands: [], labels: [] }} />
            ) : null}
          </SidebarLayout>
        </>
      ) : (
        <>
          <OngoingCaseDataHeader />
          <SidebarLayout
            setShowAttestationTable={setShowAttestationTable}
            showAttestationTable={showAttestationTable}
            title={`${getApplicationName()} - Översikt`}
          >
            {isPT() ? <OngoingCaseDataErrands /> : isMEX() ? <OngoingCaseDataErrands /> : <></>}
          </SidebarLayout>
        </>
      )}
    </>
  );
};

export default Oversikt;
