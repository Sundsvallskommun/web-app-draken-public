import type { Measure } from '@common/data-contracts/supportmanagement/data-contracts';
import type { User } from '@common/interfaces/user';
import { renderTemplatePdf } from '@common/services/template-render-service';
import { inspectionProtocolTemplate } from '@supportmanagement/inspection-protocols';
import type {
  InspectionProtocolTemplate,
  ProtocolField,
  ProtocolPrefill,
  ProtocolTextField,
} from '@supportmanagement/inspection-protocols/types';
import dayjs from 'dayjs';

import type { SupportErrand } from './support-errand-service';
import type { SupportInvestigation } from './support-investigation-service';
import { type JsonObject, jsonParameterObject } from './support-json-parameter-service';
import { SupportMeasureResult } from './support-measure-service';

/** The handler's answers by field key; a 'multi' field holds the chosen option values, '' means not chosen. */
export type InspectionProtocolValues = Record<string, string | string[]>;

/** A row of the control point table: U.A for a completed point, A for one not completed, neither otherwise. */
export interface InspectionProtocolMeasureRow {
  title: string;
  noRemark: 'X' | '';
  remark: 'X' | '';
  comment: string;
}

const isText = (field: ProtocolField): field is ProtocolTextField => field.kind !== 'choice' && field.kind !== 'multi';

/** Every field of the template in reading order, the ones under an option included. */
const fieldsOf = (template: InspectionProtocolTemplate): ProtocolField[] =>
  template.sections.flatMap((section) =>
    section.fields.flatMap((field) =>
      isText(field) ? [field] : [field, ...field.options.flatMap((option) => option.followUp ?? [])]
    )
  );

const join = (...parts: (string | undefined)[]): string => parts.filter(Boolean).join(', ');

/** What the errand already knows; the rest is typed in during the inspection. */
const prefillsOf = (
  errand: Pick<SupportErrand, 'customer'> | undefined,
  user: Pick<User, 'name'> | undefined
): Record<ProtocolPrefill, string> => {
  const holder = errand?.customer?.[0];
  return {
    today: dayjs().format('YYYY-MM-DD'),
    permitHolderName: holder?.organizationName || join(holder?.firstName, holder?.lastName).replace(', ', ' '),
    permitHolderOrgNumber: holder?.organizationNumber ?? '',
    inspector: join(user?.name, user?.name ? 'handläggare' : undefined),
  };
};

/** A fresh answer: nothing chosen, or what the errand already knows for a prefilled text field. */
const initialValueOf = (field: ProtocolField, prefills: Record<ProtocolPrefill, string>): string | string[] => {
  if (field.kind === 'multi') return [];
  if (isText(field) && field.prefill) return prefills[field.prefill];
  return '';
};

export const inspectionProtocolValuesOf = (
  template: InspectionProtocolTemplate,
  errand: Pick<SupportErrand, 'customer'> | undefined,
  user: Pick<User, 'name'> | undefined
): InspectionProtocolValues => {
  const prefills = prefillsOf(errand, user);
  return Object.fromEntries(fieldsOf(template).map((field) => [field.key, initialValueOf(field, prefills)]));
};

/** The summary chosen in the protocol, e.g. 'approved' or 'actionRequired'. */
export const inspectionProtocolSummary = (investigation: SupportInvestigation | undefined): string | undefined => {
  const template = inspectionProtocolTemplate(investigation?.type);
  const summary = template && jsonParameterObject(investigation?.jsonParameters, template.schema.name)?.summary;
  return typeof summary === 'string' ? summary : undefined;
};

const strings = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((candidate): candidate is string => typeof candidate === 'string') : [];

/** The saved answers; a field the JSON has no answer for keeps its fallback value. */
export const inspectionProtocolValuesFromJson = (
  template: InspectionProtocolTemplate,
  json: JsonObject | undefined,
  fallback: InspectionProtocolValues
): InspectionProtocolValues =>
  Object.fromEntries(
    fieldsOf(template).map((field) => {
      const value = json?.[field.key];
      if (value === undefined) return [field.key, fallback[field.key] ?? (field.kind === 'multi' ? [] : '')];
      return [field.key, field.kind === 'multi' ? strings(value) : typeof value === 'string' ? value : ''];
    })
  );

