import { FormControl, FormLabel, Input } from '@sk-web-gui/react';
import {
  EXTERNAL_CASE_REGISTRATION_NUMBER_KEY,
  getErrandParameterValue,
  isSupportErrandLocked,
  requiresExternalCaseRegistrationNumber,
  SupportErrand,
  upsertErrandParameter,
} from '@supportmanagement/services/support-errand-service';
import {
  getSupportErrandProcess,
  isSupportInspectionProcess,
  supportProcessIsPastReview,
} from '@supportmanagement/services/support-process-service';
import { FC } from 'react';
import { useFormContext, UseFormReturn } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

/**
 * The number from Timrå's registry, saved as an errand parameter. A Timrå errand shows it at every step and
 * cannot leave the review without it (the process step button waits for it). After the review the
 * number is locked, like the municipality. Inspections never ask for it.
 */
export const ExternalCaseRegistrationNumberInput: FC<{ supportErrand: SupportErrand }> = ({ supportErrand }) => {
  const { t } = useTranslation();
  const { watch, setValue, getValues }: UseFormReturn<SupportErrand> = useFormContext();
  const parameters = watch('parameters');
  const process = getSupportErrandProcess(supportErrand);
  const pastReview = supportProcessIsPastReview(process);

  if (!requiresExternalCaseRegistrationNumber(parameters) || isSupportInspectionProcess(process)) {
    return null;
  }

  const label = t('common:basics_tab.external_case_registration_number.title');

  return (
    <div className="flex my-24 gap-24">
      <div className="flex gap-xl w-1/2">
        <FormControl id="externalCaseRegistrationNumber" className="w-full" required>
          <FormLabel>{label}</FormLabel>
          <Input
            value={getErrandParameterValue(parameters, EXTERNAL_CASE_REGISTRATION_NUMBER_KEY)}
            onChange={(e) => {
              setValue(
                'parameters',
                upsertErrandParameter(
                  getValues('parameters'),
                  EXTERNAL_CASE_REGISTRATION_NUMBER_KEY,
                  e.target.value,
                  label
                ),
                { shouldDirty: true }
              );
            }}
            disabled={isSupportErrandLocked(supportErrand) || pastReview}
            placeholder={t('common:basics_tab.external_case_registration_number.placeholder')}
            data-cy="external-case-registration-number-input"
            className="w-full"
            size="md"
          />
        </FormControl>
      </div>
    </div>
  );
};
