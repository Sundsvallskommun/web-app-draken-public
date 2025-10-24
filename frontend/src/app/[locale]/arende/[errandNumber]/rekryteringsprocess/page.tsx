'use client';
import { appConfig } from '@config/appconfig';
import { SupportErrandRecruitmentTab } from '@supportmanagement/components/support-errand/tabs/support-errand-recruitment-tab';

const Rekryteringsprocess: React.FC = () => {
  return appConfig.isSupportManagement && <SupportErrandRecruitmentTab />;
};

export default Rekryteringsprocess;
