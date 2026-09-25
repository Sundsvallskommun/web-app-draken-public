'use client';

import SidebarLayout from '@common/components/layout/sidebar-layout.component';
import { appConfig } from '@config/appconfig';
import { FC, useState } from 'react';

export const CustomerPageClient: FC<{ heading: string }> = ({ heading }) => {
  const [showAttestationTable, setShowAttestationTable] = useState<boolean>(false);
  const [showContractTable, setShowContractTable] = useState<boolean>(false);

  return (
    <SidebarLayout
      title={`${appConfig.applicationName} - ${heading}`}
      setShowAttestationTable={setShowAttestationTable}
      showAttestationTable={showAttestationTable}
      setShowContractTable={setShowContractTable}
      showContractTable={showContractTable}
    >
      <main className="pl-40 pb-40 w-full">
        <div className="container mx-auto p-0 w-full">
          <div className="mt-32 flex flex-col gap-16">
            <div>
              <h1 className="p-0 m-0" data-cy="customer-page-heading">
                {heading}
              </h1>
            </div>
          </div>
        </div>
      </main>
    </SidebarLayout>
  );
};
