'use client';

import { useConfigStore, useSupportStore } from '@stores/index';
import { getSupportErrandById, SupportErrand } from '@supportmanagement/services/support-errand-service';
import { useCallback } from 'react';
import { useFormContext } from 'react-hook-form';

export const useAnnounceSupportPbiWrite = () => {
  const errandId = useSupportStore((s) => s.supportErrand?.id);
  const setSupportErrand = useSupportStore((s) => s.setSupportErrand);
  const setPbiSignal = useSupportStore((s) => s.setPbiSignal);
  const municipalityId = useConfigStore((s) => s.municipalityId);
  const { reset } = useFormContext<SupportErrand>();

  return useCallback(async (): Promise<void> => {
    if (!errandId || !municipalityId) return;
    const { errand } = await getSupportErrandById(errandId, municipalityId);
    setSupportErrand(errand);
    reset(errand, { keepDirtyValues: true });
    setPbiSignal({ errandId, at: Date.now() });
  }, [errandId, municipalityId, reset, setPbiSignal, setSupportErrand]);
};
