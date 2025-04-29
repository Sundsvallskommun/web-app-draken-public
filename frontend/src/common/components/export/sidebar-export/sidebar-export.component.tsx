import React, { useState } from 'react';
import { Button, Checkbox, FormControl, useConfirm } from '@sk-web-gui/react';
import { IErrand } from '@casedata/interfaces/errand';
import { useAppContext } from '@contexts/app.context';
import { useForm } from 'react-hook-form';
import { exportErrands } from '@common/services/export-service';
import { ErrandStatus } from '@casedata/interfaces/errand-status';

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
  const exportConfirm = useConfirm();

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

  const isErrandNotClosed = () => {
    return errand.status.statusType !== ErrandStatus.ArendeAvslutat;
  };

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
        <Checkbox {...register('basicInformation')} key="basicInformation" data-cy="basicInformation">
          Inkludera grundinformation
        </Checkbox>
        <Checkbox {...register('errandInformation')} key="errandInformation" data-cy="errandInformation">
          Inkludera ärendeuppgifter
        </Checkbox>
        <Checkbox {...register('attachments')} key="attachments" data-cy="attachments">
          Inkludera bilagor
        </Checkbox>
        <Checkbox {...register('messages')} key="messages" data-cy="messages">
          Inkludera meddelanden
        </Checkbox>
        <Checkbox {...register('notes')} key="notes" data-cy="notes">
          Inkludera tjänsteanteckningar
        </Checkbox>
        <Checkbox {...register('investigationText')} key="investigationText" data-cy="investigationText">
          Inkludera utredningstext
        </Checkbox>

        <Button
          onClick={async () => {
            const confirmed = await exportConfirm.showConfirmation(
              'Exportera ärende?',
              `${
                isErrandNotClosed()
                  ? 'Detta ärende är inte avslutat. Är du säker på att du vill exportera? Exporten kommer att loggas.'
                  : 'Vill du exportera ärendet?'
              }`,
              'Ja',
              'Nej',
              'info'
            );
            if (confirmed) {
              handleSubmit();
            }
          }}
          className="mt-24"
          color="vattjom"
          loading={isLoading}
          data-cy="export-button"
        >
          Exportera ärende
        </Button>
      </FormControl>
    </div>
  );
};
