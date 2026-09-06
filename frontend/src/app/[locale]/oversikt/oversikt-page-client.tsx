'use client';

import { DeployInfoBanner } from '@common/utils/deploy-info-banner';
import { appConfig } from '@config/appconfig';
import { applicationUi } from '@dragon';
import SidebarLayout from '@shell/layout/sidebar-layout.component';
import { useState } from 'react';

export function OversiktPageClient() {
  const [showAttestationTable, setShowAttestationTable] = useState(false);
  const [showContractTable, setShowContractTable] = useState(false);
  const selection = { showAttestationTable, setShowAttestationTable, showContractTable, setShowContractTable };
  return (
    <>
      <SidebarLayout title={`${appConfig.applicationName} - Översikt`} {...selection}>
        <applicationUi.Overview {...selection} />
      </SidebarLayout>
      <DeployInfoBanner />
    </>
  );
}
