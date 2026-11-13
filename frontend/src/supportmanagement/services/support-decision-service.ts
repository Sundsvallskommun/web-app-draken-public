import type { Decision, DecisionOutcome, Label } from '@common/data-contracts/supportmanagement/data-contracts';
import { apiService } from '@common/services/api-service';

import type { SupportJsonParameter, SupportJsonParameterWrite } from './support-json-parameter-service';

/** A decision as the BFF answers it: with the JSON parameters Support Management keeps beside it. */
export type SupportDecision = Decision & { jsonParameters?: SupportJsonParameter[] };

/** What Support Management takes as a delegation point. */
export const SUPPORT_DECISION_DELEGATION_MAX_LENGTH = 64;

export interface SupportDecisionInput {
  outcome: string;
  type: string;
  title?: string;
  decidedByRole?: string;
  legalBasis?: string;
  /** The delegation point the decision was made under. */
  delegationReference?: string;
  justification?: string;
  validFrom?: string;
  validTo?: string;
  terms?: string[];
}

const PERMIT_TYPE_ATTRIBUTE = 'permitType';

/** The permit type of an action errand, which decides sanctions rather than permits. */
export const ACTION_ERRAND_PERMIT_TYPE = 'ATGARD';

const PERMIT_TYPE_OF_PROCESS_UNTIL_THE_LABELS_CARRY_IT: Record<string, string> = {
  'alcohol-serving': 'SERVERINGSTILLSTAND',
  'alcohol-serving-change': 'SERVERINGSTILLSTAND',
  'alcohol-serving-addition': 'SERVERINGSTILLSTAND',
  'low-alcohol-beer-serving': 'FOLKOLSANMALAN',
  'low-alcohol-beer-sales': 'FOLKOLSANMALAN',
  'low-alcohol-beer-sales-and-serving': 'FOLKOLSANMALAN',
  'catering-occasion': 'CATERINGTILLFALLE',
  'tobacco-sales': 'TOBAKSFORSALJNING',
  'tobacco-sales-change': 'TOBAKSFORSALJNING',
  'tobacco-sales-closure': 'TOBAKSFORSALJNING',
  'e-cigarette-sales': 'ECIGARETTFORSALJNING',
  'internal-inspection': 'TILLSYN',
  'external-inspection': 'TILLSYN',
  'action-errand': ACTION_ERRAND_PERMIT_TYPE,
};

const PERMIT_TYPE_OF_AN_UNKNOWN_PROCESS = 'PERMIT';

export const supportDecisionPermitType = (label: Label | undefined, processKey: string | undefined): string => {
  const configured = label?.attributes?.find((attribute) => attribute.key === PERMIT_TYPE_ATTRIBUTE)?.value;
  if (configured) return configured;

  return (
    (processKey ? PERMIT_TYPE_OF_PROCESS_UNTIL_THE_LABELS_CARRY_IT[processKey] : undefined) ??
    PERMIT_TYPE_OF_AN_UNKNOWN_PROCESS
  );
};

export const supportDecisionWithoutBlanks = (decision: SupportDecisionInput): SupportDecisionInput =>
  Object.fromEntries(
    Object.entries(decision).filter(([, value]) => !(typeof value === 'string' && value.trim() === ''))
  ) as SupportDecisionInput;

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

/**
 * The outcomes the process knows, by what the errand decides. The two sets do not overlap, and the engine throws
 * an error that cannot be retried when it is handed an outcome from the wrong one, so only its own are offered.
 */
const ACTION_ERRAND_OUTCOMES = ['NO_ACTION', 'REPRIMAND', 'WARNING', 'REVOCATION'];

const APPLICATION_OUTCOMES = ['APPROVAL', 'APPROVAL_WITH_CONDITIONS', 'REJECTED', 'INADMISSIBLE', 'DISMISSED'];

export const supportDecisionOutcomeNames = (permitType: string): string[] =>
  permitType === ACTION_ERRAND_PERMIT_TYPE ? ACTION_ERRAND_OUTCOMES : APPLICATION_OUTCOMES;

/** The registered outcomes the errand may be decided with, in the order the metadata has them. */
export const supportDecisionOutcomesOf = (outcomes: DecisionOutcome[], permitType: string): DecisionOutcome[] => {
  const known = supportDecisionOutcomeNames(permitType);
  return outcomes.filter((outcome) => !!outcome.name && known.includes(outcome.name));
};

