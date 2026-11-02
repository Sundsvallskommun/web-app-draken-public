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

const SERVING: Sections[] = [
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
];

const TOBACCO: Sections[] = [
  'statements',
  'ownership',
  'persons_of_influence',
  'financial_suitability',
  'sales_point',
  'lease',
  'self_monitoring',
  'communication',
  'legal_basis',
];

/** The examinations that carry a written text, whether or not they carry anything else. */
const WRITTEN: Sections[] = [
  'lease',
  'fire_safety',
  'food_and_beverages',
  'staffing',
  'communication',
  'child_perspective',
  'marketing',
  'legal_basis',
  'ownership',
  'sales_point',
  'self_monitoring',
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

test('a section is shown in order, and a retired examination is not shown at all', () => {
  const shown = visibleSupportInvestigationSections(
    investigationOf(sectionOf('premises', 4), sectionOf('knowledge_test', 9), sectionOf('statements', 1)),
    SERVING
  );

  expect(keysOf(shown)).toEqual(['statements', 'premises']);
});

test('the rows the errand type does not examine are left out, written or not', () => {
  const startedAsServing = investigationOf(
    sectionOf('statements', 1),
    sectionOf('fire_safety', 7),
    sectionOf('child_perspective', 11, 'Barnperspektivet'),
    sectionOf('lease', 6)
  );

  expect(keysOf(visibleSupportInvestigationSections(startedAsServing, TOBACCO))).toEqual(['statements', 'lease']);
});

test('the rows are ordered by the errand type, not by the sort order the service holds', () => {
  const numberedByAnotherVariant = investigationOf(
    sectionOf('lease', 6),
    sectionOf('self_monitoring', 6),
    sectionOf('statements', 1),
    sectionOf('sales_point', 4)
  );

  expect(keysOf(visibleSupportInvestigationSections(numberedByAnotherVariant, TOBACCO))).toEqual([
    'statements',
    'sales_point',
    'lease',
    'self_monitoring',
  ]);
});

test('a row written under an earlier name is shown until the row it became is there', () => {
  const underTheOldName = investigationOf(sectionOf('personal_suitability', 2), sectionOf('premises', 4));

  expect(keysOf(visibleSupportInvestigationSections(underTheOldName, SERVING))).toEqual([
    'personal_suitability',
    'premises',
  ]);
  expect(
    keysOf(
      visibleSupportInvestigationSections(
        investigationOf(sectionOf('personal_suitability', 2), sectionOf('persons_of_influence', 2)),
        SERVING
      )
    )
  ).toEqual(['persons_of_influence']);
});

test('a row written under an earlier name is read as the examination it became', () => {
  expect(sectionKeyOf(sectionOf('personal_suitability', 2))).toBe('persons_of_influence');
  expect(sectionKeyOf(sectionOf('premises', 4))).toBe('premises');
  expect(sectionKeyOf({ sectionKey: undefined } as never)).toBe('');
});

test('a row carries the heading the register gives its examination, whatever name it was written under', () => {
  expect(supportInvestigationSectionSpec(sectionOf('personal_suitability', 2))?.headingKey).toBe(
    'common:investigation.sections.persons_of_influence'
  );
  expect(supportInvestigationSectionSpec(sectionOf('kitchen', 7))).toBeUndefined();
});

test('the examinations that are missing are the ones no row stands for, by the name they carry today', () => {
  const started = investigationOf(sectionOf('statements', 1), sectionOf('personal_suitability', 2));

  expect(missingSupportInvestigationSections(started, SERVING)).toEqual([
    'ownership',
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
  ]);
  expect(missingSupportInvestigationSections(undefined, TOBACCO)).toEqual(TOBACCO);
});

test('an examination of another errand type is not missing from this one', () => {
  const startedAsServing = investigationOf(...SERVING.map((sectionKey, index) => sectionOf(sectionKey, index + 1)));

  expect(missingSupportInvestigationSections(startedAsServing, SERVING)).toEqual([]);
  expect(missingSupportInvestigationSections(startedAsServing, TOBACCO)).toEqual(['sales_point', 'self_monitoring']);
});

test('the examinations are handed to the service with their headings translated and numbered by the type', () => {
  const translate = (key: string) => `översatt:${key}`;

  expect(supportInvestigationSectionInputs(translate, TOBACCO, ['self_monitoring'])).toEqual([
    {
      sectionKey: 'self_monitoring',
      heading: 'översatt:common:investigation.sections.self_monitoring',
      sortOrder: 7,
    },
  ]);
  expect(supportInvestigationSectionInputs(translate, SERVING)).toHaveLength(SERVING.length);
  expect(supportInvestigationSectionInputs(translate, TOBACCO).map((input) => input.sortOrder)).toEqual(
    TOBACCO.map((_, index) => index + 1)
  );
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
