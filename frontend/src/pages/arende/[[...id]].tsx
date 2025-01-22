import { CasedataErrandComponent } from '@casedata/components/errand/casedata-errand.component';
import Layout from '@common/components/layout/layout.component';
import { useAppContext } from '@common/contexts/app.context';
import { getApplicationName, isKC, isPT, isMEX, isLOP, isIK } from '@common/services/application-service';
import { getAdminUsers } from '@common/services/user-service';
import { SupportErrandComponent } from '@supportmanagement/components/support-errand/support-errand.component';
import { getSupportMetadata, getSupportMetadataRoles } from '@supportmanagement/services/support-metadata-service';
import { default as NextLink } from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useRef, useState } from 'react';

export default function Arende2() {
  const router = useRouter();
  const { id } = router.query;
  const [errandId, setMeaErrandId] = useState<string>();
  const {
    setAdministrators,
    setSubPage,
    municipalityId,
    setMunicipalityId,
    setSupportMetadata,
    setSupportMetadataRoles,
  } = useAppContext();

  const initialFocus = useRef(null);
  const setInitalFocus = (e) => {
    setTimeout(() => {
      initialFocus.current && initialFocus.current.focus();
    });
  };

  useEffect(() => {
    if (isPT() || isMEX()) {
      id?.[0] && setMunicipalityId(id[0]);
      id?.[1] && setMeaErrandId(id[1]);
    } else if (isKC() || isIK() || isLOP()) {
      id?.[0] && setMunicipalityId(id[0]);
      id?.[1] && setMeaErrandId(id[1]);
    }
  }, [id]);

  useEffect(() => {
    getAdminUsers().then((data) => {
      setAdministrators(data);
    });
    setSubPage('Pågående ärende');
  }, []);

  useEffect(() => {
    (isKC() || isIK() || isLOP()) &&
      municipalityId &&
      getSupportMetadata(municipalityId).then((res) => setSupportMetadata(res.metadata));
  }, [municipalityId]);

  useEffect(() => {
    (isKC() || isIK() || isLOP()) &&
      municipalityId &&
      getSupportMetadataRoles(municipalityId).then((res) => setSupportMetadataRoles(res.roles));
  }, [municipalityId]);

  return (
    <div className="bg-background-100 h-screen min-h-screen max-h-screen overflow-hidden w-full flex flex-col">
      <Layout title={`${getApplicationName()} - Pågående ärende`}>
        <NextLink href="#content" passHref legacyBehavior>
          <a
            tabIndex={1}
            onClick={(e) => setInitalFocus(e)}
            className="sr-only focus:not-sr-only bg-primary-light border-2 border-black p-4 text-black inline-block focus:absolute focus:top-0 focus:left-0 focus:right-0 focus:m-auto focus:w-80 text-center"
          >
            Hoppa till innehåll
          </a>
        </NextLink>

        {isPT() || isMEX()
          ? errandId && <CasedataErrandComponent id={errandId} />
          : isKC() || isIK() || isLOP()
          ? errandId && municipalityId && <SupportErrandComponent id={errandId} />
          : null}
      </Layout>
    </div>
  );
}
