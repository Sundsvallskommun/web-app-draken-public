import type { Statement } from '@common/data-contracts/supportmanagement/data-contracts';
import dayjs from 'dayjs';

import { jsonParameterForSchema, schemaNameForErrand } from './support-errand-schema-service';
import type { SupportErrand } from './support-errand-service';
import { childText, type FormValue, isRecord } from './support-form-value-service';
import { type JsonObject, withoutBlanks } from './support-json-parameter-service';
import type { SupportMetadata } from './support-metadata-service';
import { supportStatementCounterpartyKey } from './support-statement-counterparties';

type PremisesErrand = Pick<SupportErrand, 'labels' | 'classification' | 'jsonParameters'>;

const SupportPremisesRightOfDisposal = {
  PROVEN: 'PROVEN',
  PENDING: 'PENDING',
  NOT_PROVEN: 'NOT_PROVEN',
} as const;

type SupportPremisesRightOfDisposalName =
  (typeof SupportPremisesRightOfDisposal)[keyof typeof SupportPremisesRightOfDisposal];

export const SUPPORT_PREMISES_RIGHT_OF_DISPOSALS: {
  value: SupportPremisesRightOfDisposalName;
  translationKey: string;
}[] = [
  { value: SupportPremisesRightOfDisposal.PROVEN, translationKey: 'common:premises.right_of_disposal.proven' },
  { value: SupportPremisesRightOfDisposal.PENDING, translationKey: 'common:premises.right_of_disposal.pending' },
  { value: SupportPremisesRightOfDisposal.NOT_PROVEN, translationKey: 'common:premises.right_of_disposal.not_proven' },
];

/**
 * What the handler establishes about the premises. Neither the inspection nor the right of disposal is
 * answered anywhere in the application, so both are written in the JSON parameter of the premises section.
 */
export interface SupportPremisesExamination {
  inspectedAt: string;
  rightOfDisposal: string;
  rightOfDisposalNote: string;
  servingArea: string;
  previousBusiness: string;
}

/** The premises section keeps the examination in one JSON parameter, filed under this schema. */
export const SUPPORT_PREMISES_SECTION_SCHEMA = 'aot_investigation_premises_section';

const stringOf = (value: unknown): string => (typeof value === 'string' ? value : '');

const recordOf = (value: unknown): JsonObject => (isRecord(value) ? value : {});

export const supportPremisesExamination = (json: JsonObject | undefined): SupportPremisesExamination => ({
  inspectedAt: stringOf(json?.inspectedAt),
  rightOfDisposal: stringOf(recordOf(json?.rightOfDisposal).status),
  rightOfDisposalNote: stringOf(recordOf(json?.rightOfDisposal).note),
  servingArea: stringOf(recordOf(json?.servingArea).description),
  previousBusiness: stringOf(json?.previousBusiness),
});

/** The section's JSON with the field changed; an emptied field is left out. */
export const withSupportPremisesExamination = (
  json: JsonObject | undefined,
  field: keyof SupportPremisesExamination,
  value: string
): JsonObject => {
  const examination = { ...supportPremisesExamination(json), [field]: value };
  return withoutBlanks({
    inspectedAt: examination.inspectedAt,
    rightOfDisposal: { status: examination.rightOfDisposal, note: examination.rightOfDisposalNote },
    servingArea: { description: examination.servingArea },
    previousBusiness: examination.previousBusiness,
  });
};

export interface SupportPremisesCapacity {
  indoorSeats?: string;
  outdoorSeats?: string;
  maxPersons?: string;
}

const answersOf = (errand: PremisesErrand | undefined, namespace: string | undefined): FormValue | undefined => {
  const value = jsonParameterForSchema(errand, schemaNameForErrand(errand, namespace))?.value;
  return isRecord(value) ? value : undefined;
};

export const supportPremisesCapacityOf = (answers: FormValue | undefined): SupportPremisesCapacity => {
  if (!answers) return {};

  return {
    indoorSeats: childText(answers, 'seating', 'seatsIndoor'),
    outdoorSeats: childText(answers, 'seating', 'seatsOutdoor'),
    maxPersons: childText(answers, 'maxPersonsInPremises', 'maxPersons'),
  };
};

export const supportPremisesCapacity = (
  errand: PremisesErrand | undefined,
  namespace: string | undefined
): SupportPremisesCapacity => supportPremisesCapacityOf(answersOf(errand, namespace));

export const supportPremisesVerksamhetsbeskrivning = (
  errand: PremisesErrand | undefined,
  namespace: string | undefined
): string => {
  const answers = answersOf(errand, namespace);
  if (answers) {
    const s = answers.businessDescription;
    if (typeof s !== 'string') return '';
    const html = s.replace(/<\/(p|div|li|h[1-6]|blockquote)>|<br\s*\/?>/gi, '\n');
    return (new DOMParser().parseFromString(html, 'text/html').body.textContent ?? '').trim();
  }
  return '';
};

export interface SupportPremisesFireSafety {
  counterparty: string;
  outcome: string;
  respondedAt?: string;
}

const RESCUE_SERVICE = 'RESCUE_SERVICE';

const outcomeDisplayName = (outcome: string, metadata: SupportMetadata | undefined): string =>
  (metadata?.statementOutcomes ?? []).find((candidate) => candidate.name === outcome)?.displayName ?? outcome;

const latestFirst = (statements: Statement[]): Statement[] =>
  [...statements].sort((a, b) => (b.respondedAt ?? b.created ?? '').localeCompare(a.respondedAt ?? a.created ?? ''));

/** `dayjs(undefined)` is now, so a statement without a date must not borrow today's. */
const formatResponseDate = (respondedAt: string | undefined): string | undefined =>
  respondedAt && dayjs(respondedAt).isValid() ? dayjs(respondedAt).format('YYYY-MM-DD') : undefined;

/**
 * The fire safety of the premises is what the rescue service answered; it is their referral, so it is read
 * back from the statement rather than written a second time here.
 */
export const supportPremisesFireSafety = (
  statements: Statement[],
  metadata: SupportMetadata | undefined
): SupportPremisesFireSafety | undefined => {
  const answered = latestFirst(
    statements.filter(
      (statement) => supportStatementCounterpartyKey(statement.counterpartyName) === RESCUE_SERVICE && statement.outcome
    )
  )[0];

  if (!answered?.outcome) return undefined;

  return {
    counterparty: answered.counterpartyName ?? '',
    outcome: outcomeDisplayName(answered.outcome, metadata),
    respondedAt: formatResponseDate(answered.respondedAt),
  };
};
