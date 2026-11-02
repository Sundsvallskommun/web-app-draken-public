import { AddressResult, searchPerson } from '@common/services/adress-service';
import { useSnackbar } from '@sk-web-gui/react';
import { useEffect, useRef } from 'react';

import { getAceConfig } from './ace-config';
import { HandedOverCaller, requestPendingCaller } from './ace-pending-caller';

/**
 * The caller as the errand form gets it: what ACE knew, plus the looked-up person when the caller
 * was identified. A personal number without a person means the lookup failed.
 */
export type AceCallerPrefill = HandedOverCaller & { person?: AddressResult };

interface CallerLookup {
  caller: HandedOverCaller;
  person?: AddressResult;
}

// The hand-over is answered once, so a lookup in flight is shared per errand to survive effects
// that run twice (React strict mode) or a remount before it settles. Entries are removed as soon
// as the lookup settles, so the map only ever holds lookups that are still running.
const lookups = new Map<string, Promise<CallerLookup | null>>();

const lookUpCaller = async (errandNumber: string): Promise<CallerLookup | null> => {
  const caller = await requestPendingCaller(errandNumber);
  if (!caller) {
    return null;
  }
  // A caller who was not identified is only known by phone number; there is nobody to look up.
  const person = caller.personNumber ? await searchPerson(caller.personNumber).catch(() => undefined) : undefined;
  return { caller, person };
};

/** A person with protected personal data is filled in without an address. */
const withoutAddress = (person: AddressResult): AddressResult => ({
  ...person,
  street: '',
  careof: '',
  zip: '',
  city: '',
});

const getCallerLookup = (errandNumber: string): Promise<CallerLookup | null> => {
  let lookup = lookups.get(errandNumber);
  if (!lookup) {
    lookup = lookUpCaller(errandNumber);
    lookups.set(errandNumber, lookup);
    void lookup.finally(() => lookups.delete(errandNumber));
  }
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
    // Only an instance with ACE opens errands for callers, so nothing is waiting anywhere else.
    if (!getAceConfig()) {
      return;
    }
    let active = true;
    void getCallerLookup(errandNumber).then((lookup) => {
      if (!active || !lookup) {
        return;
      }
      const { personNumber, phoneNumber } = lookup.caller;
      const person = lookup.person?.protectedIdentity ? withoutAddress(lookup.person) : lookup.person;
      // Without the person, hand over what ACE knew so the case worker can search with it.
      latest.current.onCaller({ personNumber, phoneNumber, person });
      if (lookup.person?.protectedIdentity) {
        latest.current.toastMessage({
          position: 'bottom',
          closeable: true,
          message: 'Den som ringer har skyddade personuppgifter. Adressen har inte fyllts i.',
          status: 'warning',
        });
      }
      if (personNumber && !lookup.person) {
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
