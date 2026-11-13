import { FormControl, FormLabel, Select } from '@sk-web-gui/react';
import {
  getErrandParameterValue,
  isSupportErrandLocked,
  PREMISES_MUNICIPALITY_KEY,
  SupportErrand,
  upsertErrandParameter,
} from '@supportmanagement/services/support-errand-service';
import {
  getSupportErrandProcess,
  supportProcessIsPastReview,
} from '@supportmanagement/services/support-process-service';
import { FC } from 'react';
import { useFormContext, UseFormReturn } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

/**
 * Same municipality codes as katla-aot uses when an errand is registered there. Settled once the review
 * is over, since it decides whether the errand needed Timrå's registry number to leave the review.
 */
const PREMISES_MUNICIPALITIES = [
  { id: '2281', label: 'Sundsvall' },
  { id: '2262', label: 'Timrå' },
];

export const PremisesMunicipalitySelector: FC<{ supportErrand: SupportErrand }> = ({ supportErrand }) => {
  const { t } = useTranslation();
  const { watch, setValue, getValues }: UseFormReturn<SupportErrand> = useFormContext();

  return (
    <FormControl id="premisesMunicipality" className="w-full">
      <FormLabel>{t('common:basics_tab.premises_municipality.title')}</FormLabel>
      <Select
        value={getErrandParameterValue(watch('parameters'), PREMISES_MUNICIPALITY_KEY)}
        onChange={(e) => {
          setValue(
            'parameters',
            upsertErrandParameter(getValues('parameters'), PREMISES_MUNICIPALITY_KEY, e.target.value, 'Kommun'),
            { shouldDirty: true }
          );
        }}
        disabled={
          isSupportErrandLocked(supportErrand) || supportProcessIsPastReview(getSupportErrandProcess(supportErrand))
        }
        data-cy="premises-municipality-input"
        className="w-full text-dark-primary"
        variant="primary"
        size="md"
      >
        <Select.Option value="">{t('common:basics_tab.premises_municipality.placeholder')}</Select.Option>
        {PREMISES_MUNICIPALITIES.map((m) => (
          <Select.Option key={`premises-municipality-${m.id}`} value={m.id}>
            {m.label}
          </Select.Option>
        ))}
      </Select>
    </FormControl>
  );
};
