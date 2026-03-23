import { IErrand } from '@casedata/interfaces/errand';
import { getErrandNotes } from '@casedata/services/casedata-errand-notes-service';
import { emptyErrand, getErrandByErrandNumber, isErrandLocked } from '@casedata/services/casedata-errand-service';
import { getUiPhase } from '@casedata/services/process-service';
import { useCasedataStore, useConfigStore } from '@stores/index';
import { yupResolver } from '@hookform/resolvers/yup';
import { useSnackbar } from '@sk-web-gui/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { FormProvider, Resolver, useForm } from 'react-hook-form';
import * as yup from 'yup';
import { CasedataErrandLayout } from './casedata-errand-layout';

const formSchema = yup
  .object({
    caseType: yup
      .string()
      .required('Ärendetyp måste anges')
      .test('notDefaultCasetype', 'Ärendetyp måste väljas', (val) => !!val && val !== 'Välj ärendetyp'),
    channel: yup.string(),
    description: yup.string(),
    municipalityId: yup.string().required('Kommun måste anges'),
    phase: yup.string(),
    priority: yup.string(),
    status: yup.object({
      statusType: yup.string(),
    }),
  })
  .required();

export const CasedataErrandComponent: React.FC<{ errandNumber?: string }> = ({ errandNumber }) => {
  const [isLoading, setIsLoading] = useState(false);
  const municipalityId = useConfigStore((s) => s.municipalityId);
  const errand = useCasedataStore((s) => s.errand);
  const setErrand = useCasedataStore((s) => s.setErrand);
  const setUiPhase = useCasedataStore((s) => s.setUiPhase);
  const setNotesCount = useCasedataStore((s) => s.setNotesCount);
  const setServiceNotesCount = useCasedataStore((s) => s.setServiceNotesCount);
  const toastMessage = useSnackbar();
  const router = useRouter();

  const methods = useForm<IErrand>({
    resolver: yupResolver(formSchema) as unknown as Resolver<IErrand>,
    defaultValues: errand ?? (emptyErrand as IErrand),
    mode: 'onChange',
    disabled: errand ? isErrandLocked(errand) : false,
  });

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
      getErrandNotes(errand.notes).then(({ comments, serviceNotes }) => {
        setNotesCount(comments);
        setServiceNotesCount(serviceNotes);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [errand]);

  return (
    <FormProvider {...methods}>
      <CasedataErrandLayout isLoading={isLoading} />
    </FormProvider>
  );
};
