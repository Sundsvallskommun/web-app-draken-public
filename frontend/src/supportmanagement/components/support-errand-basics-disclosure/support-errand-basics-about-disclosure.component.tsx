import { useAppContext } from '@contexts/app.context';
import { Disclosure } from '@sk-web-gui/react';
import { ApiSupportErrand, SupportErrand } from '@supportmanagement/services/support-errand-service';
import { Info } from 'lucide-react';
import React, { useEffect } from 'react';
import { useFormContext, UseFormReturn } from 'react-hook-form';

import { SupportErrandBasicsAboutForm } from '../support-errand-basics-form/support-errand-basics-about-form.component';
export const SupportErrandBasicsAboutDisclosure: React.FC<{
  errand: ApiSupportErrand;
  setUnsaved: (unsaved: boolean) => void;
  update: () => void;
}> = () => {
  const { supportErrand } = useAppContext();

  const formControls: UseFormReturn<SupportErrand> = useFormContext();
  const { setValue } = formControls;

  useEffect(() => {
    setValue('id', supportErrand?.id, { shouldDirty: false });
    setValue('caseId', supportErrand?.externalTags?.find((t) => t.key === 'caseId')?.value, { shouldDirty: false });
  }, [setValue, supportErrand]);
  return (
    <Disclosure variant="alt" initalOpen>
      <Disclosure.Header>
        <Disclosure.Icon icon={<Info />} />
        <Disclosure.Title>Om ärendet</Disclosure.Title>
        <Disclosure.Button />
      </Disclosure.Header>
      <Disclosure.Content>
        <SupportErrandBasicsAboutForm supportErrand={supportErrand!} />
      </Disclosure.Content>
    </Disclosure>
  );
};
