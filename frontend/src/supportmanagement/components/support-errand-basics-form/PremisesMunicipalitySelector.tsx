import { FormControl, FormLabel, Select } from '@sk-web-gui/react';
import {
  getErrandParameterValue,
  isSupportErrandLocked,
  SupportErrand,
  upsertErrandParameter,
} from '@supportmanagement/services/support-errand-service';
import { FC } from 'react';
import { useFormContext, UseFormReturn } from 'react-hook-form';

/** Same parameter key and municipality codes as katla-aot uses when an errand is registered there. */
const PREMISES_MUNICIPALITY_KEY = 'premisesMunicipalityId';
const PREMISES_MUNICIPALITIES = [
  { id: '2281', label: 'Sundsvall' },
  { id: '2262', label: 'Timrå' },
];

export const PremisesMunicipalitySelector: FC<{ supportErrand: SupportErrand }> = ({ supportErrand }) => {
  const { watch, setValue, getValues }: UseFormReturn<SupportErrand> = useFormContext();

  return (
    <FormControl id="premisesMunicipality" className="w-full">
      <FormLabel>Kommun</FormLabel>
      <Select
        value={getErrandParameterValue(watch('parameters'), PREMISES_MUNICIPALITY_KEY)}
        onChange={(e) => {
          setValue(
            'parameters',
            upsertErrandParameter(getValues('parameters'), PREMISES_MUNICIPALITY_KEY, e.target.value, 'Kommun'),
            { shouldDirty: true }
          );
        }}
        disabled={isSupportErrandLocked(supportErrand)}
        data-cy="premises-municipality-input"
        className="w-full text-dark-primary"
        variant="primary"
        size="md"
      >
        <Select.Option value="">Välj kommun</Select.Option>
        {PREMISES_MUNICIPALITIES.map((m) => (
          <Select.Option key={`premises-municipality-${m.id}`} value={m.id}>
            {m.label}
          </Select.Option>
        ))}
      </Select>
    </FormControl>
  );
};
