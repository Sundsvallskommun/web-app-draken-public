import { IErrand } from '@casedata/interfaces/errand';
import { emptyErrand, isErrandLocked } from '@casedata/services/casedata-errand-service';
import { yupResolver } from '@hookform/resolvers/yup';
import { useCasedataStore } from '@stores/index';
import { ReactNode, useEffect } from 'react';
import { FormProvider, Resolver, useForm } from 'react-hook-form';
import * as yup from 'yup';

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

interface Props {
  children: ReactNode;
}

export const CasedataErrandFormProvider: React.FC<Props> = ({ children }) => {
  const errand = useCasedataStore((s) => s.errand);

  const methods = useForm<IErrand>({
    resolver: yupResolver(formSchema) as unknown as Resolver<IErrand>,
    defaultValues: errand ?? (emptyErrand as IErrand),
    mode: 'onChange',
    disabled: errand ? isErrandLocked(errand) : false,
  });

  useEffect(() => {
    if (errand) {
      methods.reset(errand);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [errand]);

  return <FormProvider {...methods}>{children}</FormProvider>;
};
