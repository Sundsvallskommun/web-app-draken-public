import { expect, test } from 'vitest';

import sv from '../../../public/locales/sv/common.json';
import {
  missingSupportInvestigationSections,
  sectionKeyOf,
  type Sections,
  SUPPORT_INVESTIGATION_SECTIONS,
  supportInvestigationSectionInputs,
  supportInvestigationSectionSpec,
  supportInvestigationTextKeys,
  visibleSupportInvestigationSections,
} from './support-investigation-sections';

const CATALOGUED = [
  'statements',
  'persons_of_influence',
  'financial_suitability',
  'premises',
  'lease',
  'fire_safety',
  'food_and_beverages',
  'staffing',
  'communication',
  'child_perspective',
];

/** The examinations that carry a written text, whether or not they carry anything else. */
const WRITTEN: Sections[] = [
  'persons_of_influence',
  'lease',
  'fire_safety',
  'food_and_beverages',
  'staffing',
  'communication',
  'child_perspective',
];

const swedish = (key: string): unknown =>
  key
    .replace(/^common:/, '')
    .split('.')
    .reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], sv);

const sectionOf = (sectionKey: string, sortOrder: number, heading = sectionKey) =>
  ({ id: `section-${sectionKey}`, sectionKey, heading, sortOrder } as never);

const investigationOf = (...sections: unknown[]) => ({ id: 'investigation-1', sections } as never);

const keysOf = (sections: { sectionKey?: string }[]) => sections.map((section) => section.sectionKey);

test('the examinations are catalogued in the order the business examines them', () => {
  expect(keysOf([...SUPPORT_INVESTIGATION_SECTIONS])).toEqual(CATALOGUED);
  expect(SUPPORT_INVESTIGATION_SECTIONS.map((section) => section.sortOrder)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
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

  expect(keysOf(missingSupportInvestigationSections(started))).toEqual([
    'financial_suitability',
    'premises',
    'lease',
    'fire_safety',
    'food_and_beverages',
    'staffing',
    'communication',
    'child_perspective',
  ]);
  expect(missingSupportInvestigationSections(investigationOf(...SUPPORT_INVESTIGATION_SECTIONS))).toEqual([]);
  expect(keysOf(missingSupportInvestigationSections(undefined))).toEqual(CATALOGUED);
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

test('a written examination names its label and its placeholder after its own key', () => {
  expect(supportInvestigationTextKeys('lease')).toEqual({
    labelKey: 'common:investigation.section_texts.lease.label',
    placeholderKey: 'common:investigation.section_texts.lease.placeholder',
    saveFailedKey: 'common:investigation.section_save_failed',
  });
});

test('every examination the handler sees is named in Swedish, and every written one is asked for in Swedish', () => {
  for (const section of SUPPORT_INVESTIGATION_SECTIONS) {
    expect(swedish(section.headingKey), section.sectionKey).toBeTypeOf('string');
  }

  for (const sectionKey of WRITTEN) {
    const keys = supportInvestigationTextKeys(sectionKey);
    expect(swedish(keys.labelKey), sectionKey).toBeTypeOf('string');
    expect(swedish(keys.placeholderKey), sectionKey).toBeTypeOf('string');
    expect(swedish(keys.saveFailedKey), sectionKey).toBeTypeOf('string');
  }
});
