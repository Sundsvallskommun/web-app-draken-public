'use client';

import { FormControl, FormHelperText, FormLabel, Select } from '@sk-web-gui/react';
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
      <div className="mb-24 w-full max-w-[40rem]" data-cy="registration-location-fixed">
        <p className="text-label-medium">Plats</p>
        <p>{options.locations[0].displayName}</p>
        <p className="text-small text-dark-secondary">Platsen hämtas från din anställning.</p>
      </div>
    );
  }

  return (
    <FormControl className="mb-24 w-full max-w-[40rem]">
      <FormLabel htmlFor="registration-location">Vilken plats gäller det?</FormLabel>
      <Select
        id="registration-location"
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
