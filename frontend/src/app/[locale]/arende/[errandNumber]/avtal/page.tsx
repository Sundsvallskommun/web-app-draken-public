'use client';

import { CasedataContractTab } from '@casedata/components/errand/tabs/contract/casedata-contract-tab';
import { appConfig } from '@config/appconfig';

const Avtal: React.FC = () => {
  return appConfig.isCaseData && <CasedataContractTab />;
};

export default Avtal;
