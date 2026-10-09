'use client';

import { getToastOptions } from '@common/utils/toast-message-settings';
import { useSnackbar } from '@sk-web-gui/react';
import { useConfigStore, useSupportStore } from '@stores/index';
import { isSupportPbiConflict, removeSupportPbi } from '@supportmanagement/services/support-pbi-service';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { useAnnounceSupportPbiWrite } from './use-announce-support-pbi-write';

export const useRemoveSupportPbi = () => {
  const { t } = useTranslation();
  const toastMessage = useSnackbar();
  const errandId = useSupportStore((s) => s.supportErrand?.id);
  const municipalityId = useConfigStore((s) => s.municipalityId);
  const announce = useAnnounceSupportPbiWrite();

  return useCallback(
    async (partyId: string): Promise<boolean> => {
      if (!errandId || !municipalityId) return false;
      try {
        await removeSupportPbi(errandId, municipalityId, partyId);
        await announce();
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
    [announce, errandId, municipalityId, t, toastMessage]
  );
};
