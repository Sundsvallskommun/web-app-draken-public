import type { Statement } from '@common/data-contracts/supportmanagement/data-contracts';
import dayjs from 'dayjs';
import type { CParameter } from 'src/data-contracts/backend/data-contracts';

import { jsonParameterForSchema, schemaNameForErrand } from './support-errand-schema-service';
import { getErrandParameterValue, type SupportErrand, upsertErrandParameter } from './support-errand-service';
import { childText, type FormValue, isRecord } from './support-form-value-service';
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
 * answered anywhere in the application, so both are written on the errand and saved by Spara ärende.
 */
export interface SupportPremisesExamination {
  inspectedAt: string;
  rightOfDisposal: string;
  rightOfDisposalNote: string;
  restaurantNumber: string;
  servingArea: string;
}

const EXAMINATION_PARAMETERS: Record<keyof SupportPremisesExamination, { key: string; displayName: string }> = {
  inspectedAt: { key: 'PREMISES_INSPECTED_AT', displayName: 'Lokalinspektion genomförd' },
  rightOfDisposal: { key: 'PREMISES_RIGHT_OF_DISPOSAL', displayName: 'Dispositionsrätt styrkt' },
  rightOfDisposalNote: { key: 'PREMISES_RIGHT_OF_DISPOSAL_NOTE', displayName: 'Dispositionsrätt, underlag' },
  restaurantNumber: { key: 'PREMISES_RESTAURANT_NUMBER', displayName: 'Restaurangnummer' },
  servingArea: { key: 'PREMISES_SERVING_AREA', displayName: 'Serveringsytor' },
};

export const supportPremisesExamination = (parameters: CParameter[] | undefined): SupportPremisesExamination => ({
  inspectedAt: getErrandParameterValue(parameters, EXAMINATION_PARAMETERS.inspectedAt.key),
  rightOfDisposal: getErrandParameterValue(parameters, EXAMINATION_PARAMETERS.rightOfDisposal.key),
  rightOfDisposalNote: getErrandParameterValue(parameters, EXAMINATION_PARAMETERS.rightOfDisposalNote.key),
  restaurantNumber: getErrandParameterValue(parameters, EXAMINATION_PARAMETERS.restaurantNumber.key),
  servingArea: getErrandParameterValue(parameters, EXAMINATION_PARAMETERS.servingArea.key),
});

export interface SupportPremisesPreviousPermit {
  holderName: string;
  validFrom: string;
  validTo: string;
}

export const emptySupportPremisesPreviousPermit = (): SupportPremisesPreviousPermit => ({
  holderName: '',
  validFrom: '',
  validTo: '',
});

const PREVIOUS_PERMIT_COUNT_PARAMETER = 'PREMISES_PREVIOUS_PERMITS';

const PREVIOUS_PERMIT_KEY = /^PREMISES_PREVIOUS_PERMIT_(\d+)_(HOLDER|FROM|TO)$/;

const PREVIOUS_PERMIT_FIELDS: Record<string, { field: keyof SupportPremisesPreviousPermit; displayName: string }> = {
  HOLDER: { field: 'holderName', displayName: 'Tidigare tillståndshavare' },
  FROM: { field: 'validFrom', displayName: 'Tidigare tillstånd från' },
  TO: { field: 'validTo', displayName: 'Tidigare tillstånd till' },
};

const previousPermitKey = (number: number, field: string): string => `PREMISES_PREVIOUS_PERMIT_${number}_${field}`;

export const supportPremisesPreviousPermits = (
  parameters: CParameter[] | undefined
): SupportPremisesPreviousPermit[] => {
  const written = new Map<number, SupportPremisesPreviousPermit>();
  for (const parameter of parameters ?? []) {
    const match = PREVIOUS_PERMIT_KEY.exec(parameter.key);
    if (!match) continue;
    const number = Number(match[1]);
    written.set(number, {
      ...(written.get(number) ?? emptySupportPremisesPreviousPermit()),
      [PREVIOUS_PERMIT_FIELDS[match[2]].field]: parameter.values?.[0] ?? '',
    });
  }

  const counted = Number(getErrandParameterValue(parameters, PREVIOUS_PERMIT_COUNT_PARAMETER) || 0);
  const count = Math.max(counted, ...written.keys(), 0);
  return Array.from({ length: count }, (_, index) => written.get(index + 1) ?? emptySupportPremisesPreviousPermit());
};

export const withSupportPremisesPreviousPermits = (
  parameters: CParameter[] | undefined,
  permits: SupportPremisesPreviousPermit[]
): CParameter[] => {
  const others = (parameters ?? []).filter(
    (parameter) => parameter.key !== PREVIOUS_PERMIT_COUNT_PARAMETER && !PREVIOUS_PERMIT_KEY.test(parameter.key)
  );
  if (permits.length === 0) return others;

  const written = (number: number, field: string, value: string): CParameter[] =>
    value.trim()
      ? [
          {
            key: previousPermitKey(number, field),
            displayName: `${PREVIOUS_PERMIT_FIELDS[field].displayName} ${number}`,
            values: [value],
          },
        ]
      : [];

  return [
    { key: PREVIOUS_PERMIT_COUNT_PARAMETER, displayName: 'Tidigare tillstånd', values: [String(permits.length)] },
    ...permits.flatMap((permit, index) => [
      ...written(index + 1, 'HOLDER', permit.holderName),
      ...written(index + 1, 'FROM', permit.validFrom),
      ...written(index + 1, 'TO', permit.validTo),
    ]),
    ...others,
  ];
};

export const withSupportPremisesExamination = (
  parameters: CParameter[] | undefined,
  field: keyof SupportPremisesExamination,
  value: string
): CParameter[] =>
  upsertErrandParameter(
    parameters,
    EXAMINATION_PARAMETERS[field].key,
    value,
    EXAMINATION_PARAMETERS[field].displayName
  );

export interface SupportPremisesCapacity {
  indoorSeats?: string;
  outdoorSeats?: string;
  maxPersons?: string;
}

/** Katla has renamed the outdoor count between schema versions, and an errand keeps the name it was filed under. */
const OUTDOOR_SEAT_FIELDS = ['antalSittplatserPaEventuellUteserver', 'antalSittplatserUteservering'];

const answersOf = (errand: PremisesErrand | undefined, namespace: string | undefined): FormValue | undefined => {
  const value = jsonParameterForSchema(errand, schemaNameForErrand(errand, namespace))?.value;
  return isRecord(value) ? value : undefined;
};

export const supportPremisesCapacityOf = (answers: FormValue | undefined): SupportPremisesCapacity => {
  if (!answers) return {};

  return {
    indoorSeats: childText(answers, 'sittplatserILokalen', 'antalSittplatserInomhus'),
    outdoorSeats: OUTDOOR_SEAT_FIELDS.map((field) => childText(answers, 'sittplatserILokalen', field)).find(Boolean),
    maxPersons: childText(answers, 'maximaltAntalPersonerILokalen', 'antalPersoner'),
  };
};

export const supportPremisesCapacity = (
  errand: PremisesErrand | undefined,
  namespace: string | undefined
): SupportPremisesCapacity => supportPremisesCapacityOf(answersOf(errand, namespace));

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
