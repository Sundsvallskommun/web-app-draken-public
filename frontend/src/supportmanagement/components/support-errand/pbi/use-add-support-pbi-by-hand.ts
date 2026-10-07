'use client';

import { getToastOptions } from '@common/utils/toast-message-settings';
import { useSnackbar } from '@sk-web-gui/react';
import { useConfigStore, useSupportStore } from '@stores/index';
import { getSupportErrandById, SupportErrand } from '@supportmanagement/services/support-errand-service';
import { addSupportPbiByHand, SupportPbiByHand } from '@supportmanagement/services/support-pbi-service';
import { useCallback } from 'react';
import { useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

/**
 * Naming a person by hand adds a stakeholder to the errand, so the form that owns the stakeholders has to
 * be told, or the next save of Grundinformation writes the person away again. The signal that follows lets
 * every list of people of significant influence read itself afresh, whichever tab the handler was standing in.
 */
export const useAddSupportPbiByHand = () => {
  const { t } = useTranslation();
  const toastMessage = useSnackbar();
  const errandId = useSupportStore((s) => s.supportErrand?.id);
  const setSupportErrand = useSupportStore((s) => s.setSupportErrand);
  const setPbiSignal = useSupportStore((s) => s.setPbiSignal);
  const municipalityId = useConfigStore((s) => s.municipalityId);
  const { reset } = useFormContext<SupportErrand>();

  return useCallback(
    async (person: SupportPbiByHand): Promise<boolean> => {
      if (!errandId || !municipalityId) return false;
      try {
        await addSupportPbiByHand(errandId, municipalityId, person);
        const { errand } = await getSupportErrandById(errandId, municipalityId);
        setSupportErrand(errand);
        reset(errand, { keepDirtyValues: true });
        setPbiSignal({ errandId, at: Date.now() });
        return true;
      } catch {
        toastMessage(getToastOptions({ message: t('common:company.pbi.error'), status: 'error' }));
        return false;
      }
    },
    [errandId, municipalityId, reset, setPbiSignal, setSupportErrand, t, toastMessage]
  );
};
