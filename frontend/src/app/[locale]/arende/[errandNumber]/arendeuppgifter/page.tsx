'use client';
import { CasedataDetailsTab } from '@casedata/components/errand/tabs/details/casedata-details-tab';
import { appConfig } from '@config/appconfig';
import { SupportErrandDetailsTab } from '@supportmanagement/components/support-errand/tabs/support-errand-details-tab';

const Arendeuppgifter: React.FC = () => {
  return (
    <>
      {appConfig.isSupportManagement && <SupportErrandDetailsTab />}

      {appConfig.isCaseData && <CasedataDetailsTab />}
    </>
  );
};

export default Arendeuppgifter;
