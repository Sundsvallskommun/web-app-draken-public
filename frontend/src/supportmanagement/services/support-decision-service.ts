import type { Decision } from '@common/data-contracts/supportmanagement/data-contracts';
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

/** A decision the service has locked: it is concluded, and a correction is a new errand. */
export const isSupportDecisionLocked = (decision: Decision | undefined): boolean =>
  decision?.status === 'COMPLETED' || decision?.status === 'CANCELLED';
