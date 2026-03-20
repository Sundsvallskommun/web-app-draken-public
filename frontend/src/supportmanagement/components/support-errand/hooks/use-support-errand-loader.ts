import { useConfigStore, useSupportStore } from '@stores/index';
import { useSnackbar } from '@sk-web-gui/react';
import {
  getSupportErrandByErrandNumber,
  initiateSupportErrand,
  supportErrandIsEmpty,
} from '@supportmanagement/services/support-errand-service';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface LoaderResult {
  isLoading: boolean;
  message: string;
}

export function useSupportErrandLoader(errandNumber?: string): LoaderResult {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('Hämtar ärende..');
  const municipalityId = useConfigStore((s) => s.municipalityId);
  const supportErrand = useSupportStore((s) => s.supportErrand);
  const setSupportErrand = useSupportStore((s) => s.setSupportErrand);
  const toastMessage = useSnackbar();
  const router = useRouter();

  useEffect(() => {
    if (errandNumber) {
      setIsLoading(true);
      getSupportErrandByErrandNumber(errandNumber)
        .then((res) => {
          if (res.error) {
            toastMessage({
              position: 'bottom',
              closeable: false,
              message: res.error,
              status: 'error',
            });
          }
          setSupportErrand(res.errand);
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
    } else if (municipalityId && supportErrand && supportErrandIsEmpty(supportErrand) && !isLoading) {
        setIsLoading(true);
        setMessage('Registrerar nytt ärende..');
        initiateSupportErrand(municipalityId)
          .then((result) =>
            setTimeout(() => {
              router.push(`/arende/${result.errandNumber}`);
            }, 10)
          )
          .catch((e) => {
            console.error('Error when initiating errand:', e);
            setIsLoading(false);
            toastMessage({
              position: 'bottom',
              closeable: false,
              message: 'Något gick fel när ärendet skulle initieras',
              status: 'error',
            });
          });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, municipalityId, errandNumber]);

  return { isLoading, message };
}
