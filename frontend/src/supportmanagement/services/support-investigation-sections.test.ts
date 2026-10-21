import { expect, test } from 'vitest';

import {
  missingSupportInvestigationSections,
  sectionKeyOf,
  SUPPORT_INVESTIGATION_SECTIONS,
  supportInvestigationSectionInputs,
  supportInvestigationSectionSpec,
  visibleSupportInvestigationSections,
} from './support-investigation-sections';

const sectionOf = (sectionKey: string, sortOrder: number, heading = sectionKey) =>
  ({ id: `section-${sectionKey}`, sectionKey, heading, sortOrder } as never);

const investigationOf = (...sections: unknown[]) => ({ id: 'investigation-1', sections } as never);

const keysOf = (sections: { sectionKey?: string }[]) => sections.map((section) => section.sectionKey);

test('the examinations are catalogued in the order the business examines them', () => {
  expect(keysOf([...SUPPORT_INVESTIGATION_SECTIONS])).toEqual([
    'statements',
    'persons_of_influence',
    'financial_suitability',
    'premises',
  ]);
});

test('a section is shown in order, and a retired examination is not shown at all', () => {
  const shown = visibleSupportInvestigationSections(
    investigationOf(sectionOf('premises', 4), sectionOf('knowledge_test', 9), sectionOf('statements', 1))
  );

  expect(keysOf(shown)).toEqual(['statements', 'premises']);
});

test('a row written under an earlier name is shown until the row it became is there', () => {
  const underTheOldName = investigationOf(sectionOf('personal_suitability', 2), sectionOf('premises', 4));

  expect(keysOf(visibleSupportInvestigationSections(underTheOldName))).toEqual(['personal_suitability', 'premises']);
  expect(
    keysOf(
      visibleSupportInvestigationSections(
        investigationOf(sectionOf('personal_suitability', 2), sectionOf('persons_of_influence', 2))
      )
    )
  ).toEqual(['persons_of_influence']);
});

test('a row written under an earlier name is read as the examination it became', () => {
  expect(sectionKeyOf(sectionOf('personal_suitability', 2))).toBe('persons_of_influence');
  expect(sectionKeyOf(sectionOf('premises', 4))).toBe('premises');
  expect(sectionKeyOf({ sectionKey: undefined } as never)).toBe('');
});

test('a row carries the heading the catalogue gives its examination, whatever name it was written under', () => {
  expect(supportInvestigationSectionSpec(sectionOf('personal_suitability', 2))?.headingKey).toBe(
    'common:investigation.sections.persons_of_influence'
  );
  expect(supportInvestigationSectionSpec(sectionOf('kitchen', 7))).toBeUndefined();
});

test('the examinations that are missing are the ones no row stands for, by the name they carry today', () => {
  const started = investigationOf(sectionOf('statements', 1), sectionOf('personal_suitability', 2));

  expect(keysOf(missingSupportInvestigationSections(started))).toEqual(['financial_suitability', 'premises']);
  expect(missingSupportInvestigationSections(investigationOf(...SUPPORT_INVESTIGATION_SECTIONS))).toEqual([]);
  expect(keysOf(missingSupportInvestigationSections(undefined))).toEqual([
    'statements',
    'persons_of_influence',
    'financial_suitability',
    'premises',
  ]);
});

test('the catalogue is handed to the service with its headings translated', () => {
  const translate = (key: string) => `översatt:${key}`;

  expect(supportInvestigationSectionInputs(translate, [SUPPORT_INVESTIGATION_SECTIONS[1]])).toEqual([
    {
      sectionKey: 'persons_of_influence',
      heading: 'översatt:common:investigation.sections.persons_of_influence',
      sortOrder: 2,
    },
  ]);
  expect(supportInvestigationSectionInputs(translate)).toHaveLength(SUPPORT_INVESTIGATION_SECTIONS.length);
});
