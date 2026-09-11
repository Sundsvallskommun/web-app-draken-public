import { appConfig } from '@config/appconfig';
import { Button, FormControl, FormLabel, Select, useConfirm, useSnackbar } from '@sk-web-gui/react';
import { useConfigStore, useMetadataStore, useSupportStore, useUserStore } from '@stores/index';
import { getSupportMeasures } from '@supportmanagement/measures/support-measure-service';
import {
  isSupportErrandLocked,
  Status,
  SupportErrand,
  updateSupportErrandPhase,
} from '@supportmanagement/services/support-errand-service';
import {
  getActiveSupportPhaseId,
  getAvailablePhaseTransitions,
  getSupportPhases,
  isDecisionPhase,
  isInitialSupportPhase,
  resolveStartProcessPhaseAdvance,
} from '@supportmanagement/services/support-phase-service';
import { ArrowRight } from 'lucide-react';
import { Fragment, useEffect, useMemo, useState } from 'react';
import { useFormContext } from 'react-hook-form';

import { SupportUiPhaseComponent } from './ui-phase.component';

export const SupportUiPhaseWrapper = ({ hasUnsavedChanges }: { hasUnsavedChanges: boolean }) => {
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
  const activeIndex = phases.findIndex((p) => p.id === activePhaseId);
  const availableTransitions = useMemo(
    () => getAvailablePhaseTransitions(activePhaseId, phases),
    [activePhaseId, phases]
  );
  const selectedTransition = availableTransitions.find(({ transition }) => transition.id === selectedTransitionId);
  const locked = !supportErrand || isSupportErrandLocked(supportErrand);
  // An errand created outside the workflow has no phase to move from. Entering the first one is the
  // only move it has, and it names no transition - so the button must not wait for one.
  const entersWorkflow = phases.length > 0 && !activePhaseId;
  // The registered errand leaves its first phase by being taken on, which "Starta handläggning" in
  // the sidebar does - so the strip does not offer the same step twice. It gives way only while that
  // button is actually there to press (the errand is still new) and the move out of the phase is the
  // one it makes. Once the errand is under way, or the first phase branches into several, the strip
  // is the only way on and stays.
  const startProcessLeavesFirstPhase =
    isInitialSupportPhase(activePhaseId, phases) &&
    supportErrand?.status === Status.NEW &&
    resolveStartProcessPhaseAdvance(activePhaseId, phases) !== null;

  useEffect(() => {
    setSelectedTransitionId(availableTransitions.length === 1 ? availableTransitions[0].transition.id : '');
  }, [availableTransitions]);

  // Three names fit; the window follows the active phase. An errand that has not entered the
  // workflow has no active phase, and showing no names at all left the strip unreadable - it falls
  // back to the first three, which is where such an errand is about to start.
  const labelWindowStart = Math.min(Math.max(activeIndex - 1, 0), Math.max(phases.length - 3, 0));

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

  const arrow = (
    <span className="grow shrink flex items-center justify-center min-w-[28px]">
      <span className="border-t-2 border-r-2 h-[26px] w-[28px] rotate-45 shrink-0"></span>
    </span>
  );

  const disabled =
    (!entersWorkflow && !selectedTransition) ||
    !supportErrand?.id ||
    typeof supportErrand.version !== 'number' ||
    !canEditSupportManagement ||
    locked ||
    hasUnsavedChanges ||
    isSaving;

  return (
    <div className="flex items-center gap-16 w-full min-w-0">
      <div className="flex items-center border-2 rounded-button h-[40px] min-w-0 grow" data-cy="phase-strip">
        {phases.map((phase, index) => (
          <Fragment key={phase.id ?? index}>
            {index > 0 ? arrow : null}
            <SupportUiPhaseComponent
              number={index + 1}
              phase={phase.displayName ?? phase.name}
              active={phase.id === activePhaseId}
              showLabel={index >= labelWindowStart && index < labelWindowStart + 3}
              last={index === phases.length - 1}
            />
          </Fragment>
        ))}
      </div>
      <div className="flex shrink-0 items-end gap-8">
        {availableTransitions.length > 1 && !startProcessLeavesFirstPhase ? (
          <FormControl>
            <FormLabel>Välj nästa fas</FormLabel>
            <Select
              value={selectedTransitionId}
              onChange={(event) => setSelectedTransitionId(event.target.value)}
              disabled={!canEditSupportManagement || locked || hasUnsavedChanges || isSaving}
              data-cy="phase-transition-select"
            >
              <Select.Option value="">Välj övergång</Select.Option>
              {availableTransitions.map(({ transition, target }) => (
                <Select.Option key={transition.id} value={transition.id}>
                  {transition.description || target.displayName || target.name}
                </Select.Option>
              ))}
            </Select>
          </FormControl>
        ) : null}
        {!startProcessLeavesFirstPhase && (
          <Button
            className="shrink-0"
            color="primary"
            rightIcon={<ArrowRight />}
            loading={isSaving}
            disabled={disabled}
            onClick={advancePhase}
            data-cy="next-phase-button"
          >
            {entersWorkflow ? 'Starta fasflödet' : availableTransitions.length > 1 ? 'Byt fas' : 'Nästa fas'}
          </Button>
        )}
      </div>
    </div>
  );
};
