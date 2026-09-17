import {
  INVESTIGATION_ACCESS_LEX_LABEL,
  INVESTIGATION_DEVIATION_REPORT_LABEL,
  INVESTIGATION_MISCONDUCT_REPORT_LABEL,
} from './investigation-handover-labels';

/**
 * The named steps that move an avvikelse errand between the roles that handle it.
 *
 * The client names the step; it never composes the assignee, labels and status itself. That keeps
 * one description of each handover in the backend, and means a hand-written request cannot invent a
 * combination the business process does not have - such as taking the LEX label off without giving
 * the errand back to somebody who can still see it.
 */
export type InvestigationHandoverStep = 'assign-lex' | 'return-to-manager' | 'move-location';

/** The handler role a caller-picked assignee must hold, from HEALTHCAREDEVIATION_HANDLER_ROLES. */
const LEX_MANAGER_ROLE_KEY = 'lex-ansvarig';
const LEX_INVESTIGATOR_ROLE_KEY = 'lex-utredare';

/**
 * While an errand carries the LEX access label it belongs to the LEX roles, and the Ansvarig list
 * offers those and nobody else - the managers cannot act on it until it is handed back.
 */
export const LEX_HANDLER_ROLE_KEYS: readonly string[] = Object.freeze([LEX_MANAGER_ROLE_KEY, LEX_INVESTIGATOR_ROLE_KEY]);

export interface InvestigationHandoverStepDefinition {
  readonly step: InvestigationHandoverStep;
  /** The investigation document whose write access authorizes this step. */
  readonly authorizingSchemaName: string;
  /**
   * The handler role a caller-picked assignee must hold. Only meaningful for `assigneeSource:
   * 'request'` - a location-resolved assignee is checked against AccessMapper's own roles instead,
   * where their access to the place is configured.
   */
  readonly assigneeRoleKey?: string;
  /**
   * How the assignee is decided: picked by the caller, resolved from the errand's current location,
   * or picked from the managers of a target place the caller names (`locationLabelId`). The last
   * also rewrites the errand's location labels to that place's path.
   */
  readonly assigneeSource: 'request' | 'location' | 'target-location';
  readonly addLabelResourcePaths: readonly string[];
  readonly removeLabelResourcePaths: readonly string[];
  /**
   * Target status, applied in the same write as the assignment and validated against namespace
   * metadata.
   *
   * The two steps that hand the errand to another role set `ASSIGNED`: the recipient - the
   * LEX-ansvarig on `assign-lex`, the manager on `return-to-manager` - receives an errand marked
   * Tilldelat, which is how a handover reads in the overview. Draken locks that state
   * (`isSupportErrandLocked`), so the recipient resumes the errand before working in it - and resuming
   * writes the active phase's main status, the first in its `allowedStatuses`, so the errand goes
   * back to the status its phase works in rather than to an ongoing status that phase does not allow.
   * The namespace's phases must therefore allow `ASSIGNED`; Support Management refuses the handover
   * where the active phase does not.
   *
   * `move-location` leaves the status alone: the errand stays with the same role, only at another
   * unit, and the assignee change is what signals it.
   */
  readonly status?: string;
}

const definitions: Readonly<Record<InvestigationHandoverStep, InvestigationHandoverStepDefinition>> = Object.freeze({
  // The unit manager assessed the deviation as a suspected misconduct. Two things change together,
  // in one write: the errand becomes a misconduct rather than a deviation, and the LEX label hands
  // it over - Support Management's AccessMapper stops showing it to the manager and starts showing
  // it to the LEX roles. Splitting them would leave an errand recorded as a misconduct that nobody
  // in LEX can reach, and the manager who could fix that has already been written out of it.
  'assign-lex': Object.freeze({
    step: 'assign-lex',
    authorizingSchemaName: 'utredning-enhetschef',
    assigneeRoleKey: LEX_MANAGER_ROLE_KEY,
    assigneeSource: 'request',
    status: 'ASSIGNED',
    addLabelResourcePaths: Object.freeze([INVESTIGATION_MISCONDUCT_REPORT_LABEL, INVESTIGATION_ACCESS_LEX_LABEL]),
    removeLabelResourcePaths: Object.freeze([INVESTIGATION_DEVIATION_REPORT_LABEL]),
  }),
  // LEX has decided on the suspected misconduct, so the errand goes back to the manager - from the lex
  // Sarah decision, whose write access authorizes the step. The manager is resolved from the errand's
  // location rather than picked, so the errand cannot be handed to a manager who does not own the place
  // it concerns.
  'return-to-manager': Object.freeze({
    step: 'return-to-manager',
    authorizingSchemaName: 'beslut-sol-lss',
    assigneeSource: 'location',
    status: 'ASSIGNED',
    addLabelResourcePaths: Object.freeze([]),
    removeLabelResourcePaths: Object.freeze([INVESTIGATION_ACCESS_LEX_LABEL]),
  }),
  // The errand reached the wrong unit. Katla records the place twice - as the reporter's own words
  // in the incoming JSON parameter, and as the LOCATION label chain AccessMapper matches on - and
  // only the labels move. The JSON parameter is the record of what was reported and stays exactly
  // as it arrived; the labels are what decide who reaches the errand, so they are what a wrong
  // routing has to change. The assignee is picked from the managers of the *target* place, because
  // the mover is writing the errand out of their own reach and somebody at the other end has to be
  // able to see it. The location labels are computed from the target rather than listed here.
  'move-location': Object.freeze({
    step: 'move-location',
    authorizingSchemaName: 'utredning-enhetschef',
    assigneeSource: 'target-location',
    addLabelResourcePaths: Object.freeze([]),
    removeLabelResourcePaths: Object.freeze([]),
  }),
});

export const getInvestigationHandoverStep = (step: string): InvestigationHandoverStepDefinition | undefined =>
  definitions[step as InvestigationHandoverStep];
