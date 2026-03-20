import { yupResolver } from '@hookform/resolvers/yup';
import { useSupportStore } from '@stores/index';
import {
  SupportErrand,
  defaultSupportErrandInformation,
} from '@supportmanagement/services/support-errand-service';
import { ReactNode, useEffect } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import * as yup from 'yup';

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

interface Props {
  children: ReactNode;
}

export const SupportErrandFormProvider: React.FC<Props> = ({ children }) => {
  const supportErrand = useSupportStore((s) => s.supportErrand);

  const methods = useForm<SupportErrand>({
    resolver: yupResolver(formSchema) as any,
    defaultValues: defaultSupportErrandInformation,
    mode: 'onChange',
  });

  useEffect(() => {
    if (supportErrand) {
      methods.reset(supportErrand);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supportErrand]);

  return <FormProvider {...methods}>{children}</FormProvider>;
};
