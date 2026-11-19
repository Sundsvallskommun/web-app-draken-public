// @vitest-environment jsdom
import type { SupportMeasureRow } from '@supportmanagement/services/support-measure-service';
import { cleanup, render } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';

import { ActionPointCard } from './action-point-card.component';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

const measure = (changes: Partial<SupportMeasureRow> = {}): SupportMeasureRow => ({
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

const renderCard = (row: SupportMeasureRow) =>
  render(<ActionPointCard index={0} row={row} readOnly={false} onChange={vi.fn()} onRemove={vi.fn()} />);

const changedStamp = () => document.querySelector('[data-cy="action-point-changed"]');

afterEach(cleanup);

// The service keeps no history for a measure, so a change to the result and a moved deadline look the same
// from here. The stamp must not pick one of them.
test('a point that has been changed says it is changed, not that the deadline was moved', () => {
  renderCard(measure({ changedAt: '2026-11-12', result: 'PARTIALLY_COMPLETED' }));

  expect(changedStamp()?.textContent).toBe('common:action_points.changed');
});

test('a point that was never changed after it was written carries no stamp', () => {
  renderCard(measure());

  expect(changedStamp()).toBeNull();
});
