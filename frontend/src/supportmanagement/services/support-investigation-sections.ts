import type { Investigation, InvestigationSection } from '@common/data-contracts/supportmanagement/data-contracts';

export interface SupportInvestigationSectionInput {
  sectionKey: string;
  heading: string;
  sortOrder: number;
}

export type Sections = (typeof SUPPORT_INVESTIGATION_SECTIONS)[number]['sectionKey'];

type SectionSpec = (typeof SUPPORT_INVESTIGATION_SECTIONS)[number];

/**
 * The examinations an AoT investigation is made of, in the order the business examines them. Support
 * Management holds no list of its own - the sections are written when the investigation starts.
 */
export const SUPPORT_INVESTIGATION_SECTIONS = [
  { sectionKey: 'statements', headingKey: 'common:investigation.sections.statements', sortOrder: 1 },
  {
    sectionKey: 'persons_of_influence',
    headingKey: 'common:investigation.sections.persons_of_influence',
    sortOrder: 2,
  },
  {
    sectionKey: 'financial_suitability',
    headingKey: 'common:investigation.sections.financial_suitability',
    sortOrder: 3,
  },
  { sectionKey: 'premises', headingKey: 'common:investigation.sections.premises', sortOrder: 4 },
] as const satisfies readonly { sectionKey: string; headingKey: string; sortOrder: number }[];

/**
 * Sections that used to be written when an investigation started. The knowledge test is examined on the same card
 * as the personal suitability, so investigations started before the merge still carry an empty section of its own.
 */
const RETIRED_INVESTIGATION_SECTION_KEYS: string[] = ['knowledge_test'];

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

const isRetired = (section: InvestigationSection): boolean =>
  RETIRED_INVESTIGATION_SECTION_KEYS.includes(section.sectionKey ?? '');

const isSupersededByItsNewName = (section: InvestigationSection, sections: InvestigationSection[]): boolean =>
  !!SECTION_KEYS_OF_AN_EARLIER_NAME[section.sectionKey ?? ''] &&
  sections.some((candidate) => candidate.sectionKey === sectionKeyOf(section));

export const visibleSupportInvestigationSections = (
  investigation: Investigation | undefined
): InvestigationSection[] => {
  const sections = investigation?.sections ?? [];
  return sections
    .filter((section) => !isRetired(section) && !isSupersededByItsNewName(section, sections))
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
};

export const missingSupportInvestigationSections = (investigation: Investigation | undefined): SectionSpec[] => {
  const written = (investigation?.sections ?? []).map(sectionKeyOf);
  return SUPPORT_INVESTIGATION_SECTIONS.filter((section) => !written.includes(section.sectionKey));
};

export const supportInvestigationSectionInputs = (
  translate: (key: string) => string,
  sections: readonly SectionSpec[] = SUPPORT_INVESTIGATION_SECTIONS
): SupportInvestigationSectionInput[] =>
  sections.map((section) => ({
    sectionKey: section.sectionKey,
    heading: translate(section.headingKey),
    sortOrder: section.sortOrder,
  }));