const WITH_CONDITIONS = '_WITH_CONDITIONS';

export const outcomeWithoutConditions = (outcome: string | undefined): string =>
  outcome?.endsWith(WITH_CONDITIONS) ? outcome.slice(0, -WITH_CONDITIONS.length) : outcome ?? '';

/** The handler picks the plain outcome; the terms decide whether it carries conditions. */
export const selectableSupportDecisionOutcomes = (outcomes: DecisionOutcome[]): DecisionOutcome[] =>
  outcomes.filter((outcome) => !outcome.name?.endsWith(WITH_CONDITIONS));

/** What the outcome is called, falling back to its name for one the metadata does not cover. */
export const outcomeLabel = (outcomes: DecisionOutcome[], name: string | undefined): string =>
  outcomes.find((outcome) => outcome.name === name)?.displayName || name || '';

/** The terms of a decision as text, in their order. */
export const decisionTermTexts = (decision: Decision | undefined): string[] =>
  [...(decision?.terms ?? [])].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)).map((term) => term.text ?? '');

export const outcomeForTerms = (outcome: string, terms: string[], outcomes: DecisionOutcome[]): string => {
  const plain = outcomeWithoutConditions(outcome);
  if (!terms.length) return plain;

  const withConditions = `${plain}${WITH_CONDITIONS}`;
  return outcomes.some((candidate) => candidate.name === withConditions) ? withConditions : plain;
};

/** Support Management answers 409 when a decision may no longer be changed, and locks it itself. */
export const isSupportDecisionLockedError = (error: unknown): boolean =>
  (error as { response?: { status?: number } })?.response?.status === 409;

/** Support Management answers 400 when a JSON parameter does not fit its schema. */
export const isSupportDecisionRejectedError = (error: unknown): boolean =>
  (error as { response?: { status?: number } })?.response?.status === 400;

export const getSupportDecisions = (errandId: string, municipalityId: string): Promise<SupportDecision[]> =>
  apiService
    .get<SupportDecision[]>(`supportdecisions/${municipalityId}/${errandId}`)
    .then((res) => res.data ?? [])
    .catch((e) => {
      console.error('Something went wrong when fetching errand decisions');
      throw e;
    });

export const createSupportDecision = (
  errandId: string,
  municipalityId: string,
  decision: SupportDecisionInput
): Promise<SupportDecision> =>
  apiService
    .post<SupportDecision, SupportDecisionInput>(`supportdecisions/${municipalityId}/${errandId}`, decision)
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
): Promise<SupportDecision> =>
  apiService
    .patch<SupportDecision, SupportDecisionInput>(
      `supportdecisions/${municipalityId}/${errandId}/${decisionId}`,
      decision
    )
    .then((res) => res.data)
    .catch((e) => {
      console.error('Something went wrong when updating the decision');
      throw e;
    });

export const completeSupportDecision = (
  errandId: string,
  municipalityId: string,
  decisionId: string
): Promise<SupportDecision> =>
  apiService
    .post<SupportDecision, undefined>(
      `supportdecisions/${municipalityId}/${errandId}/${decisionId}/complete`,
      undefined
    )
    .then((res) => res.data)
    .catch((e) => {
      console.error('Something went wrong when concluding the decision');
      throw e;
    });

/** A decision the service has locked: it is concluded, and a correction is a new errand. */
export const isSupportDecisionLocked = (decision: Decision | undefined): boolean =>
  decision?.status === 'COMPLETED' || decision?.status === 'CANCELLED';

export const isSupportDecisionDraft = (decision: Decision | undefined): boolean => decision?.status === 'DRAFT';

/** Creates or replaces the JSON parameter of a draft decision under the key. */
export const saveSupportDecisionJsonParameter = (
  errandId: string,
  municipalityId: string,
  decisionId: string,
  key: string,
  parameter: SupportJsonParameterWrite
): Promise<SupportDecision> =>
  apiService
    .put<SupportDecision, SupportJsonParameterWrite>(
      `supportdecisions/${municipalityId}/${errandId}/${decisionId}/json-parameters/${key}`,
      parameter
    )
    .then((res) => res.data)
    .catch((e) => {
      console.error('Something went wrong when saving what the decision says of the permit', e?.response?.data);
      throw e;
    });
