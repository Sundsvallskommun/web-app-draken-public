'use client';

import { FormControl, FormHelperText, FormLabel, Input, Select } from '@sk-web-gui/react';
import type { SupportRegistrationOptions } from '@supportmanagement/services/support-errand-service';
import { FC } from 'react';

import { registrationLocationIsFixed } from './support-errand-registration-location';

interface RegistrationLocationFieldProps {
  options: SupportRegistrationOptions;
  locationLabelId: string;
  onChange: (locationLabelId: string) => void;
}

/**
 * The place a new errand belongs to. The unit the handler is employed at is the place, shown rather
 * than asked for when there is only one; a handler employed at several units picks among those, and
 * one whose employment is no place picks among the places configured for their account.
 */
export const RegistrationLocationField: FC<RegistrationLocationFieldProps> = ({
  options,
  locationLabelId,
  onChange,
}) => {
  if (registrationLocationIsFixed(options)) {
    return (
      <FormControl id="registration-location-fixed" className="w-full">
        <FormLabel>Plats</FormLabel>
        <Input
          className="w-full"
          data-cy="registration-location-fixed"
          value={options.locations[0].displayName}
          readOnly
        />
        <FormHelperText>Platsen hämtas från din anställning.</FormHelperText>
      </FormControl>
    );
  }

  return (
    <FormControl id="registration-location" className="w-full" required>
      <FormLabel>Vilken plats gäller det?</FormLabel>
      <Select
        className="w-full text-dark-primary"
        data-cy="registration-location"
        value={locationLabelId}
        onChange={(event) => onChange(event.target.value)}
      >
        <Select.Option value="">Välj</Select.Option>
        {options.locations.map((location) => (
          <Select.Option key={location.labelId} value={location.labelId}>
            {location.displayName}
          </Select.Option>
        ))}
      </Select>
      <FormHelperText>
        {options.locationSource === 'employment'
          ? 'Platserna är enheterna du är anställd på. Din huvudanställning är förvald.'
          : 'Din anställning finns inte som plats, så välj bland platserna som är kopplade till ditt konto.'}
      </FormHelperText>
    </FormControl>
  );
};
