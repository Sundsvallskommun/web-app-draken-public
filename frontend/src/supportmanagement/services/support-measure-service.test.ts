import { expect, test } from 'vitest';

import type { SupportErrand } from './support-errand-service';
import {
  hasSupportMeasureChanges,
  supportMeasureChanges,
  supportMeasureRows,
  supportMeasureTypeForErrand,
} from './support-measure-service';
import type { SupportMetadata } from './support-metadata-service';

const metadata = {
  measureTypes: [
    { name: 'INTERNAL_INSPECTION', displayName: 'Inre tillsyn', measureGroups: ['INSPECTION'] },
    { name: 'EXTERNAL_INSPECTION', displayName: 'Yttre tillsyn', measureGroups: ['INSPECTION'] },
  ],
} as SupportMetadata;

const errandOfType = (resourceName: string) =>
  ({
    labels: [
      { classification: 'CATEGORY', resourceName: 'INSPECTION' },
      { classification: 'TYPE', resourceName },
    ],
  } as unknown as SupportErrand);

test('the measure type is the TYPE label when the namespace has a measure type by that name', () => {
  expect(supportMeasureTypeForErrand(errandOfType('EXTERNAL_INSPECTION'), metadata)).toBe('EXTERNAL_INSPECTION');
});

test('an errand whose type has no measure type gets none', () => {
  expect(supportMeasureTypeForErrand(errandOfType('PERMANENT_SERVING'), metadata)).toBeUndefined();
  expect(supportMeasureTypeForErrand({ labels: [] } as unknown as SupportErrand, metadata)).toBeUndefined();
  expect(supportMeasureTypeForErrand(errandOfType('EXTERNAL_INSPECTION'), undefined)).toBeUndefined();
});

const saved = [
  { id: 'm1', title: 'Ålderskontroll' },
  { id: 'm2', title: 'Serveringstider följs' },
];

test('rows are the saved measures, by id and title', () => {
  expect(supportMeasureRows(saved)).toEqual([
    { id: 'm1', title: 'Ålderskontroll' },
    { id: 'm2', title: 'Serveringstider följs' },
  ]);
  expect(supportMeasureRows(undefined)).toEqual([]);
});

test('rows equal to what was saved change nothing', () => {
  const changes = supportMeasureChanges(supportMeasureRows(saved), saved);

  expect(changes).toEqual({ create: [], update: [], remove: [] });
  expect(hasSupportMeasureChanges(changes)).toBe(false);
});

test('a row without id is created, a changed row updated, a missing row removed', () => {
  const changes = supportMeasureChanges([{ id: 'm1', title: 'Ålderskontroll (18 år)' }, { title: 'Prislista' }], saved);

  expect(changes).toEqual({
    create: ['Prislista'],
    update: [{ id: 'm1', title: 'Ålderskontroll (18 år)' }],
    remove: ['m2'],
  });
});

test('blank rows are dropped, and a saved row that was blanked is removed', () => {
  expect(supportMeasureChanges([{ id: 'm1', title: '  ' }, { title: '' }], saved)).toEqual({
    create: [],
    update: [],
    remove: ['m1', 'm2'],
  });
});

test('surrounding whitespace is neither saved nor counted as a change', () => {
  expect(supportMeasureChanges([{ id: 'm1', title: ' Ålderskontroll ' }, { title: ' Prislista ' }], saved)).toEqual({
    create: ['Prislista'],
    update: [],
    remove: ['m2'],
  });
});
