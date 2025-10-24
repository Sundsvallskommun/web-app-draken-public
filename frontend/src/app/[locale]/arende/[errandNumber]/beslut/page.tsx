'use client';

import { CasedataDecisionTab } from '@casedata/components/errand/tabs/decision/casedata-decision-tab';
import { appConfig } from '@config/appconfig';

const Beslut: React.FC = () => {
  return appConfig.isCaseData && <CasedataDecisionTab />;
};

export default Beslut;
