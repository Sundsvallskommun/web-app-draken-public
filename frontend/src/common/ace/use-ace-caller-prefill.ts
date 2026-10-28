import { AddressResult, searchPerson } from '@common/services/adress-service';
import { useSnackbar } from '@sk-web-gui/react';
import { useEffect, useRef } from 'react';

import { HandedOverCaller, takePendingCaller } from './ace-pending-caller';

/**
 * The caller as the errand form gets it: what ACE knew, plus the looked-up person when the caller
 * was identified. A personal number without a person means the lookup failed.
 */
export type AceCallerPrefill = HandedOverCaller & { person?: AddressResult };

interface CallerLookup {
  caller: HandedOverCaller;
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
  const caller = takePendingCaller(errandNumber);
  if (!caller) {
    return null;
  }
  // A caller who was not identified is only known by phone number; there is nobody to look up.
  const person = caller.personNumber ? searchPerson(caller.personNumber) : Promise.resolve(undefined);
  const lookup = { caller, person };
  lookups.set(errandNumber, lookup);
  lookup.person.finally(() => lookups.delete(errandNumber)).catch(() => {});
  return lookup;
};

/**
 * When this errand was opened for a caller in ACE (see AceConnector), hands the caller to onCaller,
 * once, so the form can be pre-filled: an identified caller is looked up via the BFF/Citizen, and
 * what ACE knew is passed on also when the lookup fails.
 */
export const useAceCallerPrefill = (
  errandNumber: string | undefined,
  onCaller: (caller: AceCallerPrefill) => void
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
    const { personNumber, phoneNumber } = lookup.caller;
    let active = true;
    lookup.person
      .catch(() => undefined)
      .then((person) => {
        if (!active) {
          return;
        }
        // Without the person, hand over what ACE knew so the case worker can search with it.
        latest.current.onCaller({ personNumber, phoneNumber, person });
        if (personNumber && !person) {
          latest.current.toastMessage({
            position: 'bottom',
            closeable: true,
            message:
              'Personuppgifterna för den som ringer kunde inte hämtas. Personnumret är ifyllt under Ärendeägare, sök igen eller lägg till ärendeägaren manuellt.',
            status: 'error',
          });
        }
      });
    return () => {
      active = false;
    };
  }, [errandNumber]);
};
