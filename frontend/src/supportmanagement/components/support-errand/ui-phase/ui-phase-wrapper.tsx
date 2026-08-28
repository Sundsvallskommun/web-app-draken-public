import { Button, FormControl, FormLabel, Select, useSnackbar } from '@sk-web-gui/react';
import { useConfigStore, useMetadataStore, useSupportStore, useUserStore } from '@stores/index';
import {
  isSupportErrandLocked,
  SupportErrand,
  updateSupportErrandPhase,
} from '@supportmanagement/services/support-errand-service';
import { getAvailablePhaseTransitions, getSupportPhases } from '@supportmanagement/services/support-phase-service';
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
  const [isSaving, setIsSaving] = useState(false);
  const [selectedTransitionId, setSelectedTransitionId] = useState('');

  const phases = useMemo(() => getSupportPhases(supportMetadata?.phases), [supportMetadata?.phases]);
  const activePhaseId = supportErrand?.activePhaseId;
  const activeIndex = phases.findIndex((p) => p.id === activePhaseId);
  const availableTransitions = useMemo(
    () => getAvailablePhaseTransitions(activePhaseId, phases),
    [activePhaseId, phases]
  );
  const selectedTransition = availableTransitions.find(({ transition }) => transition.id === selectedTransitionId);
  const locked = !supportErrand || isSupportErrandLocked(supportErrand);

  useEffect(() => {
    setSelectedTransitionId(availableTransitions.length === 1 ? availableTransitions[0].transition.id : '');
  }, [availableTransitions]);

  const labelWindowStart = Math.min(Math.max(activeIndex - 1, 0), Math.max(phases.length - 3, 0));

  const advancePhase = async () => {
    if (
      !municipalityId ||
      !supportErrand?.id ||
      typeof supportErrand.version !== 'number' ||
      !selectedTransition?.transition.id
    ) {
      return;
    }
    setIsSaving(true);
    try {
      const savedErrand = await updateSupportErrandPhase(
        municipalityId,
        supportErrand.id,
        selectedTransition.transition.id,
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
    !selectedTransition ||
    !supportErrand?.id ||
    typeof supportErrand.version !== 'number' ||
    !canEditSupportManagement ||
    locked ||
    hasUnsavedChanges ||
    isSaving;

  return (
    <div className="flex items-center gap-16 w-full min-w-0">
      <div className="flex items-center border-2 rounded-button h-[40px] min-w-0 grow">
        {phases.map((phase, index) => (
          <Fragment key={phase.id ?? index}>
            {index > 0 ? arrow : null}
            <SupportUiPhaseComponent
              number={index + 1}
              phase={phase.displayName ?? phase.name}
              active={phase.id === activePhaseId}
              showLabel={activeIndex >= 0 && index >= labelWindowStart && index < labelWindowStart + 3}
              last={index === phases.length - 1}
            />
          </Fragment>
        ))}
      </div>
      <div className="flex shrink-0 items-end gap-8">
        {availableTransitions.length > 1 ? (
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
        <Button
          className="shrink-0"
          color="primary"
          rightIcon={<ArrowRight />}
          loading={isSaving}
          disabled={disabled}
          onClick={advancePhase}
          data-cy="next-phase-button"
        >
          {availableTransitions.length > 1 ? 'Byt fas' : 'Nästa fas'}
        </Button>
      </div>
    </div>
  );
};
