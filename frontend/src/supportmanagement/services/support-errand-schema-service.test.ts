import type { ErrandLabel } from '@common/data-contracts/supportmanagement/data-contracts';
import { expect, test } from 'vitest';

import { jsonParameterForSchema, schemaNameForErrand, upsertJsonParameter } from './support-errand-schema-service';
import type { SupportErrand } from './support-errand-service';

const label = (classification: string, resourceName: string): ErrandLabel => ({ classification, resourceName });

const CATEGORY = label('CATEGORY', 'ALCOHOL');
const TYPE = label('TYPE', 'SERVING_PERMIT_APPLICATION');
const SUBTYPE = label('SUBTYPE', 'PERMANENT_SERVING');

const labelled = (labels: ErrandLabel[]) => ({ labels });

test('names the schema after the namespace and the whole categorization path, lower case', () => {
  expect(schemaNameForErrand(labelled([CATEGORY, TYPE, SUBTYPE]), 'AOT')).toBe(
    'aot_alcohol_serving_permit_application_permanent_serving'
  );
});

test('a type without a subtype is a complete errand type', () => {
  expect(schemaNameForErrand(labelled([CATEGORY, TYPE]), 'AOT')).toBe('aot_alcohol_serving_permit_application');
});

test('the labels may arrive in any order', () => {
  expect(schemaNameForErrand(labelled([SUBTYPE, TYPE, CATEGORY]), 'AOT')).toBe(
    'aot_alcohol_serving_permit_application_permanent_serving'
  );
});

test('a category on its own is not an errand type and selects no schema', () => {
  expect(schemaNameForErrand(labelled([CATEGORY]), 'AOT')).toBeUndefined();
});

test('a subtype without its type is a broken path, not a two-level name', () => {
  expect(schemaNameForErrand(labelled([CATEGORY, SUBTYPE]), 'AOT')).toBeUndefined();
});

test('no namespace, no name - the namespace is what keeps apps apart in the service', () => {
  expect(schemaNameForErrand(labelled([CATEGORY, TYPE, SUBTYPE]), undefined)).toBeUndefined();
  expect(schemaNameForErrand(undefined, 'AOT')).toBeUndefined();
});

test('an errand without labels is typed by its classification, like getLabelCategory falls back', () => {
  const classification = { category: 'ALCOHOL', type: 'SERVING_PERMIT_APPLICATION' };

  expect(schemaNameForErrand({ labels: [], classification }, 'AOT')).toBe('aot_alcohol_serving_permit_application');
  expect(schemaNameForErrand({ classification }, 'AOT')).toBe('aot_alcohol_serving_permit_application');
});

test('labels win over classification when both are present', () => {
  const classification = { category: 'OTHER', type: 'OTHER_TYPE' };

  expect(schemaNameForErrand({ labels: [CATEGORY, TYPE], classification }, 'AOT')).toBe(
    'aot_alcohol_serving_permit_application'
  );
});

test('NONE is an unset classification level, not a type', () => {
  expect(
    schemaNameForErrand({ labels: [], classification: { category: 'ALCOHOL', type: 'NONE' } }, 'AOT')
  ).toBeUndefined();
  expect(
    schemaNameForErrand({ labels: [], classification: { category: 'NONE', type: 'NONE' } }, 'AOT')
  ).toBeUndefined();
  expect(schemaNameForErrand({ labels: [], classification: { category: '', type: '' } }, 'AOT')).toBeUndefined();
});

test('finds the errand document filed under the schema name', () => {
  const errand = {
    jsonParameters: [
      { key: 'aot_other', value: {}, schemaId: 'other-id' },
      { key: 'aot_alcohol', value: { a: 1 }, schemaId: 'alcohol-id' },
    ],
  } as unknown as SupportErrand;

  expect(jsonParameterForSchema(errand, 'aot_alcohol')?.schemaId).toBe('alcohol-id');
  expect(jsonParameterForSchema(errand, 'aot_missing')).toBeUndefined();
  expect(jsonParameterForSchema(errand, undefined)).toBeUndefined();
});

test('upserting one document keeps the others, so a write does not drop them', () => {
  const existing = [{ key: 'aot_other', value: { keep: true }, schemaId: 'other-id' }];

  expect(upsertJsonParameter(existing, { key: 'aot_alcohol', value: { a: 1 }, schemaId: 'alcohol-id' })).toEqual([
    { key: 'aot_other', value: { keep: true }, schemaId: 'other-id' },
    { key: 'aot_alcohol', value: { a: 1 }, schemaId: 'alcohol-id' },
  ]);
});

test('upserting replaces the value and the schema version of the document it matches', () => {
  const existing = [{ key: 'aot_alcohol', value: { a: 1 }, schemaId: 'alcohol-id-1-0', version: 3 }];

  expect(upsertJsonParameter(existing, { key: 'aot_alcohol', value: { a: 2 }, schemaId: 'alcohol-id-1-1' })).toEqual([
    { key: 'aot_alcohol', value: { a: 2 }, schemaId: 'alcohol-id-1-1', version: 3 },
  ]);
});
