import { expect, test } from 'vitest';

import {
  measureCanExecute,
  type MeasureForm,
  measureFormChanges,
  measureFormCreate,
  measureFormErrors,
  measureFormRebase,
  measureFormValues,
} from './measure-form';

const plannedMeasure = {
  id: '1',
  type: 'OLD',
  measureTypeId: 'dd000000-0000-4000-8000-000000000101',
  version: 3,
  goal: 'Existing goal',
  description: 'Existing description',
  plannedStart: '2026-09-08T15:42:01+02:00',
  plannedComplete: '2026-09-10T12:00:00+02:00',
  addedByUser: 'creator',
};

test('edits only changed fields and preserves exact timestamps, creator and decision', () => {
  const form = { ...measureFormValues(plannedMeasure), goal: 'New goal' };
  expect(measureFormChanges(form, plannedMeasure)).toEqual({ goal: 'New goal' });
  expect(measureFormErrors(form, plannedMeasure)).toEqual({});
});

test('collects all required field errors instead of reporting only the first', () => {
  expect(Object.keys(measureFormErrors(measureFormValues({}), {}))).toEqual([
    'measureTypeId',
    'description',
    'goal',
    'timing',
  ]);
});

test('sends the selected type UUID without the read-only type name or version', () => {
  const measureTypeId = 'dd000000-0000-4000-8000-000000000100';
  const form = { ...measureFormValues(plannedMeasure), measureTypeId };
  expect(measureFormChanges(form, plannedMeasure)).toEqual({ measureTypeId });
});

test('rejects reversed date ranges and missing required dates', () => {
  const form = measureFormValues(plannedMeasure);
  expect(measureFormErrors({ ...form, plannedComplete: '2026-09-01' }, plannedMeasure).plannedComplete).toContain(
    'före'
  );
  expect(measureFormErrors({ ...form, plannedStart: '' }, plannedMeasure).plannedStart).toBeDefined();
});

test('changing to completed preserves saved plans without sending hidden draft dates', () => {
  const form: MeasureForm = {
    ...measureFormValues(plannedMeasure),
    timing: 'executed',
    executed: '2026-09-09',
    plannedStart: '2026-09-01',
  };
  const changes = measureFormChanges(form, plannedMeasure);
  expect(Object.keys(changes)).toEqual(['executed']);
  expect(changes.executed).toMatch(/^2026-09-09T00:00:00[+-]\d{2}:\d{2}$/);
  expect(measureFormErrors(form, plannedMeasure)).toEqual({});
});

test('does not allow silently clearing completion by changing back to planned', () => {
  const completed = { ...plannedMeasure, executed: '2026-09-09T12:00:00+02:00' };
  const form: MeasureForm = { ...measureFormValues(completed), timing: 'planned' };
  expect(measureFormErrors(form, completed).timing).toContain('kan inte återställas');
});

test('preselects a single creation role but requires a deliberate choice when several exist', () => {
  const roles = [
    { name: 'MANAGER', displayName: 'Enhetschef' },
    { name: 'NURSE', displayName: 'HSL' },
  ];
  expect(measureFormValues(undefined, roles.slice(0, 1)).addedByRole).toBe('MANAGER');
  const form = measureFormValues(undefined, roles);
  expect(form.addedByRole).toBe('');
  expect(measureFormErrors(form).addedByRole).toBeDefined();
});

test('creates with the selected role key and only the visible dates', () => {
  const form: MeasureForm = {
    ...measureFormValues(),
    measureTypeId: plannedMeasure.measureTypeId,
    addedByRole: 'NURSE',
    goal: 'Säkrare arbetssätt',
    description: 'Gemensam utbildning',
    timing: 'executed',
    executed: '2026-09-08',
    plannedStart: '2026-09-01',
  };
  expect(measureFormErrors(form)).toEqual({});
  expect(measureFormCreate(form)).toEqual({
    measureTypeId: plannedMeasure.measureTypeId,
    addedByRole: 'NURSE',
    goal: 'Säkrare arbetssätt',
    description: 'Gemensam utbildning',
    executed: expect.stringMatching(/^2026-09-08T00:00:00[+-]\d{2}:\d{2}$/),
  });
});

test('does not offer an update path for the saved registration role', () => {
  const form = { ...measureFormValues(plannedMeasure), addedByRole: 'OTHER' };
  expect(measureFormChanges(form, plannedMeasure)).toEqual({});
});

