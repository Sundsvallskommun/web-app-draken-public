import type { Label } from '@common/data-contracts/supportmanagement/data-contracts';
import dayjs from 'dayjs';

import { resolveErrandPlace } from '../assignment/errand-location';
import type {
  UnitFollowUpErrand,
  UnitFollowUpLabel,
  UnitFollowUpMeasure,
  UnitFollowUpMeasureType,
} from './unit-follow-up-service';
import type { UnitFollowUpVocabulary } from './unit-follow-up-vocabulary';

/** A value shown in a column and offered in a filter: its stable key and what it is called. */
export interface FollowUpOption {
  readonly value: string;
  readonly label: string;
}

/** The label classifications the follow-up filters on, as the avvikelse label tree names them. */
const FOLLOW_UP_LABEL_CLASSIFICATIONS = Object.freeze({
  reportType: 'REPORT_TYPE',
  legalBase: 'PROVISION',
  category: 'CATEGORY',
  subcategory: 'TYPE',
});

export interface FollowUpErrandRow {
  readonly id: string;
  readonly errandNumber: string;
  readonly unit: string;
  readonly reportType?: FollowUpOption;
  readonly causeAreas: FollowUpOption[];
  readonly created?: string;
  readonly riskValueHsl?: number;
  readonly riskValueSolLss?: number;
  readonly ivoNotification?: FollowUpOption;
  readonly policeReport?: FollowUpOption;
  readonly decidedMisconduct?: FollowUpOption;
  readonly status?: FollowUpOption;
  readonly legalBases: FollowUpOption[];
  readonly categories: FollowUpOption[];
  readonly subcategories: FollowUpOption[];
  readonly measureCount: number;
}

export type FollowUpMeasureStatus = 'executed' | 'planned' | 'proposed' | 'rejected';

export const FOLLOW_UP_MEASURE_STATUSES: readonly FollowUpOption[] = Object.freeze([
  { value: 'executed', label: 'Genomförd' },
  { value: 'planned', label: 'Planerad' },
  { value: 'proposed', label: 'Förslag' },
  { value: 'rejected', label: 'Avslagen' },
]);

/** Ja or Nej - for IVO, police report and a measure's effect alike. */
export const FOLLOW_UP_YES_NO: readonly FollowUpOption[] = Object.freeze([
  { value: 'yes', label: 'Ja' },
  { value: 'no', label: 'Nej' },
]);

export interface FollowUpMeasureRow {
  readonly key: string;
  readonly errand: FollowUpErrandRow;
  readonly type: FollowUpOption;
  readonly addedBy?: string;
  readonly status: FollowUpOption;
  readonly started?: string;
  readonly completed?: string;
  readonly effect?: FollowUpOption;
  readonly description?: string;
  readonly goal?: string;
  readonly resultText?: string;
}

/** What the rows are named with: the label tree, the schemas' vocabulary, the statuses and the people. */
export interface FollowUpRowContext {
  readonly labelStructure: readonly Label[] | undefined;
  readonly vocabulary: UnitFollowUpVocabulary;
  readonly statusName: (status: string) => string | undefined;
  readonly personName: (adAccount: string) => string | undefined;
  readonly measureTypes: readonly UnitFollowUpMeasureType[];
}

const day = (value: string | undefined): string | undefined => (value ? dayjs(value).format('YYYY-MM-DD') : undefined);

const yesNo = (value: string | undefined): FollowUpOption | undefined =>
  FOLLOW_UP_YES_NO.find((option) => option.value === value);

const labelsOf = (labels: readonly UnitFollowUpLabel[], classification: string): FollowUpOption[] =>
  labels
    .filter((label) => label.classification === classification && label.id)
    .map((label) => ({ value: label.id!, label: label.displayName || label.resourcePath || label.id! }));

const coded = (code: string | undefined, titles: ReadonlyMap<string, string>): FollowUpOption | undefined =>
  code ? { value: code, label: titles.get(code) ?? code } : undefined;

/** The unit an errand belongs to: the deepest place its labels carry, named as the place structure names it. */
const unitOf = (labels: readonly UnitFollowUpLabel[], labelStructure: readonly Label[] | undefined): string =>
  resolveErrandPlace(labels as Label[], labelStructure)?.presentation.place ??
  labels.filter((label) => label.classification?.toUpperCase() === 'LOCATION').at(-1)?.displayName ??
  '';

