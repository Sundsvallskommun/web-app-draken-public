import type { Decision, DecisionOutcome } from '@common/data-contracts/supportmanagement/data-contracts';
import { apiService } from '@common/services/api-service';

export interface SupportDecisionInput {
  outcome: string;
  decidedByRole?: string;
  legalBasis?: string;
  delegationReference?: string;
  justification?: string;
  terms?: string[];
}

/**
 * The levels of authority the delegation order gives. Support Management keeps `decidedByRole` as
 * free text - `metadata/roles` holds stakeholder roles, not decision makers - so the list is the
 * business vocabulary, kept here until the service offers a register of its own.
 */
export const SUPPORT_DECISION_ROLE_KEYS = [
  'common:decision.roles.handlaggare',
  'common:decision.roles.utskottet',
  'common:decision.roles.namndsordforande',
  'common:decision.roles.namnd',
];

const WITH_CONDITIONS = '_WITH_CONDITIONS';

export const outcomeWithoutConditions = (outcome: string | undefined): string =>
  outcome?.endsWith(WITH_CONDITIONS) ? outcome.slice(0, -WITH_CONDITIONS.length) : outcome ?? '';

/** The handler picks the plain outcome; the terms decide whether it carries conditions. */
export const selectableSupportDecisionOutcomes = (outcomes: DecisionOutcome[]): DecisionOutcome[] =>
  outcomes.filter((outcome) => !outcome.name?.endsWith(WITH_CONDITIONS));

export const outcomeForTerms = (outcome: string, terms: string[], outcomes: DecisionOutcome[]): string => {
  const plain = outcomeWithoutConditions(outcome);
  if (!terms.length) return plain;

  const withConditions = `${plain}${WITH_CONDITIONS}`;
  return outcomes.some((candidate) => candidate.name === withConditions) ? withConditions : plain;
};

export const getSupportDecisions = (errandId: string, municipalityId: string): Promise<Decision[]> =>
  apiService
    .get<Decision[]>(`supportdecisions/${municipalityId}/${errandId}`)
    .then((res) => res.data ?? [])
    .catch((e) => {
      console.error('Something went wrong when fetching errand decisions');
      throw e;
    });

export const createSupportDecision = (
  errandId: string,
  municipalityId: string,
  decision: SupportDecisionInput
): Promise<Decision> =>
  apiService
    .post<Decision, SupportDecisionInput>(`supportdecisions/${municipalityId}/${errandId}`, decision)
    .then((res) => res.data)
    .catch((e) => {
      console.error('Something went wrong when recording the decision');
      throw e;
    });

export const updateSupportDecision = (
  errandId: string,
  municipalityId: string,
  decisionId: string,
  decision: SupportDecisionInput
): Promise<Decision> =>
  apiService
    .patch<Decision, SupportDecisionInput>(`supportdecisions/${municipalityId}/${errandId}/${decisionId}`, decision)
    .then((res) => res.data)
    .catch((e) => {
      console.error('Something went wrong when updating the decision');
      throw e;
    });

export const completeSupportDecision = (
  errandId: string,
  municipalityId: string,
  decisionId: string
): Promise<Decision> =>
  apiService
    .post<Decision, undefined>(`supportdecisions/${municipalityId}/${errandId}/${decisionId}/complete`, undefined)
    .then((res) => res.data)
    .catch((e) => {
      console.error('Something went wrong when concluding the decision');
      throw e;
    });

/** A decision the service has locked: it is concluded, and a correction is a new errand. */
export const isSupportDecisionLocked = (decision: Decision | undefined): boolean =>
  decision?.status === 'COMPLETED' || decision?.status === 'CANCELLED';

export const isSupportDecisionDraft = (decision: Decision | undefined): boolean => decision?.status === 'DRAFT';
