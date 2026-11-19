// @vitest-environment jsdom
import type { SupportMeasureRow } from '@supportmanagement/services/support-measure-service';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';

import { ActionPointFollowUpCard } from './action-point-follow-up-card.component';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

const point = (changes: Partial<SupportMeasureRow> = {}): SupportMeasureRow => ({
  id: 'measure-1',
  title: 'Byt ut den olagliga prislistan',
  result: '',
  description: '',
  resultText: '',
  dueAt: '',
  goal: '',
  completedAt: '',
  changedAt: '',
  ...changes,
});

const onResult = vi.fn();
const onResultText = vi.fn();
const onResultTextWritten = vi.fn();

const renderCard = (row: SupportMeasureRow, readOnly = false) =>
  render(
    <ActionPointFollowUpCard
      index={0}
      row={row}
      readOnly={readOnly}
      onResult={onResult}
      onResultText={onResultText}
      onResultTextWritten={onResultTextWritten}
    />
  );

const resultButton = (result: string) =>
  document.querySelector(`[data-cy="action-point-result-${result}"]`) as HTMLButtonElement;
const resultText = () => document.querySelector('[data-cy="action-point-result-text"]') as HTMLInputElement;
const settledStamp = () => document.querySelector('[data-cy="action-point-completed"]');
const overdue = () => document.querySelector('[data-cy="action-point-overdue"]');

const A_PASSED_DEADLINE = '2020-01-01';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

test('picking a result says which one was picked, and the one in force reads as pressed', () => {
  renderCard(point({ result: 'PARTIALLY_COMPLETED' }));

  fireEvent.click(resultButton('COMPLETED'));

  expect(onResult).toHaveBeenCalledWith('COMPLETED');
  expect(resultButton('PARTIALLY_COMPLETED').getAttribute('aria-pressed')).toBe('true');
});

test('what was written about the outcome is kept once the handler leaves the field', () => {
  renderCard(point());

  fireEvent.change(resultText(), { target: { value: 'Ny prislista uppsatt' } });
  fireEvent.blur(resultText());

  expect(onResultText).toHaveBeenCalledWith('Ny prislista uppsatt');
  expect(onResultTextWritten).toHaveBeenCalledTimes(1);
});

test('a point that has been settled says which day it was settled on', () => {
  renderCard(point({ result: 'COMPLETED', completedAt: '2026-11-16' }));

  expect(settledStamp()?.textContent).toBe('common:action_points.completed');
});

// The service keeps the date it was sent and cannot clear it, so the stamp goes by the result in force.
test('a point that was settled and then marked as unaddressed carries no stamp', () => {
  renderCard(point({ result: 'NOT_COMPLETED', completedAt: '2026-11-16' }));

  expect(settledStamp()).toBeNull();
});

test('a deadline that has passed is marked until a result settles the point', () => {
  renderCard(point({ dueAt: A_PASSED_DEADLINE }));

  expect(overdue()).toBeTruthy();

  cleanup();
  renderCard(point({ dueAt: A_PASSED_DEADLINE, result: 'COMPLETED' }));

  expect(overdue()).toBeNull();
});

test('nothing can be set while the section is read only', () => {
  renderCard(point(), true);

  expect(resultButton('COMPLETED').disabled).toBe(true);
  expect(resultText().disabled).toBe(true);
});