const toFollowUpErrandRow = (errand: UnitFollowUpErrand, context: FollowUpRowContext): FollowUpErrandRow => ({
  id: errand.id,
  errandNumber: errand.errandNumber,
  unit: unitOf(errand.labels, context.labelStructure),
  reportType: labelsOf(errand.labels, FOLLOW_UP_LABEL_CLASSIFICATIONS.reportType)[0],
  causeAreas: errand.investigation.causeAreas.map((code) => coded(code, context.vocabulary.causeAreas)!),
  created: day(errand.created),
  riskValueHsl: errand.investigation.riskValueHsl,
  riskValueSolLss: errand.investigation.riskValueSolLss,
  ivoNotification: yesNo(errand.investigation.ivoNotification),
  policeReport: yesNo(errand.investigation.policeReport),
  decidedMisconduct: coded(errand.investigation.decidedMisconductDegree, context.vocabulary.misconductDegrees),
  status: errand.status
    ? { value: errand.status, label: context.statusName(errand.status) ?? errand.status }
    : undefined,
  legalBases: labelsOf(errand.labels, FOLLOW_UP_LABEL_CLASSIFICATIONS.legalBase),
  categories: labelsOf(errand.labels, FOLLOW_UP_LABEL_CLASSIFICATIONS.category),
  subcategories: labelsOf(errand.labels, FOLLOW_UP_LABEL_CLASSIFICATIONS.subcategory),
  measureCount: errand.measures.length,
});

/**
 * Where a measure stands: carried out once it has an execution date, otherwise as its decision leaves it -
 * planned when approved in full or in part, rejected, or still a proposal nobody has decided on.
 */
export const measureStatus = (measure: Pick<UnitFollowUpMeasure, 'executed' | 'accept'>): FollowUpMeasureStatus => {
  if (measure.executed) return 'executed';
  if (measure.accept === 'TRUE' || measure.accept === 'REWORK') return 'planned';
  if (measure.accept === 'FALSE') return 'rejected';
  return 'proposed';
};

/** The follow-up's answer to whether the measure had the effect sought; no answer is no effect recorded. */
const measureEffect = (result: string | null | undefined): FollowUpOption | undefined => {
  if (result === 'COMPLETED') return yesNo('yes');
  if (result === 'NOT_COMPLETED') return yesNo('no');
  return undefined;
};

const toFollowUpMeasureRows = (
  errand: UnitFollowUpErrand,
  errandRow: FollowUpErrandRow,
  context: FollowUpRowContext
): FollowUpMeasureRow[] =>
  errand.measures.map((measure, index) => {
    const typeName = measure.type ?? '';
    const status = measureStatus(measure);
    return {
      key: `${errand.id}:${measure.id ?? index}`,
      errand: errandRow,
      type: {
        value: typeName,
        label: context.measureTypes.find((type) => type.name === typeName)?.displayName || typeName || 'Typ saknas',
      },
      addedBy: measure.addedByUser ? context.personName(measure.addedByUser) ?? measure.addedByUser : undefined,
      status: FOLLOW_UP_MEASURE_STATUSES.find((option) => option.value === status)!,
      started: day(measure.plannedStart),
      completed: day(measure.executed),
      effect: measureEffect(measure.result),
      description: measure.description,
      goal: measure.goal,
      resultText: measure.resultText,
    };
  });

export interface FollowUpRows {
  readonly errands: FollowUpErrandRow[];
  readonly measures: FollowUpMeasureRow[];
}

export const toFollowUpRows = (errands: readonly UnitFollowUpErrand[], context: FollowUpRowContext): FollowUpRows => {
  const errandRows: FollowUpErrandRow[] = [];
  const measureRows: FollowUpMeasureRow[] = [];
  for (const errand of errands) {
    const errandRow = toFollowUpErrandRow(errand, context);
    errandRows.push(errandRow);
    measureRows.push(...toFollowUpMeasureRows(errand, errandRow, context));
  }
  return { errands: errandRows, measures: measureRows };
};
