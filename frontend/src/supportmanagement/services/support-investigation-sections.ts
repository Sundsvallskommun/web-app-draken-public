import type { Investigation, InvestigationSection } from '@common/data-contracts/supportmanagement/data-contracts';

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
  { sectionKey: 'sales_point', headingKey: 'common:investigation.sections.sales_point' },
  { sectionKey: 'self_monitoring', headingKey: 'common:investigation.sections.self_monitoring' },
] as const satisfies readonly { sectionKey: string; headingKey: string }[];

export type Sections = (typeof SUPPORT_INVESTIGATION_SECTIONS)[number]['sectionKey'];

type SectionSpec = (typeof SUPPORT_INVESTIGATION_SECTIONS)[number];

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

const isExaminedIn = (examined: readonly Sections[], section: InvestigationSection): boolean =>
  (examined as readonly string[]).includes(sectionKeyOf(section));

export const visibleSupportInvestigationSections = (
  investigation: Investigation | undefined,
  examined: readonly Sections[]
): InvestigationSection[] => {
  const sections = investigation?.sections ?? [];
  const positionOf = (section: InvestigationSection) => (examined as readonly string[]).indexOf(sectionKeyOf(section));

  return sections
    .filter((section) => isExaminedIn(examined, section) && !isSupersededByItsNewName(section, sections))
    .sort((a, b) => positionOf(a) - positionOf(b));
};

export const missingSupportInvestigationSections = (
  investigation: Investigation | undefined,
  examined: readonly Sections[]
): Sections[] => {
  const written = (investigation?.sections ?? []).map(sectionKeyOf);
  return examined.filter((sectionKey) => !written.includes(sectionKey));
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
  examined: readonly Sections[],
  chosen: readonly Sections[] = examined
): SupportInvestigationSectionInput[] =>
  chosen.map((sectionKey) => ({
    sectionKey,
    heading: translate(headingKeyOf(sectionKey)),
    sortOrder: examined.indexOf(sectionKey) + 1,
  }));
