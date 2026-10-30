import type { Investigation, InvestigationSection } from '@common/data-contracts/supportmanagement/data-contracts';

import type { SupportErrand } from './support-errand-service';

export interface SupportInvestigationSectionInput {
  sectionKey: string;
  heading: string;
  sortOrder: number;
}

export const SUPPORT_INVESTIGATION_SECTIONS = [
  { sectionKey: 'statements', headingKey: 'common:investigation.sections.statements' },
  { sectionKey: 'ownership', headingKey: 'common:investigation.sections.ownership' },
  { sectionKey: 'persons_of_influence', headingKey: 'common:investigation.sections.persons_of_influence' },
  { sectionKey: 'financial_suitability', headingKey: 'common:investigation.sections.financial_suitability' },
  { sectionKey: 'premises', headingKey: 'common:investigation.sections.premises' },
  { sectionKey: 'lease', headingKey: 'common:investigation.sections.lease' },
  { sectionKey: 'fire_safety', headingKey: 'common:investigation.sections.fire_safety' },
  { sectionKey: 'food_and_beverages', headingKey: 'common:investigation.sections.food_and_beverages' },
  { sectionKey: 'staffing', headingKey: 'common:investigation.sections.staffing' },
  { sectionKey: 'communication', headingKey: 'common:investigation.sections.communication' },
  { sectionKey: 'child_perspective', headingKey: 'common:investigation.sections.child_perspective' },
  { sectionKey: 'marketing', headingKey: 'common:investigation.sections.marketing' },
  { sectionKey: 'legal_basis', headingKey: 'common:investigation.sections.legal_basis' },
  { sectionKey: 'self_submitted_records', headingKey: 'common:investigation.sections.self_submitted_records' },
  { sectionKey: 'sales_point', headingKey: 'common:investigation.sections.sales_point' },
  { sectionKey: 'sales_premises', headingKey: 'common:investigation.sections.sales_premises' },
  { sectionKey: 'sales_premises_location', headingKey: 'common:investigation.sections.sales_premises_location' },
  { sectionKey: 'opening_hours', headingKey: 'common:investigation.sections.opening_hours' },
  { sectionKey: 'self_monitoring', headingKey: 'common:investigation.sections.self_monitoring' },
  { sectionKey: 'excise_duty', headingKey: 'common:investigation.sections.excise_duty' },
] as const satisfies readonly { sectionKey: string; headingKey: string }[];

export type Sections = (typeof SUPPORT_INVESTIGATION_SECTIONS)[number]['sectionKey'];

type SectionSpec = (typeof SUPPORT_INVESTIGATION_SECTIONS)[number];

export interface SupportInvestigationVariant {
  sections: readonly Sections[];
  basisTemplate?: string;
}

const SERVING_PERMIT_SECTIONS = [
  'statements',
  'ownership',
  'persons_of_influence',
  'financial_suitability',
  'premises',
  'lease',
  'fire_safety',
  'food_and_beverages',
  'staffing',
  'communication',
  'child_perspective',
  'marketing',
  'legal_basis',
] as const;

const TOBACCO_SALES_PERMIT_SECTIONS = [
  'statements',
  'ownership',
  'persons_of_influence',
  'self_submitted_records',
  'financial_suitability',
  'sales_point',
  'lease',
  'sales_premises',
  'sales_premises_location',
  'opening_hours',
  'self_monitoring',
  'marketing',
  'excise_duty',
  'communication',
  'legal_basis',
] as const;

const SERVING_PERMIT_INVESTIGATION: SupportInvestigationVariant = {
  sections: SERVING_PERMIT_SECTIONS,
  basisTemplate: 'serving-permit-decision-basis',
};

const TOBACCO_SALES_PERMIT_INVESTIGATION: SupportInvestigationVariant = {
  sections: TOBACCO_SALES_PERMIT_SECTIONS,
};

const SUPPORT_INVESTIGATION_VARIANTS: Record<string, SupportInvestigationVariant> = {
  ALCOHOL: SERVING_PERMIT_INVESTIGATION,
  TOBACCO: TOBACCO_SALES_PERMIT_INVESTIGATION,
  SALES_PERMIT_APPLICATION: TOBACCO_SALES_PERMIT_INVESTIGATION,
};

