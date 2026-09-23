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

const withMarking = (candidates: SupportPbiCandidate[], partyId: string, marked: boolean): SupportPbiCandidate[] =>
  candidates.map((candidate) => (candidate.partyId === partyId ? { ...candidate, marked } : candidate));

export const useSupportPbi = (enabled: boolean) => {
  const { t } = useTranslation();
  const toastMessage = useSnackbar();
  const supportErrand = useSupportStore((s) => s.supportErrand);
  const setSupportErrand = useSupportStore((s) => s.setSupportErrand);
  const municipalityId = useConfigStore((s) => s.municipalityId);
  const canEditErrand = useUserStore((s) => s.user.permissions?.canEditSupportManagement);
  const { formState, reset } = useFormContext<SupportErrand>();
  const [candidates, setCandidates] = useState<SupportPbiCandidate[]>([]);
  const [busyPartyId, setBusyPartyId] = useState<string>();

  const errandId = supportErrand?.id;
  const hasUnsavedStakeholders = !!formState.dirtyFields.contacts || !!formState.dirtyFields.customer;

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

  const reloadErrand = useCallback(async () => {
    if (!errandId || !municipalityId) return;
    const { errand } = await getSupportErrandById(errandId, municipalityId);
    setSupportErrand(errand);
    reset(errand, { keepDirtyValues: true });
  }, [errandId, municipalityId, reset, setSupportErrand]);

  const reloadErrandAndCandidates = useCallback(async () => {
    if (!errandId || !municipalityId) return;
    const [list] = await Promise.all([getSupportPbiCandidates(errandId, municipalityId), reloadErrand()]);
    setCandidates(list);
  }, [errandId, municipalityId, reloadErrand]);

  const change = useCallback(
    (write: PbiWrite, marked: boolean) => async (partyId: string) => {
      if (!errandId || !municipalityId) return;
      setBusyPartyId(partyId);
      try {
        await write(errandId, municipalityId, partyId);
        setCandidates((current) => withMarking(current, partyId, marked));
        await reloadErrand().catch(() => undefined);
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
    [errandId, municipalityId, reloadErrand, reloadErrandAndCandidates, t, toastMessage]
  );

  if (!enabled) return { candidates: undefined, marking: undefined, notice: undefined };

  return {
    candidates,
    marking: {
      canEdit: !!canEditErrand && !hasUnsavedStakeholders,
      busyPartyId,
      onMark: change(markSupportPbi, true),
      onUnmark: change(unmarkSupportPbi, false),
    },
    notice: canEditErrand && hasUnsavedStakeholders ? t('common:company.pbi.unsaved') : undefined,
  };
};
