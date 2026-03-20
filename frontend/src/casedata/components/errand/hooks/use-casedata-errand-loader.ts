import { IErrand } from '@casedata/interfaces/errand';
import { emptyErrand, getErrandByErrandNumber } from '@casedata/services/casedata-errand-service';
import { getUiPhase } from '@casedata/services/process-service';
import { useCasedataStore, useConfigStore } from '@stores/index';
import { useSnackbar } from '@sk-web-gui/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface LoaderResult {
  isLoading: boolean;
}

export function useCasedataErrandLoader(errandNumber?: string): LoaderResult {
  const [isLoading, setIsLoading] = useState(false);
  const municipalityId = useConfigStore((s) => s.municipalityId);
  const errand = useCasedataStore((s) => s.errand);
  const setErrand = useCasedataStore((s) => s.setErrand);
  const setUiPhase = useCasedataStore((s) => s.setUiPhase);
  const toastMessage = useSnackbar();
  const router = useRouter();

  useEffect(() => {
    if (errandNumber) {
      setIsLoading(true);
      getErrandByErrandNumber(municipalityId, errandNumber)
        .then((res) => {
          if (res.error) {
            toastMessage({
              position: 'bottom',
              closeable: false,
              message: res.error,
              status: 'error',
            });
          }
          setErrand(res.errand);
          setIsLoading(false);
        })
        .catch(() => {
          toastMessage({
            position: 'bottom',
            closeable: false,
            message: `Något gick fel när ärendet skulle hämtas`,
            status: 'error',
          });
        });
    } else {
      setErrand(emptyErrand as IErrand);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  useEffect(() => {
    if (errand) {
      setUiPhase(getUiPhase(errand));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [errand]);

  return { isLoading };
}