/** One property per answered field, under the field's key; a 'multi' field as a list. */
export const toInspectionProtocolJson = (
  template: InspectionProtocolTemplate,
  values: InspectionProtocolValues
): JsonObject =>
  Object.fromEntries(
    fieldsOf(template).flatMap((field) => {
      const value = values[field.key];
      const kept = (Array.isArray(value) ? value : [value ?? '']).filter((candidate) => candidate.trim() !== '');
      if (kept.length === 0) return [];
      return [[field.key, field.kind === 'multi' ? kept : kept[0]]];
    })
  );

type MeasureFields = Pick<Measure, 'title' | 'result' | 'description'>;
type ObservationFields = Pick<Measure, 'title' | 'result' | 'resultText'>;

/** The items marked on a deficient area, by the keys in its result text. */
export const observedItems = (measure: ObservationFields | undefined): string[] =>
  measure?.result === SupportMeasureResult.NOT_COMPLETED ? (measure.resultText ?? '').split('|').filter(Boolean) : [];

export const inspectionProtocolMeasureRow = (measure: MeasureFields): InspectionProtocolMeasureRow => ({
  title: measure.title ?? '',
  noRemark: measure.result === SupportMeasureResult.COMPLETED ? 'X' : '',
  remark: measure.result === SupportMeasureResult.NOT_COMPLETED ? 'X' : '',
  comment: measure.description
    ? measure.description
    : measure.result === SupportMeasureResult.NOT_APPLICABLE
    ? 'N/A'
    : '',
});

/** The template's box() macro prints a cross for the value "true"; the table marks are printed as they are. */
const box = (checked: boolean): string => (checked ? 'true' : '');

const chosen = (value: string | string[] | undefined, option: string): boolean =>
  Array.isArray(value) ? value.includes(option) : value === option;

/**
 * The flat keys the template reads, plus `measures` for its loop. Every box is sent, checked or not, and so is
 * every observation cell, marked X where the area is deficient and the item was observed. The order boxes follow
 * from whether any area is deficient.
 */
export const toInspectionProtocolRenderParameters = (
  template: InspectionProtocolTemplate,
  caseNumber: string | undefined,
  values: InspectionProtocolValues,
  measures: MeasureFields[],
  observations: ObservationFields[]
): Record<string, string | InspectionProtocolMeasureRow[]> => {
  const parameters: Record<string, string | InspectionProtocolMeasureRow[]> = { caseNumber: caseNumber ?? '' };
  for (const field of fieldsOf(template)) {
    if (isText(field)) {
      parameters[field.key] = String(values[field.key] ?? '');
    } else {
      for (const option of field.options) {
        parameters[option.parameter] = box(chosen(values[field.key], option.value));
      }
    }
  }
  if (template.observations) {
    const { areas, items, remarks } = template.observations;
    const deficient = observations.some((observation) => observation.result === SupportMeasureResult.NOT_COMPLETED);
    parameters[remarks.without] = box(!deficient);
    parameters[remarks.with] = box(deficient);
    for (const area of areas) {
      const observed = observedItems(observations.find((observation) => observation.title === area.label));
      for (const item of items) {
        parameters[`observation${item.key}${area.key}`] = observed.includes(item.key) ? 'X' : '';
      }
    }
  }
  parameters.measures = measures.map(inspectionProtocolMeasureRow);
  return parameters;
};

export const renderInspectionProtocol = (
  template: InspectionProtocolTemplate,
  parameters: Record<string, string | InspectionProtocolMeasureRow[]>
): Promise<string> => renderTemplatePdf(template.identifier, parameters);

export const inspectionProtocolFileName = (errandNumber: string | undefined, date: string): string =>
  `Tillsynsprotokoll ${[errandNumber, date].filter(Boolean).join(' ')}.pdf`;
