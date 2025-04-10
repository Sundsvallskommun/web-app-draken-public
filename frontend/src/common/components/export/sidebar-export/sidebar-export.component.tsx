import React, { useState } from 'react';
import { Button, Checkbox, FormControl } from '@sk-web-gui/react';
import { IErrand } from '@casedata/interfaces/errand';
import { useAppContext } from '@contexts/app.context';
import { useForm } from 'react-hook-form';
import { exportErrands } from '@common/services/export-service';

interface ExportParameters {
  basicInformation: boolean;
  errandInformation: boolean;
  attachments: boolean;
  messages: boolean;
  notes: boolean;
  investigationText: boolean;
}

export const SidebarExport: React.FC = () => {
  const { municipalityId, errand }: { municipalityId: string; errand: IErrand } = useAppContext();
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const { register, getValues } = useForm<ExportParameters>({
    defaultValues: {
      basicInformation: true,
      errandInformation: true,
      attachments: true,
      messages: true,
      notes: true,
      investigationText: true,
    },
  });

  const handleSubmit = () => {
    setIsLoading(true);
    const excludeParameters = Object.entries(getValues())
      .map(([key, value]) => !value && key)
      .filter(Boolean);

    exportErrands(municipalityId, [errand], excludeParameters).then(() => {});
    setIsLoading(false);
  };

  return (
    <div>
      <div className="mb-24">
        <span className="text-base md:text-large xl:text-lead font-semibold">Exportera ärende</span>
      </div>

      <FormControl className="w-full">
        <Checkbox {...register('basicInformation')} key={'basicInformation'}>
          Inkludera grundinformation
        </Checkbox>
        <Checkbox {...register('errandInformation')} key={'errandInformation'}>
          Inkludera ärendeuppgifter
        </Checkbox>
        <Checkbox {...register('attachments')} key={'attachments'}>
          Inkludera bilagor
        </Checkbox>
        <Checkbox {...register('messages')} key={'messages'}>
          Inkludera meddelanden
        </Checkbox>
        <Checkbox {...register('notes')} key={'notes'}>
          Inkludera tjänsteanteckningar
        </Checkbox>
        <Checkbox {...register('investigationText')} key={'investigationText'}>
          Inkludera utredningstext
        </Checkbox>

        <Button onClick={handleSubmit} className="mt-24" color="vattjom" loading={isLoading}>
          Exportera ärende
        </Button>
      </FormControl>
    </div>
  );
};
