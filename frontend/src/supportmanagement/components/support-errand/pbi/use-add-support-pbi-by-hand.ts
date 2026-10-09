'use client';

import { getToastOptions } from '@common/utils/toast-message-settings';
import { useSnackbar } from '@sk-web-gui/react';
import { useConfigStore, useSupportStore } from '@stores/index';
import { addSupportPbiByHand, SupportPbiByHand } from '@supportmanagement/services/support-pbi-service';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { useAnnounceSupportPbiWrite } from './use-announce-support-pbi-write';

export const useAddSupportPbiByHand = () => {
  const { t } = useTranslation();
  const toastMessage = useSnackbar();
  const errandId = useSupportStore((s) => s.supportErrand?.id);
  const municipalityId = useConfigStore((s) => s.municipalityId);
  const announce = useAnnounceSupportPbiWrite();

  return useCallback(
    async (person: SupportPbiByHand): Promise<boolean> => {
      if (!errandId || !municipalityId) return false;
      try {
        await addSupportPbiByHand(errandId, municipalityId, person);
        await announce();
        return true;
      } catch {
        toastMessage(getToastOptions({ message: t('common:company.pbi.error'), status: 'error' }));
        return false;
      }
    },
    [announce, errandId, municipalityId, t, toastMessage]
  );
};
