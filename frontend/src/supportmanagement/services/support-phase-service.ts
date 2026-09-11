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

/**
 * Where the errand stands in the workflow: the phases the deployment runs, and the ones this errand
 * has entered. Both sides are needed - the first says what the phases are and in which order, the
 * second which of them the errand is in.
 */
export interface SupportPhaseContext {
  readonly metadataPhases: readonly Phase[] | undefined;
  readonly errandPhases: readonly CErrandPhase[] | undefined;
}

const canonicalPhaseName = (value: string | undefined): string => value?.trim().toUpperCase() ?? '';

/**
 * Phases are named by the namespace, not by Draken, and metadata carries both the technical name and
 * the name handlers read. A variant names the phase it waits for in one of those vocabularies and
 * either spelling resolves it.
 */
const isNamedPhase = (phase: Phase, canonicalName: string): boolean =>
  canonicalPhaseName(phase.name) === canonicalName || canonicalPhaseName(phase.displayName) === canonicalName;

const phaseOrder = (phase: Phase | undefined): number | undefined =>
  phase === undefined ? undefined : phase.phaseOrder ?? 0;

/**
 * Whether the errand has reached the phase a tab waits for - being in it counts, and so does having
 * moved past it.
 *
 * Two cases deliberately answer yes without comparing anything. A variant that names no phase is
 * not gated at all, and a deployment whose phase model has no such phase is not gated either: a
 * namespace that runs no workflow, or names its phases differently, keeps the tabs it has always
 * had rather than losing them to configuration it never made. What does gate is an errand that has
 * not entered the workflow: it is before every phase, so a tab that waits for one stays away.
 */
export const hasReachedSupportPhase = (
  requiredPhaseName: string | undefined,
  { metadataPhases, errandPhases }: SupportPhaseContext
): boolean => {
  const canonicalName = canonicalPhaseName(requiredPhaseName);
  if (!canonicalName) return true;

  // Deprecated phases keep their order and an errand can still sit in one, so ordering is read from
  // the whole model; only the lookup of the phase being waited for skips the retired ones.
  const phases = metadataPhases ?? [];
  const requiredOrder = phaseOrder(
    getSupportPhases(metadataPhases).find((phase) => isNamedPhase(phase, canonicalName))
  );
  if (requiredOrder === undefined) return true;

  const activePhaseId = getActiveSupportPhaseId(errandPhases);
  if (!activePhaseId) return false;

  const activeOrder = phaseOrder(phases.find((phase) => phase.id === activePhaseId));
  // A phase the model no longer describes cannot be placed against the one being waited for. The
  // errand is in the workflow, so it is let through rather than locked out by missing metadata.
  if (activeOrder === undefined) return true;

  return activeOrder >= requiredOrder;
};
