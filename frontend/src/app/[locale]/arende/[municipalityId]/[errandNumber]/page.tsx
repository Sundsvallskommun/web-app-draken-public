'use client';

import { CasedataErrandComponent } from '@casedata/components/errand/casedata-errand.component';
import Layout from '@common/components/layout/layout.component';
import { useAppContext } from '@common/contexts/app.context';
import { getAdminUsers } from '@common/services/user-service';
import { appConfig } from '@config/appconfig';
import { SupportErrandComponent } from '@supportmanagement/components/support-errand/support-errand.component';
import { getSupportMetadata } from '@supportmanagement/services/support-metadata-service';
import { default as NextLink } from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

const Arende: React.FC = () => {
  const pathName = usePathname();
  const [errandId, setErrandId] = useState<string>();
  const { setAdministrators, setSubPage, municipalityId, setMunicipalityId, setSupportMetadata } = useAppContext();

  const initialFocus = useRef<HTMLBodyElement>(null);
  const setInitalFocus = () => {
    setTimeout(() => {
      initialFocus.current && initialFocus.current.focus();
    });
  };

  useEffect(() => {
    const municipality = pathName?.split('/')[2];
    const errandNumber = pathName?.split('/')[3];
    municipality && setMunicipalityId(municipality);
    errandNumber && setErrandId(errandNumber);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    getAdminUsers().then((data) => {
      setAdministrators(data);
    });
    setSubPage('Pågående ärende');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    appConfig.isSupportManagement &&
      municipalityId &&
      getSupportMetadata().then((res) => setSupportMetadata(res.metadata));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [municipalityId]);

  return (
    <div className="bg-background-100 h-screen min-h-screen max-h-screen overflow-hidden w-full flex flex-col">
      <Layout title={`${appConfig.applicationName} - Pågående ärende`}>
        <NextLink
          href="#content"
          passHref
          tabIndex={1}
          onClick={() => setInitalFocus()}
          className="sr-only focus:not-sr-only bg-primary-light border-2 border-black p-4 text-black inline-block focus:absolute focus:top-0 focus:left-0 focus:right-0 focus:m-auto focus:w-80 text-center"
        >
          Hoppa till innehåll
        </NextLink>

        {appConfig.isCaseData
          ? !!errandId && <CasedataErrandComponent id={errandId} />
          : appConfig.isSupportManagement
          ? !!errandId && !!municipalityId && <SupportErrandComponent id={errandId} />
          : null}
      </Layout>
    </div>
  );
};

export default Arende;
