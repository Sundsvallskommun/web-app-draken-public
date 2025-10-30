'use client';

import CasedataForm from '@casedata/components/errand/tabs/overview/casedata-form.component';
import { appConfig } from '@config/appconfig';
import { Spinner, useSnackbar } from '@sk-web-gui/react';
import { initiateSupportErrand } from '@supportmanagement/services/support-errand-service';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';

const Registrera: React.FC = () => {
  const toastMessage = useSnackbar();
  const router = useRouter();
  const hasInitiated = useRef(false);

  useEffect(
    () => {
      if (!appConfig.isSupportManagement || hasInitiated.current) return;
      hasInitiated.current = true;

      if (appConfig.isSupportManagement) {
        initiateSupportErrand()
          .then((result) =>
            setTimeout(() => {
              router.push(`/arende/${result.errandNumber}/grundinformation`);
            }, 10)
          )
          .catch((e) => {
            console.error('Error when initiating errand:', e);
            toastMessage({
              position: 'bottom',
              closeable: false,
              message: `Något gick fel när ärendet skulle initieras ${e}`,
              status: 'error',
            });
          });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  return (
    <>
      {appConfig.isSupportManagement && (
        <div className="place-items-center place-content-center">
          <Spinner />
        </div>
      )}
      {appConfig.isCaseData && <CasedataForm registeringNewErrand />}
    </>
  );
};

export default Registrera;
