import { CasedataErrandComponent } from '@casedata/components/errand/casedata-errand.component';
import Layout from '@common/components/layout/layout.component';
import { useAppContext } from '@common/contexts/app.context';
import { getAdminUsers } from '@common/services/user-service';
import { appConfig } from '@config/appconfig';
import { SupportErrandComponent } from '@supportmanagement/components/support-errand/support-errand.component';
import { default as NextLink } from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useRef } from 'react';

export const Oversikt: React.FC = () => {
  const router = useRouter();

  const { isLoggedIn, setAdministrators, setSubPage, setMunicipalityId } = useAppContext();

  useEffect(() => {
    if (!isLoggedIn) {
      // router.push('/login');
    }
    getAdminUsers().then((data) => {
      setAdministrators(data);
    });
    setSubPage('Registrera ärende');
  }, [isLoggedIn, router]);

  useEffect(() => {
    setMunicipalityId(process.env.NEXT_PUBLIC_MUNICIPALITY_ID);
  }, []);

  const initialFocus = useRef(null);
  const setInitalFocus = (e) => {
    setTimeout(() => {
      initialFocus.current && initialFocus.current.focus();
    });
  };

  return (
    <div className="bg-background-100 h-screen min-h-screen max-h-screen overflow-hidden w-full flex flex-col">
      <Layout title={`${appConfig.applicationName} - Registrera ärende`}>
        <NextLink href="#content" passHref legacyBehavior>
          <a
            tabIndex={1}
            onClick={(e) => setInitalFocus(e)}
            className="sr-only focus:not-sr-only bg-primary-light border-2 border-black p-4 text-black inline-block focus:absolute focus:top-0 focus:left-0 focus:right-0 focus:m-auto focus:w-80 text-center"
          >
            Hoppa till innehåll
          </a>
        </NextLink>
        {appConfig.isSupportManagement ? <SupportErrandComponent /> : null}
        {appConfig.isCaseData ? <CasedataErrandComponent /> : null}
      </Layout>
    </div>
  );
};

export default Oversikt;
