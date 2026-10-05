import type { Errand } from '@/data-contracts/supportmanagement/data-contracts';

import { IafVofInvestigationClassificationPolicy, resolveIafVofInvestigationClassificationOwner } from './iaf-vof-investigation-classification';

/** The workflow phase an IAF/VOF errand is decided in. Entering it is what leaves the investigation behind. */
export const IAF_VOF_DECISION_PHASE_NAME = 'DECISION';

/** The unit manager's assessment that the deviation may be a misconduct, which hands it to LEX. */
const SUSPECTED_MISCONDUCT_FIELD = 'suspectedMisconduct';

type DecisionInvestigationErrand = Pick<Errand, 'parameters' | 'labels' | 'jsonParameters'>;

const isSuspectedMisconduct = (policy: IafVofInvestigationClassificationPolicy, errand: DecisionInvestigationErrand): boolean => {
  const saved: unknown = errand.jsonParameters?.find(parameter => parameter.key === policy.defaultOwnerDocumentKey)?.value;
  return (
    typeof saved === 'object' && saved !== null && !Array.isArray(saved) && (saved as Record<string, unknown>)[SUSPECTED_MISCONDUCT_FIELD] === 'yes'
  );
};

/**
 * The investigation that has to be saved as completed before an IAF/VOF errand may be decided.
 *
 * A lex Sarah matter - a reported misconduct, or a deviation the unit manager's saved investigation
 * assesses as a suspected one - is decided on the SoL/LSS investigation, whoever reached the errand
 * first. Every other errand is decided on the unit manager's investigation. MAS/MAR's HSL
 * investigation never holds the decision back, however far it has got.
 *
 * Only the saved assessment counts, as for the handover to LEX: an answer still in a form is not one.
 */
export const resolveIafVofDecisionInvestigationDocumentKey = (
  policy: IafVofInvestigationClassificationPolicy,
  errand: DecisionInvestigationErrand,
): string =>
  resolveIafVofInvestigationClassificationOwner(policy, errand).mode === 'reported-misconduct' || isSuspectedMisconduct(policy, errand)
    ? policy.reportedMisconductOwnerDocumentKey
    : policy.defaultOwnerDocumentKey;
