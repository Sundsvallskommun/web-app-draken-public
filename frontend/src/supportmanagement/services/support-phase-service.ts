import type { Phase, PhaseTransition } from '@common/data-contracts/supportmanagement/data-contracts';
import type { CErrandPhase } from 'src/data-contracts/backend/data-contracts';

export const getSupportPhases = (phases: readonly Phase[] | undefined): Phase[] =>
  [...(phases ?? [])].filter((p) => !p.deprecated).sort((a, b) => (a.phaseOrder ?? 0) - (b.phaseOrder ?? 0));

export interface AvailableSupportPhaseTransition {
  transition: PhaseTransition & { id: string };
  target: Phase & { id: string };
}

export const getAvailablePhaseTransitions = (
  activePhaseId: string | undefined,
  phases: readonly Phase[]
): AvailableSupportPhaseTransition[] => {
  if (!activePhaseId) return [];
  const activePhase = phases.find((phase) => phase.id === activePhaseId);
  if (!activePhase) return [];

  return (activePhase.transitions ?? []).flatMap((transition) => {
    if (transition.deprecated || !transition.id) return [];
    const target = phases.find((phase) => phase.id === transition.targetPhaseId && !phase.deprecated);
    return target?.id
      ? [{ transition: { ...transition, id: transition.id }, target: { ...target, id: target.id } }]
      : [];
  });
};

/**
 * The phase an errand is currently in.
 *
 * `activePhaseId` is write-only in Support Management: it is how a phase is *set*, and it never
 * comes back on a read. The readable side is the `phases` history, where the phase the errand has
 * entered but not left is the one it is in. Reading `activePhaseId` off a fetched errand always
 * yields undefined, which reads as "outside the workflow" for every errand there is - no phase ever
 * highlighted, and no transitions ever available.
 */
export const getActiveSupportPhaseId = (phases: readonly CErrandPhase[] | undefined): string | undefined => {
  const open = (phases ?? []).filter((phase) => phase.phaseId && !phase.ended);
  return open.length > 0 ? open[open.length - 1].phaseId : undefined;
};
