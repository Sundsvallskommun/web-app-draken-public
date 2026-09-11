import type { MeasureType } from '@common/data-contracts/supportmanagement/data-contracts';
import { expect, test } from 'vitest';

import { measureTypeLabel, selectableMeasureTypes } from './measure-types';

const types: MeasureType[] = [
  { id: 'old-id', name: 'OLD', displayName: 'Tidigare typ', measureGroups: ['B', 'SHARED'], deprecated: true },
  {
    id: 'second-id',
    name: 'SECOND',
    displayName: 'Andra typen',
    measureGroups: ['A', 'SHARED'],
    sortOrder: 2,
  },
  {
    id: 'first-id',
    name: 'FIRST',
    displayName: 'Första typen',
    measureGroups: ['A', 'SHARED'],
    sortOrder: 1,
  },
];

test('sorts each active choice once by metadata without modifying the source', () => {
  const original = structuredClone(types);
  expect(selectableMeasureTypes(types, ['first-id', 'second-id']).map((type) => type.name)).toEqual([
    'FIRST',
    'SECOND',
  ]);
  expect(types).toEqual(original);
});

test('keeps an existing deprecated type selectable and resolves historic or unknown labels', () => {
  expect(selectableMeasureTypes(types, ['first-id', 'second-id'], 'old-id').map((type) => type.id)).toEqual([
    'first-id',
    'second-id',
    'old-id',
  ]);
  expect(measureTypeLabel(types, { measureTypeId: 'old-id', type: 'OLD' })).toBe('Tidigare typ');
  expect(measureTypeLabel(types, { measureTypeId: 'removed-id', type: 'REMOVED' })).toBe('REMOVED');
  expect(selectableMeasureTypes([], [])).toEqual([]);
});

test('does not infer identity from a name or offer metadata without an ID', () => {
  expect(selectableMeasureTypes([{ name: 'NO_ID', measureGroups: ['A', 'SHARED'] }], ['NO_ID'])).toEqual([]);
  expect(measureTypeLabel(types, { measureTypeId: 'removed-id', type: 'OLD' })).toBe('OLD');
  expect(measureTypeLabel(types, {})).toBe('Typ saknas');
});

test('only offers IDs resolved by Draken; empty choices grant nothing', () => {
  expect(selectableMeasureTypes(types, [])).toEqual([]);
  expect(selectableMeasureTypes(types, ['unknown-id'])).toEqual([]);
  expect(
    selectableMeasureTypes([{ id: 'type-id', name: 'UNASSIGNED', measureGroups: ['role-1', 'SHARED'] }], [])
  ).toEqual([]);
});

test('keeps the saved type when Draken no longer offers it', () => {
  expect(selectableMeasureTypes(types, [], 'first-id').map((type) => type.id)).toEqual(['first-id']);
});
