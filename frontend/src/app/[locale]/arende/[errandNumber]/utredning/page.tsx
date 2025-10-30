'use client';

import { CasedataInvestigationTab } from '@casedata/components/errand/tabs/investigation/casedata-investigation-tab';
import { appConfig } from '@config/appconfig';

const Utredning: React.FC = () => {
  return appConfig.isCaseData && <CasedataInvestigationTab />;
};

export default Utredning;
