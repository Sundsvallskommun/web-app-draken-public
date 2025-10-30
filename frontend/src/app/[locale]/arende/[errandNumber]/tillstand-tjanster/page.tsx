'use client';

import { CasedataPermitServicesTab } from '@casedata/components/errand/tabs/permits-services/casedata-permits-services-tab';
import { appConfig } from '@config/appconfig';

const TillstandOchTjanster: React.FC = () => {
  return appConfig.isCaseData && <CasedataPermitServicesTab />;
};

export default TillstandOchTjanster;
