'use client';
import CasedataForm from '@casedata/components/errand/tabs/overview/casedata-form.component';
import { appConfig } from '@config/appconfig';
import { SupportErrandBasicsTab } from '@supportmanagement/components/support-errand/tabs/support-errand-basics-tab';

const Grundinformation: React.FC = () => {
  return (
    <>
      {appConfig.isSupportManagement && (
        <SupportErrandBasicsTab
          setUnsaved={function (unsaved: boolean): void {
            throw new Error('Function not implemented.');
          }}
        />
      )}
      {appConfig.isCaseData && <CasedataForm />}
    </>
  );
};

export default Grundinformation;
