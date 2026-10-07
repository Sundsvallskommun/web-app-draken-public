import { AddressResult, searchPerson } from '@common/services/adress-service';
import { useSnackbar } from '@sk-web-gui/react';
import { useEffect, useRef } from 'react';

import { takePendingCaller } from './ace-pending-caller';

interface CallerLookup {
  personNumber: string;
  person: Promise<AddressResult | undefined>;
}

// The hand-over is consumed on first read, so a lookup in flight is shared per errand to survive
// effects that run twice (React strict mode) or a remount before it settles. Entries are removed as
// soon as the lookup settles, so the map only ever holds lookups that are still running.
const lookups = new Map<string, CallerLookup>();

const getCallerLookup = (errandNumber: string): CallerLookup | null => {
  const inFlight = lookups.get(errandNumber);
  if (inFlight) {
    return inFlight;
  }
  const personNumber = takePendingCaller(errandNumber);
  if (!personNumber) {
    return null;
  }
  const lookup = { personNumber, person: searchPerson(personNumber) };
  lookups.set(errandNumber, lookup);
  lookup.person.finally(() => lookups.delete(errandNumber)).catch(() => {});
  return lookup;
};

/**
 * When this errand was opened for a caller identified in ACE (see AceConnector), looks the caller
 * up via the BFF/Citizen and hands the result to onCaller, once, so the form can be pre-filled.
 */
export const useAceCallerPrefill = (
  errandNumber: string | undefined,
  onCaller: (person: AddressResult, personNumber: string) => void
): void => {
  const toastMessage = useSnackbar();
  const latest = useRef({ onCaller, toastMessage });
  useEffect(() => {
    latest.current = { onCaller, toastMessage };
  });

  useEffect(() => {
    if (!errandNumber) {
      return;
    }
    const lookup = getCallerLookup(errandNumber);
    if (!lookup) {
      return;
    }
    let active = true;
    lookup.person
      .then((person) => {
        if (!active) {
          return;
        }
        if (!person) {
          throw new Error('Caller not found');
        }
        latest.current.onCaller(person, lookup.personNumber);
      })
      .catch(() => {
        if (!active) {
          return;
        }
        latest.current.toastMessage({
          position: 'bottom',
          closeable: true,
          message: 'Personuppgifterna för den som ringer kunde inte hämtas. Lägg till ärendeägaren manuellt.',
          status: 'error',
        });
      });
    return () => {
      active = false;
    };
  }, [errandNumber]);
};
