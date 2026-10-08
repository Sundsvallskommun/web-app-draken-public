'use client';

import { getToastOptions } from '@common/utils/toast-message-settings';
import { useSnackbar } from '@sk-web-gui/react';
import { useConfigStore, useSupportStore } from '@stores/index';
import { getSupportErrandById, SupportErrand } from '@supportmanagement/services/support-errand-service';
import { isSupportPbiConflict, removeSupportPbi } from '@supportmanagement/services/support-pbi-service';
import { useCallback } from 'react';
import { useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

export const useRemoveSupportPbi = () => {
  const { t } = useTranslation();
  const toastMessage = useSnackbar();
  const errandId = useSupportStore((s) => s.supportErrand?.id);
  const setSupportErrand = useSupportStore((s) => s.setSupportErrand);
  const setPbiSignal = useSupportStore((s) => s.setPbiSignal);
  const municipalityId = useConfigStore((s) => s.municipalityId);
  const { reset } = useFormContext<SupportErrand>();

  return useCallback(
    async (partyId: string): Promise<boolean> => {
      if (!errandId || !municipalityId) return false;
      try {
        await removeSupportPbi(errandId, municipalityId, partyId);
        const { errand } = await getSupportErrandById(errandId, municipalityId);
        setSupportErrand(errand);
        reset(errand, { keepDirtyValues: true });
        setPbiSignal({ errandId, at: Date.now() });
        return true;
      } catch (error) {
        toastMessage(
          getToastOptions({
            message: isSupportPbiConflict(error) ? t('common:company.pbi.conflict') : t('common:company.pbi.error'),
            status: 'error',
          })
        );
        return false;
      }
    },
    [errandId, municipalityId, reset, setPbiSignal, setSupportErrand, t, toastMessage]
  );
};
