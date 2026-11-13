import dayjs from 'dayjs';
import { expect, test } from 'vitest';

import type { SupportErrand } from './support-errand-service';
import {
  emptySupportMeasureRow,
  isSupportActionErrand,
  isSupportInspectionErrand,
  SUPPORT_ACTION_POINT_RESULTS,
  SUPPORT_MEASURE_RESULTS,
  supportMeasureChanges,
  supportMeasureIsOverdue,
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

const actionErrand = {
  labels: [
    { classification: 'CATEGORY', resourceName: 'INSPECTION' },
    { classification: 'TYPE', resourceName: 'MEASURES' },
  ],
} as unknown as SupportErrand;

test('an errand is an inspection when it is filed under the INSPECTION category', () => {
  expect(isSupportInspectionErrand(errandInCategory('INSPECTION'))).toBe(true);
  expect(isSupportInspectionErrand(errandInCategory('SERVING_PERMIT'))).toBe(false);
  expect(isSupportInspectionErrand({ labels: [] } as unknown as SupportErrand)).toBe(false);
  expect(isSupportInspectionErrand(undefined)).toBe(false);
});

test('an action errand shares the inspection category without being an inspection', () => {
  expect(isSupportActionErrand(actionErrand)).toBe(true);
  expect(isSupportInspectionErrand(actionErrand)).toBe(false);
  expect(isSupportActionErrand(errandInCategory('INSPECTION'))).toBe(false);
  expect(isSupportActionErrand(undefined)).toBe(false);
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
    ...emptySupportMeasureRow('Nykterhet'),
    id: 'm1',
    result: 'COMPLETED',
    description: 'ok',
  });
  expect(supportMeasureRow({ id: 'm1', result: 'DONE' })).toEqual({ ...emptySupportMeasureRow(), id: 'm1' });
  expect(supportMeasureRow({ id: 'm1', result: null })).toMatchObject({ result: '' });
  expect(supportMeasureRow({ id: 'm1', result: 'PARTIALLY_COMPLETED' })).toMatchObject({
    result: 'PARTIALLY_COMPLETED',
  });
});

test('a row reads the deadline as a date field and the goal as it stands', () => {
  expect(
    supportMeasureRow({ id: 'm1', title: 'Sätt upp skylt', dueAt: '2026-12-01T00:00:00+01:00', goal: 'Skylt på plats' })
  ).toMatchObject({ dueAt: '2026-12-01', goal: 'Skylt på plats' });
  expect(supportMeasureRow({ id: 'm1', dueAt: 'inte ett datum' })).toMatchObject({ dueAt: '' });
});

test('a measure changed after it was written says when, and one untouched since says nothing', () => {
  expect(
    supportMeasureRow({ id: 'm1', created: '2026-11-01T08:00:00Z', modified: '2026-11-18T13:12:00Z' })
  ).toMatchObject({ changedAt: '2026-11-18' });
  expect(
    supportMeasureRow({ id: 'm1', created: '2026-11-01T08:00:00Z', modified: '2026-11-01T08:00:00Z' })
  ).toMatchObject({ changedAt: '' });
  expect(supportMeasureRow({ id: 'm1', created: '2026-11-01T08:00:00Z' })).toMatchObject({ changedAt: '' });
});

test('a deadline in the past is overdue until the point is addressed or set aside', () => {
  expect(supportMeasureIsOverdue({ dueAt: '2020-01-01', result: '' })).toBe(true);
  expect(supportMeasureIsOverdue({ dueAt: '2020-01-01', result: 'PARTIALLY_COMPLETED' })).toBe(true);
  expect(supportMeasureIsOverdue({ dueAt: '2020-01-01', result: 'NOT_COMPLETED' })).toBe(true);
  expect(supportMeasureIsOverdue({ dueAt: '2020-01-01', result: 'COMPLETED' })).toBe(false);
  expect(supportMeasureIsOverdue({ dueAt: '2020-01-01', result: 'NOT_APPLICABLE' })).toBe(false);
  expect(supportMeasureIsOverdue({ dueAt: '2099-01-01', result: '' })).toBe(false);
  expect(supportMeasureIsOverdue({ dueAt: '', result: '' })).toBe(false);
});

test('a control point is not offered a partly addressed result, an action point is', () => {
  expect(SUPPORT_MEASURE_RESULTS.map((choice) => choice.result)).toEqual([
    'COMPLETED',
    'NOT_COMPLETED',
    'NOT_APPLICABLE',
  ]);
  expect(SUPPORT_ACTION_POINT_RESULTS.map((choice) => choice.result)).toEqual([
    'COMPLETED',
    'PARTIALLY_COMPLETED',
    'NOT_COMPLETED',
    'NOT_APPLICABLE',
  ]);
});

const row = (id: string | undefined, title: string, rest: Partial<SupportMeasureRow> = {}): SupportMeasureRow => ({
  ...emptySupportMeasureRow(title),
  id,
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

test('a deadline and a goal travel with a new point, and a later deadline is patched in', () => {
  const created = supportMeasureChanges(
    'EXTERNAL',
    [row(undefined, 'Sätt upp skylt', { dueAt: '2026-12-01', goal: 'Skylt på plats' })],
    []
  );
  const moved = supportMeasureChanges(
    'EXTERNAL',
    [row('m1', 'Sätt upp skylt', { dueAt: '2027-01-15' })],
    [row('m1', 'Sätt upp skylt', { dueAt: '2026-12-01' })]
  );

  expect(created.create).toEqual([
    {
      type: 'EXTERNAL',
      title: 'Sätt upp skylt',
      dueAt: dayjs('2026-12-01').startOf('day').format(),
      goal: 'Skylt på plats',
    },
  ]);
  expect(moved.update).toEqual([{ id: 'm1', patch: { dueAt: dayjs('2027-01-15').startOf('day').format() } }]);
});

test('an emptied deadline is left alone, since the service has no way to take one back', () => {
  const changes = supportMeasureChanges(
    'EXTERNAL',
    [row('m1', 'Sätt upp skylt', { dueAt: '' })],
    [row('m1', 'Sätt upp skylt', { dueAt: '2026-12-01' })]
  );

  expect(changes.update).toEqual([]);
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

test('the observations of an area are written as the result text, and cleared with an empty one', () => {
  const area = row('m3', 'Uteservering', { result: 'NOT_COMPLETED', resultText: 'CrowdedTables|Littering' });

  expect(
    supportMeasureChanges(
      'OBSERVATION',
      [
        row(undefined, 'Toaletter', { result: 'NOT_COMPLETED', resultText: 'Vomit' }),
        { ...area, result: 'COMPLETED', resultText: '' },
      ],
      [area]
    )
  ).toEqual({
    create: [{ type: 'OBSERVATION', title: 'Toaletter', result: 'NOT_COMPLETED', resultText: 'Vomit' }],
    update: [{ id: 'm3', patch: { result: 'COMPLETED', resultText: '' } }],
    remove: [],
  });
});
