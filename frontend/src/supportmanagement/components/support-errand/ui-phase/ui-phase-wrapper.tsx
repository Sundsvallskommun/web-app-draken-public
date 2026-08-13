import { Button, useSnackbar } from '@sk-web-gui/react';
import { useConfigStore, useMetadataStore, useSupportStore } from '@stores/index';
import {
  getSupportErrandByErrandNumber,
  updateSupportErrandPhase,
} from '@supportmanagement/services/support-errand-service';
import {
  getActiveErrandPhaseId,
  getNextPhase,
  getSupportPhases,
} from '@supportmanagement/services/support-phase-service';
import { ArrowRight } from 'lucide-react';
import { Fragment, useMemo, useState } from 'react';

import { SupportUiPhaseComponent } from './ui-phase.component';

// Phase handler for drakes targeting the SupportManagement API (IAF etc.). Visually
// matches the CaseData phase handler (@casedata/components/errand/ui-phase/ui-phase-wrapper).
// Phases come from the metadata resource (MetadataResponse.phases); the active phase is the
// errand's activePhaseId, and "Nästa fas" persists the transition to the next phase.
export const SupportUiPhaseWrapper = () => {
  const supportMetadata = useMetadataStore((s) => s.supportMetadata);
  const supportErrand = useSupportStore((s) => s.supportErrand);
  const setSupportErrand = useSupportStore((s) => s.setSupportErrand);
  const municipalityId = useConfigStore((s) => s.municipalityId);
  const toastMessage = useSnackbar();
  const [isSaving, setIsSaving] = useState(false);

  const phases = useMemo(() => getSupportPhases(supportMetadata?.phases), [supportMetadata?.phases]);
  // The active phase is deduced from the errand's phase history (activePhaseId is write-only on the
  // API). Before an errand has entered any phase, default to the first (entry) phase for display.
  const activePhaseId = getActiveErrandPhaseId(supportErrand?.phases) ?? phases[0]?.id;
  const activePhase = phases.find((p) => p.id === activePhaseId);
  const nextPhase = getNextPhase(activePhase, phases);

  const advancePhase = async () => {
    if (!municipalityId || !supportErrand?.id || !supportErrand?.errandNumber || !nextPhase?.id) {
      return;
    }
    setIsSaving(true);
    try {
      await updateSupportErrandPhase(municipalityId, supportErrand.id, nextPhase.id);
      const res = await getSupportErrandByErrandNumber(supportErrand.errandNumber);
      if (res.error) {
        throw new Error(res.error);
      }
      setSupportErrand(res.errand);
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

  const arrow = <span className="border-t-2 border-r-2 h-[26px] w-[28px] rotate-45"></span>;

  return (
    <div className="flex items-center gap-16">
      <div className="flex items-center border-2 rounded-button h-[40px] w-fit">
        {phases.map((phase, index) => (
          <Fragment key={phase.id ?? index}>
            {index > 0 ? arrow : null}
            <SupportUiPhaseComponent
              number={index + 1}
              phase={phase.displayName ?? phase.name}
              active={phase.id === activePhaseId}
              last={index === phases.length - 1}
            />
          </Fragment>
        ))}
      </div>
      <Button
        color="primary"
        rightIcon={<ArrowRight />}
        loading={isSaving}
        disabled={!nextPhase || !supportErrand?.id || isSaving}
        onClick={advancePhase}
        data-cy="next-phase-button"
      >
        Nästa fas
      </Button>
    </div>
  );
};
