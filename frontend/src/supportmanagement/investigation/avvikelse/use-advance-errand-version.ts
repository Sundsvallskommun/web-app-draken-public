'use client';

import { useSupportStore } from '@stores/index';
import type { SupportErrand } from '@supportmanagement/services/support-errand-service';
import { isSoleSupportErrandVersionChange } from '@supportmanagement/services/support-errand-write-version';
import { useCallback } from 'react';
import { useFormContext } from 'react-hook-form';

/**
 * Moves the errand's known version on after one of its documents was written, which moves the
 * errand's version upstream too. Only a move by exactly one is the caller's own write: anything more
 * means somebody else wrote as well, and the errand form has to find that out on its own save.
 * Answers the version the errand is now known at.
 */
export function useAdvanceErrandVersion(errandId: string | undefined) {
  const { getValues, resetField } = useFormContext<SupportErrand>();

  return useCallback(
    (expected: number | undefined, received: number): number | undefined => {
      const current = useSupportStore.getState().supportErrand;
      if (
        current &&
        current.id === errandId &&
        current.version === expected &&
        getValues('version') === expected &&
        isSoleSupportErrandVersionChange(expected, received)
      ) {
        useSupportStore.setState({ supportErrand: { ...current, version: received } });
        resetField('version', { defaultValue: received });
        return received;
      }
      return expected;
    },
    [errandId, getValues, resetField]
  );
}
