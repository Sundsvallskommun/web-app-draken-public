import type { SupportAttachment } from './support-attachment-service';
import { jsonParameterForSchema, schemaNameForErrand } from './support-errand-schema-service';
import type { SupportErrand } from './support-errand-service';
import { childText, type FormValue, isRecord, premisesValue, text } from './support-form-value-service';

type TobaccoErrand = Pick<SupportErrand, 'labels' | 'classification' | 'jsonParameters'>;

const answersOf = (errand: TobaccoErrand | undefined, namespace: string | undefined): FormValue | undefined => {
  const value = jsonParameterForSchema(errand, schemaNameForErrand(errand, namespace))?.value;
  return isRecord(value) ? value : undefined;
};

const answeredYesNo = (value: unknown): boolean | undefined => {
  const answer = text(value);
  if (answer === 'YES') return true;
  if (answer === 'NO') return false;
  return undefined;
};

export interface SupportTobaccoSalesPoint {
  name?: string;
  distanceSelling?: boolean;
  website?: string;
  dangerousProducts?: boolean;
  supplierAgreement?: boolean;
}

const supportTobaccoSalesPointOf = (answers: FormValue | undefined): SupportTobaccoSalesPoint => {
  if (!answers) return {};

  return {
    name: text(premisesValue(answers, 'Name')),
    distanceSelling: answeredYesNo(answers.includesDistanceSelling),
    website: text(answers.distanceSellingWebsite),
    dangerousProducts: answeredYesNo(answers.includesParticularlyDangerousProducts),
    supplierAgreement: answeredYesNo(answers.hasSupplierAgreement),
  };
};

export const supportTobaccoSalesPoint = (
  errand: TobaccoErrand | undefined,
  namespace: string | undefined
): SupportTobaccoSalesPoint => supportTobaccoSalesPointOf(answersOf(errand, namespace));

export interface SupportTobaccoSalesPeriod {
  indefinite?: boolean;
  startDate?: string;
  period?: string;
}

const periodBetween = (from: string | undefined, to: string | undefined): string | undefined =>
  from || to ? [from, to].filter(Boolean).join(' - ') : undefined;

const supportTobaccoSalesPeriodOf = (answers: FormValue | undefined): SupportTobaccoSalesPeriod => {
  if (!answers) return {};

  const chosen = text(answers.salesPeriod);
  return {
    indefinite: chosen ? chosen === 'INDEFINITE' : undefined,
    startDate: text(answers.salesStartDate),
    period: periodBetween(
      childText(answers, 'salesPeriodDates', 'fromDate'),
      childText(answers, 'salesPeriodDates', 'toDate')
    ),
  };
};

export const supportTobaccoSalesPeriod = (
  errand: TobaccoErrand | undefined,
  namespace: string | undefined
): SupportTobaccoSalesPeriod => supportTobaccoSalesPeriodOf(answersOf(errand, namespace));

export const TOBACCO_RECORD_PURPOSES = [
  'CERTIFICATE_OF_REGISTRATION',
  'OWNERSHIP_INFORMATION',
  'TAX_AGENCY_EXTRACT',
] as const;

export const TOBACCO_SELF_MONITORING_PURPOSES = ['SELF_MONITORING_PROGRAM'] as const;

export interface SupportFiledDocument {
  id: string;
  fileName: string;
  purpose: string;
}

export const supportFiledDocuments = (
  attachments: SupportAttachment[] | undefined,
  purposes: readonly string[]
): SupportFiledDocument[] =>
  (attachments ?? [])
    .filter((attachment) => purposes.includes(attachment.purpose?.name ?? ''))
    .map((attachment) => ({
      id: attachment.id,
      fileName: attachment.fileName,
      purpose: attachment.purpose?.displayName || attachment.purpose?.name || '',
    }));
