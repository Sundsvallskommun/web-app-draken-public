import { expect, test } from 'vitest';

import type { SupportErrand } from './support-errand-service';
import {
  hasSupportMeasureChanges,
  isSupportInspectionErrand,
  supportMeasureChanges,
  supportMeasureProtocolEdited,
  supportMeasureProtocolFields,
  supportMeasureProtocolPatch,
  supportMeasureRows,
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
    create: [{ title: 'Prislista' }],
    update: [{ id: 'm1', title: 'Ålderskontroll (18 år)' }],
    remove: ['m2'],
  });
});

test('a new row brings its result and note along, but only when it has them', () => {
  const changes = supportMeasureChanges(
    [
      { title: 'Nykterhet', result: 'COMPLETED', description: 'Lugnt' },
      { title: 'Brandskydd', result: '', description: '' },
    ],
    []
  );

  expect(changes.create).toEqual([
    { title: 'Nykterhet', result: 'COMPLETED', description: 'Lugnt' },
    { title: 'Brandskydd' },
  ]);
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
    create: [{ title: 'Prislista' }],
    update: [],
    remove: ['m2'],
  });
});

test('protocol fields read the result and note, and treat a result Draken does not know as none', () => {
  expect(supportMeasureProtocolFields({ id: 'm1', result: 'COMPLETED', description: 'ok' })).toEqual({
    result: 'COMPLETED',
    description: 'ok',
  });
  expect(supportMeasureProtocolFields({ id: 'm1', result: 'DONE' })).toEqual({ result: '', description: '' });
  expect(supportMeasureProtocolFields({ id: 'm1', result: null })).toEqual({ result: '', description: '' });
});

test('protocol fields are edited when the result or the note differs from the measure', () => {
  const measure = { id: 'm1', result: 'COMPLETED', description: 'ok' };

  expect(supportMeasureProtocolEdited({ result: 'COMPLETED', description: 'ok' }, measure)).toBe(false);
  expect(supportMeasureProtocolEdited({ result: 'NOT_COMPLETED', description: 'ok' }, measure)).toBe(true);
  expect(supportMeasureProtocolEdited({ result: 'COMPLETED', description: 'ok!' }, measure)).toBe(true);
});

test('no result is written as null so the service clears it', () => {
  expect(supportMeasureProtocolPatch({ result: '', description: 'x' })).toEqual({ result: null, description: 'x' });
  expect(supportMeasureProtocolPatch({ result: 'NOT_APPLICABLE', description: '' })).toEqual({
    result: 'NOT_APPLICABLE',
    description: '',
  });
});
