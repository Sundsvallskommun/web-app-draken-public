import { useConfigStore, useSupportStore } from '@stores/index';
import { yupResolver } from '@hookform/resolvers/yup';
import { useSnackbar } from '@sk-web-gui/react';
import {
  SupportErrand,
  defaultSupportErrandInformation,
  getSupportErrandByErrandNumber,
  initiateSupportErrand,
  supportErrandIsEmpty,
} from '@supportmanagement/services/support-errand-service';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import * as yup from 'yup';
import { SupportErrandLayout } from './support-errand-layout';

const formSchema = yup
  .object({
    id: yup.string(),
    category: yup.string().required('Välj ärendekategori'),
    type: yup.string().required('Välj ärendetyp'),
    channel: yup.string().required('Välj kanal'),
    description: yup.string(),
    parameters: yup.array(),
  })
  .required();

export const SupportErrandComponent: React.FC<{ errandNumber?: string }> = ({ errandNumber }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('Hämtar ärende..');
  const municipalityId = useConfigStore((s) => s.municipalityId);
  const supportErrand = useSupportStore((s) => s.supportErrand);
  const setSupportErrand = useSupportStore((s) => s.setSupportErrand);
  const toastMessage = useSnackbar();
  const router = useRouter();

  const methods = useForm<SupportErrand>({
    resolver: yupResolver(formSchema) as any,
    defaultValues: defaultSupportErrandInformation,
    mode: 'onChange',
  });

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
          methods.reset(res.errand);
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
    } else if (municipalityId && (!supportErrand || supportErrandIsEmpty(supportErrand)) && !isLoading) {
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

  return (
    <FormProvider {...methods}>
      <SupportErrandLayout isLoading={isLoading} loadingMessage={message} />
    </FormProvider>
  );
};
