'use client';

import { CasedataErrandComponent } from '@casedata/components/errand/casedata-errand.component';
import Layout from '@common/components/layout/layout.component';
import { getAdminUsers } from '@common/services/user-service';
import { appConfig } from '@config/appconfig';
import { useAppContext } from '@contexts/app.context';
import { SupportErrandComponent } from '@supportmanagement/components/support-errand/support-errand.component';
import { default as NextLink } from 'next/link';
import { useEffect, useRef } from 'react';

const Registrera: React.FC = () => {
  const { setAdministrators, setMunicipalityId } = useAppContext();

  const initialFocus = useRef<HTMLBodyElement>(null);
  const setInitalFocus = () => {
    setTimeout(() => {
      initialFocus.current && initialFocus.current.focus();
    });
  };

  useEffect(() => {
    setMunicipalityId(process.env.NEXT_PUBLIC_MUNICIPALITY_ID || '');
    getAdminUsers().then((data) => {
      setAdministrators(data);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="bg-background-100 h-screen min-h-screen max-h-screen overflow-hidden w-full flex flex-col">
      <Layout title={`${appConfig.applicationName} - Registrera ärende`}>
        <NextLink
          href="#content"
          passHref
          tabIndex={1}
          onClick={() => setInitalFocus()}
          className="sr-only focus:not-sr-only bg-primary-light border-2 border-black p-4 text-black inline-block focus:absolute focus:top-0 focus:left-0 focus:right-0 focus:m-auto focus:w-80 text-center"
        >
          Hoppa till innehåll
        </NextLink>
        {appConfig.isSupportManagement ? <SupportErrandComponent /> : null}
        {appConfig.isCaseData ? <CasedataErrandComponent /> : null}
      </Layout>
    </div>
  );
};

export default Registrera;
