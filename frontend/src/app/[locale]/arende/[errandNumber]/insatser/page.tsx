'use client';

import { CasedataServicesTab } from '@casedata/components/errand/tabs/services/casedata-service-tab';
import { appConfig } from '@config/appconfig';
import { useParams, useRouter } from 'next/navigation';

const Insatser: React.FC = () => {
  const router = useRouter();
  const { errandNumber } = useParams();

  if (appConfig.isSupportManagement) {
    router.push(`/arende/${errandNumber}/grundinformation`);
  }

  return <CasedataServicesTab />;
};

export default Insatser;
