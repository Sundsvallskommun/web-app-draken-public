import type { Phase, PhaseTransition } from '@common/data-contracts/supportmanagement/data-contracts';

export const getSupportPhases = (phases: Phase[] | undefined): Phase[] =>
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
