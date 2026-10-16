import type { Measure, Parameter } from '@common/data-contracts/supportmanagement/data-contracts';
import type { User } from '@common/interfaces/user';
import { renderTemplatePdf, renderTemplatePdfDirect } from '@common/services/template-render-service';
import type {
  InspectionProtocolTemplate,
  ProtocolField,
  ProtocolPrefill,
  ProtocolTextField,
} from '@supportmanagement/inspection-protocols/types';
import dayjs from 'dayjs';

import type { SupportErrand } from './support-errand-service';
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

/** The saved answers; a field the investigation has no parameter for keeps its fallback value. */
export const inspectionProtocolValuesFromParameters = (
  template: InspectionProtocolTemplate,
  parameters: Parameter[] | undefined,
  fallback: InspectionProtocolValues
): InspectionProtocolValues =>
  Object.fromEntries(
    fieldsOf(template).map((field) => {
      const values = parameters?.find((parameter) => parameter.key === field.key)?.values;
      if (!values) return [field.key, fallback[field.key] ?? (field.kind === 'multi' ? [] : '')];
      return [field.key, field.kind === 'multi' ? values : values[0] ?? ''];
    })
  );

/** One parameter per answered field, named after the field so the list reads well in Support Management. */
export const toInspectionProtocolInvestigationParameters = (
  template: InspectionProtocolTemplate,
  values: InspectionProtocolValues
): Parameter[] =>
  fieldsOf(template).flatMap((field) => {
    const value = values[field.key];
    const kept = (Array.isArray(value) ? value : [value ?? '']).filter((candidate) => candidate.trim() !== '');
    return kept.length > 0 ? [{ key: field.key, displayName: field.label, values: kept }] : [];
  });

type MeasureFields = Pick<Measure, 'title' | 'result' | 'description'>;

export const inspectionProtocolMeasureRow = (measure: MeasureFields): InspectionProtocolMeasureRow => ({
  title: measure.title ?? '',
  noRemark: measure.result === SupportMeasureResult.COMPLETED ? 'X' : '',
  remark: measure.result === SupportMeasureResult.NOT_COMPLETED ? 'X' : '',
  comment: measure.description ?? '',
});

/** The template's box() macro prints a cross for the value "true"; the table marks are printed as they are. */
const box = (checked: boolean): string => (checked ? 'true' : '');

const chosen = (value: string | string[] | undefined, option: string): boolean =>
  Array.isArray(value) ? value.includes(option) : value === option;

/** The flat keys the template reads, plus `measures` for its loop. Every box is sent, checked or not. */
export const toInspectionProtocolRenderParameters = (
  template: InspectionProtocolTemplate,
  caseNumber: string | undefined,
  values: InspectionProtocolValues,
  measures: MeasureFields[]
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
  parameters.measures = measures.map(inspectionProtocolMeasureRow);
  return parameters;
};

/** Direct render while the template lives in the code, by identifier once it is uploaded to Templating. */
export const renderInspectionProtocol = (
  template: InspectionProtocolTemplate,
  parameters: Record<string, string | InspectionProtocolMeasureRow[]>
): Promise<string> =>
  template.html
    ? renderTemplatePdfDirect(template.html, parameters)
    : renderTemplatePdf(template.identifier, parameters);

export const inspectionProtocolFileName = (errandNumber: string | undefined, date: string): string =>
  `Tillsynsprotokoll ${[errandNumber, date].filter(Boolean).join(' ')}.pdf`;
