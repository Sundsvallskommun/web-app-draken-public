import type { Errand } from '@/data-contracts/supportmanagement/data-contracts';

import { IafVofInvestigationClassificationPolicy, resolveIafVofInvestigationClassificationOwner } from './iaf-vof-investigation-classification';

/** The workflow phase an IAF/VOF errand is decided in. Entering it is what leaves the investigation behind. */
export const IAF_VOF_DECISION_PHASE_NAME = 'DECISION';

/** The unit manager's assessment that the deviation may be a misconduct, which hands it to LEX. */
const SUSPECTED_MISCONDUCT_FIELD = 'suspectedMisconduct';
/** LEX-ansvarig's answer in the initial assessment on whether the errand is lex-investigated at all. */
const LEX_INVESTIGATION_DECISION_FIELD = 'lexInvestigationDecision';
const LEX_DECLINED = 'not_investigate';

type DecisionInvestigationErrand = Pick<Errand, 'parameters' | 'labels' | 'jsonParameters'>;

const readSavedAnswer = (errand: DecisionInvestigationErrand, documentKey: string | undefined, field: string): unknown => {
  if (!documentKey) return undefined;
  const saved: unknown = errand.jsonParameters?.find(parameter => parameter.key === documentKey)?.value;
  return typeof saved === 'object' && saved !== null && !Array.isArray(saved) ? (saved as Record<string, unknown>)[field] : undefined;
};

const isSuspectedMisconduct = (policy: IafVofInvestigationClassificationPolicy, errand: DecisionInvestigationErrand): boolean =>
  readSavedAnswer(errand, policy.defaultOwnerDocumentKey, SUSPECTED_MISCONDUCT_FIELD) === 'yes';

/** Whether LEX-ansvarig's saved initial assessment declines to lex-investigate the errand. */
const hasLexDeclinedInvestigation = (policy: IafVofInvestigationClassificationPolicy, errand: DecisionInvestigationErrand): boolean =>
  readSavedAnswer(errand, policy.lexAssessmentDocumentKey, LEX_INVESTIGATION_DECISION_FIELD) === LEX_DECLINED;

/**
 * The investigation that has to be saved as completed before an IAF/VOF errand may be decided.
 *
 * A lex Sarah matter - a reported misconduct, or a deviation the unit manager's saved investigation
 * assesses as a suspected one - is decided on the SoL/LSS investigation, whoever reached the errand
 * first. A suspicion LEX-ansvarig declined in the initial assessment is no longer one: the errand went back
 * as a deviation. Every other errand is decided on the unit manager's investigation. MAS/MAR's HSL
 * investigation never holds the decision back, however far it has got.
 *
 * Only the saved assessment counts, as for the handover to LEX: an answer still in a form is not one.
 */
export const resolveIafVofDecisionInvestigationDocumentKey = (
  policy: IafVofInvestigationClassificationPolicy,
  errand: DecisionInvestigationErrand,
): string =>
  resolveIafVofInvestigationClassificationOwner(policy, errand).mode === 'reported-misconduct' ||
  (isSuspectedMisconduct(policy, errand) && !hasLexDeclinedInvestigation(policy, errand))
    ? policy.reportedMisconductOwnerDocumentKey
    : policy.defaultOwnerDocumentKey;
