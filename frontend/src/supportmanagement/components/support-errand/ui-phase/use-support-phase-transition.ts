import { appConfig } from '@config/appconfig';
import { useConfirm, useSnackbar } from '@sk-web-gui/react';
import { useConfigStore, useMetadataStore, useSupportStore, useUserStore } from '@stores/index';
import { getSupportMeasures } from '@supportmanagement/measures/support-measure-service';
import {
  isSupportErrandLocked,
  SupportErrand,
  updateSupportErrandPhase,
} from '@supportmanagement/services/support-errand-service';
import {
  getActiveSupportPhaseId,
  getAvailablePhaseTransitions,
  getSupportPhases,
  isDecisionPhase,
} from '@supportmanagement/services/support-phase-service';
import { useEffect, useMemo, useState } from 'react';
import { useFormContext } from 'react-hook-form';

/**
 * Moving a support errand through its workflow: the transitions out of the active phase, the one the
 * handler has picked, and the write that applies it.
 *
 * The move is explicit - a transition id resolved against the active phase - so a branched phase
 * is never advanced by guessing. With a single transition out it is picked up front; with several
 * the handler chooses.
 */
export const useSupportPhaseTransition = (hasUnsavedChanges: boolean) => {
  const supportMetadata = useMetadataStore((s) => s.supportMetadata);
  const supportErrand = useSupportStore((s) => s.supportErrand);
  const setSupportErrand = useSupportStore((s) => s.setSupportErrand);
  const canEditSupportManagement = useUserStore((s) => s.user.permissions.canEditSupportManagement);
  const municipalityId = useConfigStore((s) => s.municipalityId);
  const form = useFormContext<SupportErrand>();
  const toastMessage = useSnackbar();
  const confirm = useConfirm();
  const [isSaving, setIsSaving] = useState(false);
  const [selectedTransitionId, setSelectedTransitionId] = useState('');

  const phases = useMemo(() => getSupportPhases(supportMetadata?.phases), [supportMetadata?.phases]);
  const activePhaseId = getActiveSupportPhaseId(supportErrand?.phases);
  const availableTransitions = useMemo(
    () => getAvailablePhaseTransitions(activePhaseId, phases),
    [activePhaseId, phases]
  );
  const selectedTransition = availableTransitions.find(({ transition }) => transition.id === selectedTransitionId);
  const locked = !supportErrand || isSupportErrandLocked(supportErrand);
  // An errand created outside the workflow has no phase to move from. Entering the first one is the
  // only move it has, and it names no transition - so the button must not wait for one.
  const entersWorkflow = phases.length > 0 && !activePhaseId;

  useEffect(() => {
    setSelectedTransitionId(availableTransitions.length === 1 ? availableTransitions[0].transition.id : '');
  }, [availableTransitions]);

  /**
   * Entering the decision phase with no measure registered is asked about first: there is nothing
   * to decide on yet, and the phase change is a deliberate step past that. The measures are read
   * fresh at the moment of the click, since the tab may have added one since the page loaded. A
   * lookup that fails leaves the phase alone rather than guessing either way; the user retries.
   * Measures are only a thing where the feature is on, so without it no lookup is made at all.
   */
  const confirmMissingMeasures = async (errandId: string): Promise<boolean> => {
    if (!appConfig.features.useMeasures || !isDecisionPhase(selectedTransition?.target)) return true;
    let measureCount: number;
    try {
      measureCount = (await getSupportMeasures(municipalityId, errandId)).measures.length;
    } catch {
      toastMessage({
        position: 'bottom',
        closeable: false,
        message: 'Ärendets åtgärder kunde inte kontrolleras. Fasen ändrades inte.',
        status: 'error',
      });
      return false;
    }
    if (measureCount > 0) return true;
    return confirm.showConfirmation(
      'Gå till beslutsfasen?',
      'Ärendet har inga registrerade åtgärder. Vill du verkligen gå till beslutsfasen utan att ha skapat några åtgärder?',
      'Ja, byt fas',
      'Nej',
      'warning',
      'question'
    );
  };

  const advancePhase = async () => {
    if (!municipalityId || !supportErrand?.id || typeof supportErrand.version !== 'number') return;
    if (!entersWorkflow && !selectedTransition?.transition.id) return;
    setIsSaving(true);
    try {
      if (!(await confirmMissingMeasures(supportErrand.id))) return;
      const savedErrand = await updateSupportErrandPhase(
        municipalityId,
        supportErrand.id,
        entersWorkflow ? undefined : selectedTransition?.transition.id,
        supportErrand.version
      );
      setSupportErrand(savedErrand);
      form.reset(savedErrand);
    } catch {
      toastMessage({
        position: 'bottom',
        closeable: false,
        message: 'Något gick fel när fasen skulle uppdateras',
        status: 'error',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // The controls are unusable while anything would be lost or overwritten by the move; advancing
  // additionally needs a transition to apply, unless the errand is only entering the workflow.
  const controlsDisabled = !canEditSupportManagement || locked || hasUnsavedChanges || isSaving;
  const canAdvance =
    !controlsDisabled &&
    Boolean(supportErrand?.id) &&
    typeof supportErrand?.version === 'number' &&
    (entersWorkflow || Boolean(selectedTransition));

  return {
    availableTransitions,
    selectedTransitionId,
    setSelectedTransitionId,
    entersWorkflow,
    isSaving,
    controlsDisabled,
    canAdvance,
    advancePhase,
  };
};