test('sends the responsible person as trimmed free text and ignores whitespace-only edits', () => {
  const measure = { ...plannedMeasure, responsibleUser: 'Anna Andersson' };
  expect(measureFormChanges({ ...measureFormValues(measure), responsibleUser: ' Anna Andersson ' }, measure)).toEqual(
    {}
  );
  expect(measureFormChanges({ ...measureFormValues(measure), responsibleUser: ' Bo Berg ' }, measure)).toEqual({
    responsibleUser: 'Bo Berg',
  });
});

test('proposing roles can only register planned measures, accepted proposals may be executed', () => {
  expect(measureCanExecute(undefined, true)).toBe(true);
  expect(measureCanExecute(undefined, false)).toBe(false);
  expect(measureCanExecute({ ...plannedMeasure, accept: 'TRUE' }, false)).toBe(true);
  expect(measureCanExecute({ ...plannedMeasure, accept: 'REWORK' }, false)).toBe(true);
  expect(measureCanExecute({ ...plannedMeasure, accept: 'FALSE' }, true)).toBe(false);
  expect(measureCanExecute(plannedMeasure, true)).toBe(false);
  expect(measureCanExecute({ ...plannedMeasure, executed: '2026-09-09T12:00:00+02:00' }, false)).toBe(true);
  const executed: MeasureForm = { ...measureFormValues(), timing: 'executed', executed: '2026-09-08' };
  expect(measureFormErrors(executed, undefined, { canExecute: false }).timing).toContain('planerade');
  expect(measureFormErrors(executed, undefined, { canExecute: true }).timing).toBeUndefined();
});

test('an executed date may be today or earlier, never in the future', () => {
  const form: MeasureForm = { ...measureFormValues(), timing: 'executed', executed: '2026-09-10' };
  const policy = { canExecute: true, today: '2026-09-09' };
  expect(measureFormErrors(form, undefined, policy).executed).toContain('framtiden');
  expect(measureFormErrors({ ...form, executed: '2026-09-09' }, undefined, policy).executed).toBeUndefined();
  expect(measureFormErrors({ ...form, executed: '2026-09-01' }, undefined, policy).executed).toBeUndefined();
});

test.each(['TRUE', 'FALSE', 'REWORK'])('preserves decided content when editing planning after %s', (accept) => {
  const measure = { ...plannedMeasure, accept };
  const form = {
    ...measureFormValues(measure),
    goal: 'Changed',
    description: 'Changed',
    measureTypeId: 'other',
    responsibleUser: ' Anna ',
  };
  expect(measureFormChanges(form, measure)).toEqual({ responsibleUser: 'Anna' });
});

test('adopts fields the other writer changed while the draft never touched them', () => {
  const upstream = { ...plannedMeasure, goal: 'Goal set by someone else', version: 4 };
  const draft = { ...measureFormValues(plannedMeasure), description: 'My edited description' };
  const rebase = measureFormRebase(draft, { description: true }, plannedMeasure, upstream);
  expect(rebase).toEqual({ adopt: { goal: 'Goal set by someone else' }, conflicts: [] });
});

test('keeps the draft and names the field when both writers changed the same one', () => {
  const upstream = { ...plannedMeasure, goal: 'Goal set by someone else', version: 4 };
  const draft = { ...measureFormValues(plannedMeasure), goal: 'My goal' };
  const rebase = measureFormRebase(draft, { goal: true }, plannedMeasure, upstream);
  expect(rebase).toEqual({ adopt: {}, conflicts: ['Mål'] });
});

test('reports nothing to merge when the measure only moved version', () => {
  const draft = { ...measureFormValues(plannedMeasure), goal: 'My goal' };
  const rebase = measureFormRebase(draft, { goal: true }, plannedMeasure, { ...plannedMeasure, version: 9 });
  expect(rebase).toEqual({ adopt: {}, conflicts: [] });
});

test('rebases a timing switch and its dates together', () => {
  const upstream = { ...plannedMeasure, executed: '2026-09-11T09:00:00+02:00', version: 4 };
  const draft = { ...measureFormValues(plannedMeasure), responsibleUser: 'Anna' };
  const rebase = measureFormRebase(draft, { responsibleUser: true }, plannedMeasure, upstream);
  expect(rebase.conflicts).toEqual([]);
  expect(rebase.adopt).toEqual({ timing: 'executed', executed: '2026-09-11' });
});
