import { Phase } from '@common/data-contracts/supportmanagement/data-contracts';
import { CErrandPhase } from 'src/data-contracts/backend/data-contracts';

export const getSupportPhases = (phases: Phase[] | undefined): Phase[] =>
  [...(phases ?? [])].filter((p) => !p.deprecated).sort((a, b) => (a.phaseOrder ?? 0) - (b.phaseOrder ?? 0));

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

export const getNextPhase = (current: Phase | undefined, phases: Phase[]): Phase | undefined => {
  if (!current) {
    return phases[0];
  }
  const transition = current.transitions?.find((t) => !t.deprecated);
  return transition ? phases.find((p) => p.id === transition.targetPhaseId) : undefined;
};