const CLASSIFICATIONS_FROM_THE_MOST_SPECIFIC = ['SUBTYPE', 'TYPE', 'CATEGORY'] as const;

type VariantErrand = Pick<SupportErrand, 'labels'>;

const resourceNamesOf = (errand: VariantErrand | undefined): string[] =>
  CLASSIFICATIONS_FROM_THE_MOST_SPECIFIC.map(
    (classification) => (errand?.labels ?? []).find((label) => label.classification === classification)?.resourceName
  ).filter((resourceName): resourceName is string => !!resourceName);

export const supportInvestigationVariant = (errand: VariantErrand | undefined): SupportInvestigationVariant =>
  resourceNamesOf(errand)
    .map((resourceName) => SUPPORT_INVESTIGATION_VARIANTS[resourceName])
    .find(Boolean) ?? SERVING_PERMIT_INVESTIGATION;

const SECTION_KEYS_OF_AN_EARLIER_NAME: Record<string, Sections> = {
  personal_suitability: 'persons_of_influence',
};

export const sectionKeyOf = (section: Pick<InvestigationSection, 'sectionKey'>): string => {
  const key = section.sectionKey ?? '';
  return SECTION_KEYS_OF_AN_EARLIER_NAME[key] ?? key;
};

export const supportInvestigationSectionSpec = (
  section: Pick<InvestigationSection, 'sectionKey'>
): SectionSpec | undefined =>
  SUPPORT_INVESTIGATION_SECTIONS.find((candidate) => candidate.sectionKey === sectionKeyOf(section));

const isSupersededByItsNewName = (section: InvestigationSection, sections: InvestigationSection[]): boolean =>
  !!SECTION_KEYS_OF_AN_EARLIER_NAME[section.sectionKey ?? ''] &&
  sections.some((candidate) => candidate.sectionKey === sectionKeyOf(section));

const isExaminedBy = (variant: SupportInvestigationVariant, section: InvestigationSection): boolean =>
  (variant.sections as readonly string[]).includes(sectionKeyOf(section));

export const visibleSupportInvestigationSections = (
  investigation: Investigation | undefined,
  variant: SupportInvestigationVariant
): InvestigationSection[] => {
  const sections = investigation?.sections ?? [];
  const positionOf = (section: InvestigationSection) =>
    (variant.sections as readonly string[]).indexOf(sectionKeyOf(section));

  return sections
    .filter((section) => isExaminedBy(variant, section) && !isSupersededByItsNewName(section, sections))
    .sort((a, b) => positionOf(a) - positionOf(b));
};

export const missingSupportInvestigationSections = (
  investigation: Investigation | undefined,
  variant: SupportInvestigationVariant
): Sections[] => {
  const written = (investigation?.sections ?? []).map(sectionKeyOf);
  return variant.sections.filter((sectionKey) => !written.includes(sectionKey));
};

export interface SupportInvestigationTextKeys {
  labelKey: string;
  placeholderKey: string;
  saveFailedKey: string;
}

export const supportInvestigationTextKeys = (sectionKey: Sections): SupportInvestigationTextKeys => ({
  labelKey: `common:investigation.section_texts.${sectionKey}.label`,
  placeholderKey: `common:investigation.section_texts.${sectionKey}.placeholder`,
  saveFailedKey: 'common:investigation.section_save_failed',
});

const headingKeyOf = (sectionKey: Sections): string =>
  SUPPORT_INVESTIGATION_SECTIONS.find((section) => section.sectionKey === sectionKey)?.headingKey ?? '';

export const supportInvestigationSectionInputs = (
  translate: (key: string) => string,
  variant: SupportInvestigationVariant,
  sections: readonly Sections[] = variant.sections
): SupportInvestigationSectionInput[] =>
  sections.map((sectionKey) => ({
    sectionKey,
    heading: translate(headingKeyOf(sectionKey)),
    sortOrder: variant.sections.indexOf(sectionKey) + 1,
  }));
