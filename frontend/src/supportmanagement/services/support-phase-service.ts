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
 * The workflow phase whose entry Draken guards: moving an errand into it while no measure has been
 * registered is asked about first. Phase names are the technical keys of Support Management's phase
 * metadata (`INVESTIGATION`, `DECISION`, ...), so this is an exact match on `name`; the display name
 * is free text and is never matched. A namespace whose workflow has no phase of this name simply
 * never triggers the guard.
 */
export const DECISION_PHASE_NAME = 'DECISION';

export const isDecisionPhase = (phase: Pick<Phase, 'name'> | undefined): boolean => phase?.name === DECISION_PHASE_NAME;

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

/**
 * The workflow's first phase - where an errand is registered, and the one it leaves by starting
 * handläggning. `getSupportPhases` has already ordered them, so it is the first of the list.
 */
export const isInitialSupportPhase = (activePhaseId: string | undefined, phases: readonly Phase[]): boolean =>
  Boolean(activePhaseId) && phases[0]?.id === activePhaseId;

export type SupportPhaseAdvance = { kind: 'enter' } | { kind: 'transition'; transitionId: string };

/**
 * The move starting handläggning makes through the workflow, or null when it makes none.
 *
 * Starting handläggning is the handler taking the errand on, which is the same event as leaving the
 * phase it was registered in - so the button performs both rather than leaving the phase behind.
 * Nothing is moved where the move would be a guess: a deployment running no workflow has no phase to
 * enter, and a phase branching into several has no single next one. A branch is chosen in the phase
 * strip, which names the transitions.
 */
export const resolveStartProcessPhaseAdvance = (
  activePhaseId: string | undefined,
  phases: readonly Phase[]
): SupportPhaseAdvance | null => {
  if (phases.length === 0) return null;
  if (!activePhaseId) return { kind: 'enter' };

  const available = getAvailablePhaseTransitions(activePhaseId, phases);
  return available.length === 1 ? { kind: 'transition', transitionId: available[0].transition.id } : null;
};

/**
 * Whether a phase lets the errand have this status.
 *
 * `allowedStatuses` makes phase and status one state rather than two, and Support Management refuses
 * a status the active phase does not list. A phase that lists none constrains nothing, which is also
 * what a deployment running no workflow looks like from here.
 */
export const isStatusAllowedInPhase = (
  status: string,
  activePhaseId: string | undefined,
  phases: readonly Phase[]
): boolean => {
  const allowed = phases.find((phase) => phase.id === activePhaseId)?.allowedStatuses ?? [];
  return allowed.length === 0 || allowed.includes(status);
};
