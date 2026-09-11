import type { Phase } from '@common/data-contracts/supportmanagement/data-contracts';
import { getActiveSupportPhaseId, getSupportPhases } from '@supportmanagement/services/support-phase-service';
import type { CErrandPhase } from 'src/data-contracts/backend/data-contracts';

/**
 * Where the errand stands in the workflow: the phases the deployment runs, and the ones this errand
 * has entered. Both sides are needed - the first says what the phases are and in which order, the
 * second which of them the errand is in.
 */
export interface InvestigationPhaseContext {
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
export const hasReachedInvestigationPhase = (
  requiredPhaseName: string | undefined,
  { metadataPhases, errandPhases }: InvestigationPhaseContext
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
