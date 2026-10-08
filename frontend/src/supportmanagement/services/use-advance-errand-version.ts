'use client';

import { useSupportStore } from '@stores/index';
import type { SupportErrand } from '@supportmanagement/services/support-errand-service';
import { resolveOwnErrandWriteAdvance } from '@supportmanagement/services/support-errand-write-version';
import { useCallback } from 'react';
import { useFormContext } from 'react-hook-form';

/**
 * Moves the errand's known version on after one of the caller's own child writes, by the rule in
 * `resolveOwnErrandWriteAdvance`. Answers the version the errand is now known at.
 */
export function useAdvanceErrandVersion(errandId: string | undefined) {
  const { getValues, resetField } = useFormContext<SupportErrand>();

  return useCallback(
    (expected: number | undefined, received: number, ownWrites = 1): number | undefined => {
      const current = useSupportStore.getState().supportErrand;
      if (!current || current.id !== errandId) return expected;
      const advance = resolveOwnErrandWriteAdvance(
        { errandVersion: current.version, formVersion: getValues('version') },
        expected,
        received,
        ownWrites
      );
      if (advance.advancesErrand)
        useSupportStore.setState({ supportErrand: { ...current, version: advance.errandVersion } });
      if (advance.advancesForm) resetField('version', { defaultValue: advance.errandVersion });
      return advance.errandVersion;
    },
    [errandId, getValues, resetField]
  );
}
