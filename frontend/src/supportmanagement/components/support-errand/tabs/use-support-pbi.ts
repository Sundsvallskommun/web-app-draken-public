import { useSnackbar } from '@sk-web-gui/react';
import { useConfigStore, useSupportStore, useUserStore } from '@stores/index';
import { getSupportErrandById, SupportErrand } from '@supportmanagement/services/support-errand-service';
import {
  getSupportPbi,
  isSupportPbiConflict,
  markSupportPbi,
  removeSupportPbi,
  SupportPbiByHand,
  SupportPbiCandidate,
  SupportPbiPerson,
} from '@supportmanagement/services/support-pbi-service';
import { useCallback, useEffect, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { useAddSupportPbiByHand } from '../pbi/use-add-support-pbi-by-hand';

type PbiWrite = (errandId: string, municipalityId: string, partyId: string) => Promise<void>;

const withMarking = (candidates: SupportPbiCandidate[], partyId: string, marked: boolean): SupportPbiCandidate[] =>
  candidates.map((candidate) => (candidate.partyId === partyId ? { ...candidate, marked } : candidate));

export const useSupportPbi = (enabled: boolean) => {
  const { t } = useTranslation();
  const toastMessage = useSnackbar();
  const supportErrand = useSupportStore((s) => s.supportErrand);
  const setSupportErrand = useSupportStore((s) => s.setSupportErrand);
  const setPbiSignal = useSupportStore((s) => s.setPbiSignal);
  const municipalityId = useConfigStore((s) => s.municipalityId);
  const canEditErrand = useUserStore((s) => s.user.permissions?.canEditSupportManagement);
  const { formState, reset } = useFormContext<SupportErrand>();
  const add = useAddSupportPbiByHand();
  const [candidates, setCandidates] = useState<SupportPbiCandidate[]>([]);
  const [people, setPeople] = useState<SupportPbiPerson[]>([]);
  const [busyPartyId, setBusyPartyId] = useState<string>();

  const errandId = supportErrand?.id;
  const hasUnsavedStakeholders = !!formState.dirtyFields.contacts || !!formState.dirtyFields.customer;
  const pbiSignal = useSupportStore((s) => s.pbiSignal);
  const pbiSignalAt = pbiSignal?.errandId === errandId ? pbiSignal?.at : undefined;

  /**
   * The marking is changed in the investigation as well. Reading follows the signal and never raises it,
   * so a write here and a write there both land in one reading and neither can chase the other.
   */
  useEffect(() => {
    if (!enabled || !errandId || !municipalityId) return undefined;
    let active = true;
    getSupportPbi(errandId, municipalityId)
      .then((read) => {
        if (!active) return;
        setCandidates(read.candidates);
        setPeople(read.people);
      })
      .catch(() => {
        if (!active) return;
        setCandidates([]);
        setPeople([]);
      });
    return () => {
      active = false;
    };
  }, [enabled, errandId, municipalityId, pbiSignalAt]);

  const reloadErrand = useCallback(async () => {
    if (!errandId || !municipalityId) return;
    const { errand } = await getSupportErrandById(errandId, municipalityId);
    setSupportErrand(errand);
    reset(errand, { keepDirtyValues: true });
  }, [errandId, municipalityId, reset, setSupportErrand]);

  const announceAndReloadErrand = useCallback(async () => {
    if (!errandId || !municipalityId) return;
    await reloadErrand().catch(() => undefined);
    setPbiSignal({ errandId, at: Date.now() });
  }, [errandId, municipalityId, reloadErrand, setPbiSignal]);

  const complain = useCallback(
    (error: unknown) =>
      toastMessage({
        position: 'bottom',
        closeable: false,
        message: isSupportPbiConflict(error) ? t('common:company.pbi.conflict') : t('common:company.pbi.error'),
        status: 'error',
      }),
    [t, toastMessage]
  );

  const change = useCallback(
    (write: PbiWrite, marked: boolean) => async (partyId: string) => {
      if (!errandId || !municipalityId) return;
      setBusyPartyId(partyId);
      try {
        await write(errandId, municipalityId, partyId);
        setCandidates((current) => withMarking(current, partyId, marked));
        await announceAndReloadErrand();
      } catch (error) {
        complain(error);
        if (isSupportPbiConflict(error)) await announceAndReloadErrand();
      } finally {
        setBusyPartyId(undefined);
      }
    },
    [announceAndReloadErrand, complain, errandId, municipalityId]
  );

  const addByHand = useCallback(
    async (person: SupportPbiByHand): Promise<boolean> => {
      setBusyPartyId(person.partyId);
      try {
        return await add(person);
      } finally {
        setBusyPartyId(undefined);
      }
    },
    [add]
  );

  if (!enabled) return { candidates: undefined, people: [], marking: undefined, notice: undefined, addByHand };

  return {
    candidates,
    people,
    marking: {
      canEdit: !!canEditErrand && !hasUnsavedStakeholders,
      busyPartyId,
      onMark: change(markSupportPbi, true),
      onUnmark: change(removeSupportPbi, false),
    },
    notice: canEditErrand && hasUnsavedStakeholders ? t('common:company.pbi.unsaved') : undefined,
    addByHand,
  };
};
