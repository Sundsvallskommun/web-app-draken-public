'use client';
import { CasedataAttachments } from '@casedata/components/errand/tabs/attachments/casedata-attachments.component';
import { appConfig } from '@config/appconfig';
import { SupportErrandAttachmentsTab } from '@supportmanagement/components/support-errand/tabs/support-errand-attachments-tab';

const Bilagor: React.FC = () => {
  return (
    <>
      {appConfig.isSupportManagement && <SupportErrandAttachmentsTab />}
      {appConfig.isCaseData && <CasedataAttachments key={`attachments-tab`} />}
    </>
  );
};

export default Bilagor;
