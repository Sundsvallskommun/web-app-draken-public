import { Phase } from '@common/data-contracts/supportmanagement/data-contracts';
import { CErrandPhase } from 'src/data-contracts/backend/data-contracts';

// Presentation helpers for the SupportManagement phase handler. Phases come from the
// SupportManagement metadata resource (MetadataResponse.phases) via the metadata store.

// Returns the non-deprecated phases in presentation order (by phaseOrder).
export const getSupportPhases = (phases: Phase[] | undefined): Phase[] =>
  [...(phases ?? [])].filter((p) => !p.deprecated).sort((a, b) => (a.phaseOrder ?? 0) - (b.phaseOrder ?? 0));

// Deduces the errand's active phase (metadata Phase.id) from its phase history. `activePhaseId`
// is write-only on the API, so it never comes back on a GET — the active phase is the one the
// errand entered but hasn't left yet (has `started`, no `ended`). If every phase has ended (e.g.
// a terminal/closed errand), falls back to the most recently started phase.
export const getActiveErrandPhaseId = (errandPhases: CErrandPhase[] | undefined): string | undefined => {
  if (!errandPhases?.length) {
    return undefined;
  }
  const open = errandPhases.find((p) => !p.ended);
  if (open) {
    return open.phaseId;
  }
  return [...errandPhases].sort((a, b) => (b.started ?? '').localeCompare(a.started ?? ''))[0]?.phaseId;
};

// Resolves the phase an errand should transition into next, following the (non-deprecated)
// transition defined on the current phase. Returns undefined when the phase is terminal.
export const getNextPhase = (current: Phase | undefined, phases: Phase[]): Phase | undefined => {
  if (!current) {
    return phases[0];
  }
  const transition = current.transitions?.find((t) => !t.deprecated);
  return transition ? phases.find((p) => p.id === transition.targetPhaseId) : undefined;
};
