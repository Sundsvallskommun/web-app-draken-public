import { ErrandSection } from '@common/components/errand-section/errand-section.component';
import { useSupportStore } from '@stores/index';
import { ApiSupportErrand, SupportErrand } from '@supportmanagement/services/support-errand-service';
import { Info } from 'lucide-react';
import { FC, useEffect } from 'react';
import { useFormContext, UseFormReturn } from 'react-hook-form';

import { SupportErrandBasicsAboutForm } from '../support-errand-basics-form/support-errand-basics-about-form.component';

export const SupportErrandBasicsAboutDisclosure: FC<{
  errand: ApiSupportErrand;
  setUnsaved: (unsaved: boolean) => void;
  update: () => void;
}> = () => {
  const supportErrand = useSupportStore((s) => s.supportErrand);

  const formControls: UseFormReturn<SupportErrand> = useFormContext();
  const { setValue } = formControls;

  useEffect(() => {
    setValue('id', supportErrand?.id, { shouldDirty: false });
  }, [setValue, supportErrand]);
  return (
    <ErrandSection icon={<Info />} title="Om ärendet" initialOpen>
      <SupportErrandBasicsAboutForm supportErrand={supportErrand!} />
    </ErrandSection>
  );
};
