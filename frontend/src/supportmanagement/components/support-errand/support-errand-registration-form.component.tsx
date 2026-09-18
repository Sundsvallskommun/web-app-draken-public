'use client';

import { appConfig } from '@config/appconfig';
import { Button, FormControl, FormLabel, Select, Spinner } from '@sk-web-gui/react';
import {
  findPriorityLabelForPriorityKey,
  getSupportRegistrationOptions,
  initiateSupportErrand,
  type SupportRegistrationOptions,
} from '@supportmanagement/services/support-errand-service';
import { useRouter } from 'next/navigation';
import { FC, useEffect, useState } from 'react';

interface SupportErrandRegistrationFormProps {
  municipalityId: string;
}

/**
 * The registration form for the drakes that ask before the errand exists.
 *
 * Nothing here knows which drake it is running as: the backend answers with the choices this
 * deployment offers and the places this handler is configured for, and the form renders those. A
 * deployment that configures no form never reaches this component at all.
 */
export const SupportErrandRegistrationForm: FC<SupportErrandRegistrationFormProps> = ({ municipalityId }) => {
  const router = useRouter();
  const [options, setOptions] = useState<SupportRegistrationOptions>();
  const [loadError, setLoadError] = useState<string>();
  const [reportTypeLabelId, setReportTypeLabelId] = useState('');
  const [locationLabelId, setLocationLabelId] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [isRegistering, setIsRegistering] = useState(false);
  const [registerError, setRegisterError] = useState<string>();

  useEffect(() => {
    let current = true;
    getSupportRegistrationOptions(municipalityId)
      .then((loaded) => {
        if (!current) return;
        setOptions(loaded);
        if (loaded.priorities.includes(priority)) return;
        setPriority(loaded.priorities[0] ?? '');
      })
      .catch(() => {
        if (current) setLoadError('Registreringsvalen kunde inte hämtas. Ladda om sidan och försök igen.');
      });
    return () => {
      current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [municipalityId]);

  const register = () => {
    setIsRegistering(true);
    setRegisterError(undefined);
    initiateSupportErrand(municipalityId, { reportTypeLabelId, locationLabelId, priority })
      .then((errand) => router.push(`/arende/${errand.errandNumber}`))
      .catch(() => {
        setIsRegistering(false);
        setRegisterError('Ärendet kunde inte registreras. Dina val finns kvar och du kan försöka igen.');
      });
  };

  if (loadError) {
    return (
      <div className="mx-auto w-full max-w-screen-lg p-24 md:p-40" role="alert">
        <h1 className="text-h2-md mb-16">Registrera ärende</h1>
        <p className="text-base">{loadError}</p>
      </div>
    );
  }

  if (!options) {
    return (
      <div className="mx-auto w-full max-w-screen-lg p-24 md:p-40" aria-busy="true">
        <Spinner size={3} /> <span className="ml-8">Hämtar registreringsvalen..</span>
      </div>
    );
  }

  // A handler with no configured place cannot file an errand anywhere, and saying so is more use
  // than a form whose only mandatory choice is empty.
  if (options.locations.length === 0) {
    return (
      <div className="mx-auto w-full max-w-screen-lg p-24 md:p-40" role="alert" data-cy="registration-without-location">
        <h1 className="text-h2-md mb-16">Registrera ärende</h1>
        <p className="text-base">
          Du har ingen plats kopplad till ditt konto, och ett ärende måste höra till en plats. Kontakta den som
          administrerar behörigheterna för {appConfig.applicationName} för att få en plats kopplad.
        </p>
      </div>
    );
  }

  const canRegister = Boolean(reportTypeLabelId) && Boolean(locationLabelId) && !isRegistering;

  return (
    <div className="mx-auto w-full max-w-screen-lg p-24 md:p-40" data-cy="support-registration-form">
      <h1 className="text-h2-md mb-24">Registrera ärende</h1>

      <FormControl className="mb-24 w-full max-w-[40rem]">
        <FormLabel htmlFor="registration-report-type">Vad gäller det?</FormLabel>
        <Select
          id="registration-report-type"
          data-cy="registration-report-type"
          value={reportTypeLabelId}
          onChange={(event) => setReportTypeLabelId(event.target.value)}
        >
          <Select.Option value="">Välj</Select.Option>
          {options.reportTypes.map((reportType) => (
            <Select.Option key={reportType.labelId} value={reportType.labelId}>
              {reportType.displayName}
            </Select.Option>
          ))}
        </Select>
      </FormControl>

      <FormControl className="mb-24 w-full max-w-[40rem]">
        <FormLabel htmlFor="registration-location">Vilken plats gäller det?</FormLabel>
        <Select
          id="registration-location"
          data-cy="registration-location"
          value={locationLabelId}
          onChange={(event) => setLocationLabelId(event.target.value)}
        >
          <Select.Option value="">Välj</Select.Option>
          {options.locations.map((location) => (
            <Select.Option key={location.labelId} value={location.labelId}>
              {location.displayName}
            </Select.Option>
          ))}
        </Select>
      </FormControl>

      {options.priorities.length > 0 && (
        <FormControl className="mb-24 w-full max-w-[40rem]">
          <FormLabel htmlFor="registration-priority">Prioritet</FormLabel>
          <Select
            id="registration-priority"
            data-cy="registration-priority"
            value={priority}
            onChange={(event) => setPriority(event.target.value)}
          >
            {options.priorities.map((priorityKey) => (
              <Select.Option key={priorityKey} value={priorityKey}>
                {findPriorityLabelForPriorityKey(priorityKey) ?? priorityKey}
              </Select.Option>
            ))}
          </Select>
        </FormControl>
      )}

      {registerError && (
        <p className="mb-16 text-error" role="alert">
          {registerError}
        </p>
      )}

      <Button variant="primary" disabled={!canRegister} onClick={register} data-cy="registration-submit">
        {isRegistering ? 'Registrerar..' : 'Registrera ärende'}
      </Button>
    </div>
  );
};
