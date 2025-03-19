import { OngoingCaseDataErrands } from '@casedata/components/ongoing-casedata-errands/ongoing-casedata-errands.component';
import SidebarLayout from '@common/components/layout/sidebar-layout.component';
import { useAppContext } from '@common/contexts/app.context';
import {
  getApplicationName,
  isCaseData,
  isSupportManagement,
  usesBilling,
  isKA,
} from '@common/services/application-service';
import { getAdminUsers } from '@common/services/user-service';
import { AttestationTab } from '@supportmanagement/components/attestation-tab/attestation-tab.component';
import { OngoingSupportErrands } from '@supportmanagement/components/ongoing-support-errands/ongoing-support-errands.component';
import { getSupportMetadata } from '@supportmanagement/services/support-metadata-service';
import { useRouter } from 'next/router';
import { useEffect, useRef, useState } from 'react';

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
    (isSupportManagement() || isKA()) &&
      municipalityId &&
      getSupportMetadata(municipalityId).then((res) => setSupportMetadata(res.metadata));
  }, [municipalityId]);

  return (
    <>
      {isSupportManagement() || isKA() ? (
        <SidebarLayout
          title={`${getApplicationName()} - Översikt`}
          setShowAttestationTable={setShowAttestationTable}
          showAttestationTable={showAttestationTable}
        >
          {usesBilling() && showAttestationTable && user.permissions.canViewAttestations ? (
            <AttestationTab />
          ) : municipalityId ? (
            <OngoingSupportErrands ongoing={{ errands: [], labels: [] }} />
          ) : null}
        </SidebarLayout>
      ) : null}

      {isCaseData() ? (
        <SidebarLayout
          title={`${getApplicationName()} - Översikt`}
          setShowAttestationTable={setShowAttestationTable}
          showAttestationTable={showAttestationTable}
        >
          <OngoingCaseDataErrands />
        </SidebarLayout>
      ) : null}
    </>
  );
};

export default Oversikt;
