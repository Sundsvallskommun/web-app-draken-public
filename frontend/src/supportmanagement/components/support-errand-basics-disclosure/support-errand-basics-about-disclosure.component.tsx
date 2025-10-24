import { User } from '@common/interfaces/user';
import { useAppContext } from '@contexts/app.context';
import LucideIcon from '@sk-web-gui/lucide-icon';
import { Disclosure } from '@sk-web-gui/react';
import { SupportAttachment } from '@supportmanagement/services/support-attachment-service';
import { ApiSupportErrand, SupportErrand } from '@supportmanagement/services/support-errand-service';
import React, { useEffect } from 'react';
import { UseFormReturn, useFormContext } from 'react-hook-form';
import { SupportErrandBasicsAboutForm } from '../support-errand-basics-form/support-errand-basics-about-form.component';

export const SupportErrandBasicsAboutDisclosure: React.FC<{
  errand: ApiSupportErrand;
  setUnsaved: (unsaved: boolean) => void;
  update: () => void;
}> = () => {
  const {
    supportErrand,
  }: {
    supportErrand: SupportErrand;
    supportAttachments: SupportAttachment[];
    user: User;
  } = useAppContext();

  const formControls: UseFormReturn<SupportErrand> = useFormContext();
  const { setValue } = formControls;

  useEffect(() => {
    setValue('id', supportErrand.id);
    setValue('caseId', supportErrand.externalTags?.find((t) => t.key === 'caseId')?.value);
    if (supportErrand.externalTags) {
      setValue('caseId', supportErrand.externalTags?.find((t) => t.key === 'caseId')?.value);
    }
  }, [setValue, supportErrand]);

  useEffect(() => {});
  return (
    <Disclosure variant="alt" header="Om ärendet" icon={<LucideIcon name="info" />} initalOpen={true}>
      <SupportErrandBasicsAboutForm supportErrand={supportErrand} />
    </Disclosure>
  );
};
