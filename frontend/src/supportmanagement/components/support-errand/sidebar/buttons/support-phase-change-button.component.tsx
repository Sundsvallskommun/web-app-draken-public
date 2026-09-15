import { Button, FormControl, FormLabel, Select } from '@sk-web-gui/react';
import { useSupportPhaseTransition } from '@supportmanagement/components/support-errand/ui-phase/use-support-phase-transition';
import { ArrowRight } from 'lucide-react';
import { FC } from 'react';

/**
 * The step to the next phase, once handläggning is under way - the counterpart of CaseData's phase
 * changer. A single transition out of the phase is named the way the workflow names it ("Skicka till
 * utredning"); several are chosen between first. A phase with nowhere to go shows nothing.
 */
export const SupportPhaseChangeButtonComponent: FC<{
  disabled: boolean;
  hasUnsavedChanges: boolean;
}> = ({ disabled, hasUnsavedChanges }) => {
  const {
    availableTransitions,
    selectedTransitionId,
    setSelectedTransitionId,
    entersWorkflow,
    isSaving,
    controlsDisabled,
    canAdvance,
    advancePhase,
  } = useSupportPhaseTransition(hasUnsavedChanges);

  if (!entersWorkflow && availableTransitions.length === 0) return null;

  const singleTransition = availableTransitions.length === 1 ? availableTransitions[0] : undefined;
  const label = entersWorkflow
    ? 'Starta fasflödet'
    : singleTransition?.transition.description || (singleTransition ? 'Nästa fas' : 'Byt fas');

  return (
    <div className="flex flex-col gap-8 w-full">
      {availableTransitions.length > 1 && (
        <FormControl id="phase-transition" className="w-full" disabled={disabled || controlsDisabled}>
          <FormLabel className="text-small">Välj nästa fas</FormLabel>
          <Select
            className="w-full"
            size="sm"
            value={selectedTransitionId}
            onChange={(event) => setSelectedTransitionId(event.target.value)}
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
      )}
      <Button
        className="w-full"
        type="button"
        variant="primary"
        color="vattjom"
        rightIcon={<ArrowRight size={18} />}
        loading={isSaving}
        loadingText="Byter fas"
        disabled={disabled || !canAdvance}
        onClick={() => void advancePhase()}
        data-cy="next-phase-button"
      >
        {label}
      </Button>
    </div>
  );
};
