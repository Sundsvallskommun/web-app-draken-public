import { expect, test } from 'vitest';

import sv from '../../../public/locales/sv/common.json';
import { SUPPORT_INVESTIGATION_SECTIONS } from '../services/support-investigation-sections';
import { examinedSections, INVESTIGATION_VARIANTS, investigationVariantFor } from './index';

const SERVING = [
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

const TOBACCO = [
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

const swedish = (key: string): unknown =>
  key
    .replace(/^common:/, '')
    .split('.')
    .reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], sv);

const label = (classification: string, resourceName: string) => ({ classification, resourceName });

const errandOf = (...labels: { classification: string; resourceName: string }[]) => ({ labels } as never);

const variantOf = (...labels: { classification: string; resourceName: string }[]) =>
  investigationVariantFor(errandOf(...labels));

const servingVariant = variantOf(label('CATEGORY', 'ALCOHOL'), label('TYPE', 'SERVING_PERMIT_APPLICATION'));
const tobaccoVariant = variantOf(label('CATEGORY', 'TOBACCO'), label('TYPE', 'SALES_PERMIT_APPLICATION'));

test('a serving permit is examined as it always has been, underlay and all', () => {
  expect(servingVariant.body).toBe('sections');
  expect([...examinedSections(servingVariant)]).toEqual(SERVING);
  expect(servingVariant.body === 'sections' && servingVariant.basisTemplate).toBe('serving-permit-decision-basis');
});

test('a tobacco sales permit is examined by the headings the business writes, and has an underlay of its own', () => {
  expect([...examinedSections(tobaccoVariant)]).toEqual(TOBACCO);
  expect(tobaccoVariant.body === 'sections' && tobaccoVariant.basisTemplate).toBe('tobacco-sales-decision-basis');
});

test('an inspection is examined through its protocol, and has no examinations of its own', () => {
  const inspection = variantOf(label('CATEGORY', 'INSPECTION'), label('TYPE', 'INSPECTION'));

  expect(inspection.body).toBe('protocol');
  expect(examinedSections(inspection)).toEqual([]);
});

test('the most specific level that names a variant wins, and the category answers for the rest', () => {
  const permanentServing = variantOf(
    label('CATEGORY', 'ALCOHOL'),
    label('TYPE', 'SERVING_PERMIT_APPLICATION'),
    label('SUBTYPE', 'PERMANENT_SERVING')
  );
  const tobaccoChange = variantOf(label('CATEGORY', 'TOBACCO'), label('TYPE', 'SALES_PERMIT_CHANGE'));

  expect([...examinedSections(permanentServing)]).toEqual(SERVING);
  expect([...examinedSections(tobaccoChange)]).toEqual(TOBACCO);
});

test('an errand whose type says nothing is examined as a serving permit, as every errand was before', () => {
  expect([...examinedSections(investigationVariantFor(undefined))]).toEqual(SERVING);
  expect([...examinedSections(variantOf())]).toEqual(SERVING);
  expect([...examinedSections(variantOf(label('CATEGORY', 'DOCUMENTATION')))]).toEqual(SERVING);
});

test('every examination a variant asks for is in the register', () => {
  const registered = SUPPORT_INVESTIGATION_SECTIONS.map((section) => section.sectionKey);

  for (const variant of INVESTIGATION_VARIANTS)
    for (const sectionKey of examinedSections(variant)) expect(registered, sectionKey).toContain(sectionKey);
});

test('a variant that examines tells the handler which law the suitability is examined against', () => {
  for (const variant of INVESTIGATION_VARIANTS) {
    if (variant.body !== 'sections') continue;
    expect(swedish(variant.introKey), variant.introKey).toBeTypeOf('string');
  }

  expect(servingVariant.body === 'sections' && swedish(servingVariant.introKey)).toContain('alkohollagen');
  expect(tobaccoVariant.body === 'sections' && swedish(tobaccoVariant.introKey)).toContain(
    'lagen om tobak och liknande produkter'
  );
});

test('no two variants claim the same errand type', () => {
  const claimed = INVESTIGATION_VARIANTS.flatMap((variant) => [...variant.resourceNames]);

  expect(claimed).toEqual([...new Set(claimed)]);
});
