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
export const INVESTIGATION_HANDOVER_STEPS = ['assign-lex', 'return-to-manager'] as const;

export type InvestigationHandoverStep = (typeof INVESTIGATION_HANDOVER_STEPS)[number];

/** The handler role a caller-picked assignee must hold, from HANDLER_GROUP_ROLES. */
export const LEX_MANAGER_ROLE_KEY = 'lex-ansvarig';
export const LEX_INVESTIGATOR_ROLE_KEY = 'lex-utredare';

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
  /** How the assignee is decided: picked by the caller, or resolved from the errand's location. */
  readonly assigneeSource: 'request' | 'location';
  readonly addLabelResourcePaths: readonly string[];
  readonly removeLabelResourcePaths: readonly string[];
  /**
   * Target status, applied in the same write as the assignment and validated against namespace
   * metadata.
   *
   * Currently unset on every step, deliberately. `ASSIGNED` is the status a handover reads as, but
   * Draken treats it as a **locked** state (`isSupportErrandLocked`), and the only route out of it
   * is the sidebar's resume action, which transitions to `ONGOING` - a status the avvikelse
   * namespaces do not have. Setting it therefore handed the recipient an errand they could not
   * edit and could not unlock. Leaving the status alone keeps the errand in whatever working state
   * it already had; the assignee change is what signals the handover.
   *
   * Before setting one here, check that the target exists in the namespace's metadata *and* that it
   * is not in `LOCKED_SUPPORT_ERRAND_STATUSES`.
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
    addLabelResourcePaths: Object.freeze([INVESTIGATION_MISCONDUCT_REPORT_LABEL, INVESTIGATION_ACCESS_LEX_LABEL]),
    removeLabelResourcePaths: Object.freeze([INVESTIGATION_DEVIATION_REPORT_LABEL]),
  }),
  // The LEX investigator is finished. The manager is resolved from the errand's location rather
  // than picked, so the errand cannot be handed to a manager who does not own the place it concerns.
  'return-to-manager': Object.freeze({
    step: 'return-to-manager',
    authorizingSchemaName: 'utredning-sol-lss',
    assigneeSource: 'location',
    addLabelResourcePaths: Object.freeze([]),
    removeLabelResourcePaths: Object.freeze([INVESTIGATION_ACCESS_LEX_LABEL]),
  }),
});

export const getInvestigationHandoverStep = (step: string): InvestigationHandoverStepDefinition | undefined =>
  definitions[step as InvestigationHandoverStep];
