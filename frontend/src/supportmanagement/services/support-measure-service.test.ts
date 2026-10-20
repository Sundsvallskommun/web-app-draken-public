import { expect, test } from 'vitest';

import type { SupportErrand } from './support-errand-service';
import {
  isSupportInspectionErrand,
  supportMeasureChanges,
  type SupportMeasureRow,
  supportMeasureRow,
  supportMeasuresOfType,
} from './support-measure-service';

const errandInCategory = (resourceName: string) =>
  ({
    labels: [
      { classification: 'CATEGORY', resourceName },
      { classification: 'TYPE', resourceName: 'EXTERNAL_INSPECTION' },
    ],
  } as unknown as SupportErrand);

test('an errand is an inspection when it is filed under the INSPECTION category', () => {
  expect(isSupportInspectionErrand(errandInCategory('INSPECTION'))).toBe(true);
  expect(isSupportInspectionErrand(errandInCategory('SERVING_PERMIT'))).toBe(false);
  expect(isSupportInspectionErrand({ labels: [] } as unknown as SupportErrand)).toBe(false);
  expect(isSupportInspectionErrand(undefined)).toBe(false);
});

test('control points and action points are told apart by type, and listed in the order they were written', () => {
  const measures = [
    { id: 'm1', type: 'INTERNAL', title: 'Nykterhet', created: '2026-10-14T08:00:02Z' },
    { id: 'm2', type: 'EXTERNAL', title: 'Sätt upp skylt' },
    { id: 'm3', type: 'INTERNAL', title: 'Ålderskontroll', created: '2026-10-14T08:00:01Z' },
  ];
  expect(supportMeasuresOfType(measures, 'INTERNAL')).toEqual([measures[2], measures[0]]);
  expect(supportMeasuresOfType(measures, 'EXTERNAL')).toEqual([measures[1]]);
  expect(supportMeasuresOfType(undefined, 'EXTERNAL')).toEqual([]);
});

test('a row reads the title, result and note, and treats a result Draken does not know as none', () => {
  expect(supportMeasureRow({ id: 'm1', title: 'Nykterhet', result: 'COMPLETED', description: 'ok' })).toEqual({
    id: 'm1',
    title: 'Nykterhet',
    result: 'COMPLETED',
    description: 'ok',
  });
  expect(supportMeasureRow({ id: 'm1', result: 'DONE' })).toEqual({ id: 'm1', title: '', result: '', description: '' });
  expect(supportMeasureRow({ id: 'm1', result: null })).toMatchObject({ result: '' });
});

const row = (id: string | undefined, title: string, rest: Partial<SupportMeasureRow> = {}): SupportMeasureRow => ({
  id,
  title,
  result: '',
  description: '',
  ...rest,
});

const saved = [
  row('m1', 'Ålderskontroll'),
  row('m2', 'Serveringstider följs', { result: 'COMPLETED', description: 'Stängde 01:00' }),
];

test('rows equal to what was saved change nothing', () => {
  expect(supportMeasureChanges('INTERNAL', saved, saved)).toEqual({ create: [], update: [], remove: [] });
});

test('a row without id is created, a renamed row patched, a missing row removed', () => {
  expect(
    supportMeasureChanges('INTERNAL', [row('m1', 'Ålderskontroll (18 år)'), row(undefined, 'Prislista')], saved)
  ).toEqual({
    create: [{ type: 'INTERNAL', title: 'Prislista' }],
    update: [{ id: 'm1', patch: { title: 'Ålderskontroll (18 år)' } }],
    remove: ['m2'],
  });
});

test('a new row brings its result and note along, but only when it has them', () => {
  const changes = supportMeasureChanges(
    'EXTERNAL',
    [row(undefined, 'Nykterhet', { result: 'COMPLETED', description: 'Lugnt' }), row(undefined, 'Brandskydd')],
    []
  );

  expect(changes.create).toEqual([
    { type: 'EXTERNAL', title: 'Nykterhet', result: 'COMPLETED', description: 'Lugnt' },
    { type: 'EXTERNAL', title: 'Brandskydd' },
  ]);
});

test('a saved row is patched with the fields that differ; a result cannot be taken back', () => {
  const changes = supportMeasureChanges(
    'INTERNAL',
    [
      row('m1', 'Ålderskontroll', { result: 'NOT_COMPLETED' }),
      row('m2', 'Serveringstider följs', { description: 'Stängde 01:00' }),
    ],
    saved
  );

  expect(changes).toEqual({
    create: [],
    update: [{ id: 'm1', patch: { result: 'NOT_COMPLETED' } }],
    remove: [],
  });
});

test('blank rows are dropped, and a saved row that was blanked is removed', () => {
  expect(supportMeasureChanges('INTERNAL', [row('m1', '  '), row(undefined, '')], saved)).toEqual({
    create: [],
    update: [],
    remove: ['m1', 'm2'],
  });
});

test('surrounding whitespace is neither saved nor counted as a change', () => {
  expect(
    supportMeasureChanges('INTERNAL', [row('m1', ' Ålderskontroll '), row(undefined, ' Prislista ')], saved)
  ).toEqual({
    create: [{ type: 'INTERNAL', title: 'Prislista' }],
    update: [],
    remove: ['m2'],
  });
});
