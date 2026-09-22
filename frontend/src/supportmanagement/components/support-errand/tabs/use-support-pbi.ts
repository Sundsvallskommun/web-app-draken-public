import { useSnackbar } from '@sk-web-gui/react';
import { useConfigStore, useSupportStore, useUserStore } from '@stores/index';
import { getSupportErrandById, SupportErrand } from '@supportmanagement/services/support-errand-service';
import {
  getSupportPbiCandidates,
  isSupportPbiConflict,
  markSupportPbi,
  SupportPbiCandidate,
  unmarkSupportPbi,
} from '@supportmanagement/services/support-pbi-service';
import { useCallback, useEffect, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

type PbiWrite = (errandId: string, municipalityId: string, partyId: string) => Promise<void>;

export const useSupportPbi = (enabled: boolean) => {
  const { t } = useTranslation();
  const toastMessage = useSnackbar();
  const supportErrand = useSupportStore((s) => s.supportErrand);
  const setSupportErrand = useSupportStore((s) => s.setSupportErrand);
  const municipalityId = useConfigStore((s) => s.municipalityId);
  const canEditErrand = useUserStore((s) => s.user.permissions.canEditSupportManagement);
  const { formState, resetField } = useFormContext<SupportErrand>();
  const [candidates, setCandidates] = useState<SupportPbiCandidate[]>([]);
  const [busyPartyId, setBusyPartyId] = useState<string>();

  const errandId = supportErrand?.id;
  const hasUnsavedChanges = Object.keys(formState.dirtyFields).length > 0;

  useEffect(() => {
    if (!enabled || !errandId || !municipalityId) return undefined;
    let active = true;
    getSupportPbiCandidates(errandId, municipalityId)
      .then((list) => {
        if (active) setCandidates(list);
      })
      .catch(() => {
        if (active) setCandidates([]);
      });
    return () => {
      active = false;
    };
  }, [enabled, errandId, municipalityId]);

  const reloadErrandAndCandidates = useCallback(async () => {
    if (!errandId || !municipalityId) return;
    const [{ errand }, list] = await Promise.all([
      getSupportErrandById(errandId, municipalityId),
      getSupportPbiCandidates(errandId, municipalityId),
    ]);
    setSupportErrand(errand);
    resetField('contacts', { defaultValue: errand.contacts });
    resetField('stakeholders', { defaultValue: errand.stakeholders });
    setCandidates(list);
  }, [errandId, municipalityId, resetField, setSupportErrand]);

  const change = useCallback(
    (write: PbiWrite) => async (partyId: string) => {
      if (!errandId || !municipalityId) return;
      setBusyPartyId(partyId);
      try {
        await write(errandId, municipalityId, partyId);
        await reloadErrandAndCandidates();
      } catch (error) {
        toastMessage({
          position: 'bottom',
          closeable: false,
          message: isSupportPbiConflict(error) ? t('common:company.pbi.conflict') : t('common:company.pbi.error'),
          status: 'error',
        });
        if (isSupportPbiConflict(error)) await reloadErrandAndCandidates().catch(() => undefined);
      } finally {
        setBusyPartyId(undefined);
      }
    },
    [errandId, municipalityId, reloadErrandAndCandidates, t, toastMessage]
  );

  if (!enabled) return { candidates: undefined, marking: undefined, notice: undefined };

  return {
    candidates,
    marking: {
      canEdit: !!canEditErrand && !hasUnsavedChanges,
      busyPartyId,
      onMark: change(markSupportPbi),
      onUnmark: change(unmarkSupportPbi),
    },
    notice: canEditErrand && hasUnsavedChanges ? t('common:company.pbi.unsaved') : undefined,
  };
};
