// @vitest-environment jsdom
import type { Measure } from '@common/data-contracts/supportmanagement/data-contracts';
import { useConfigStore, useSupportStore } from '@stores/index';
import type { SupportErrand } from '@supportmanagement/services/support-errand-service';
import { getSupportMeasures, saveSupportMeasures } from '@supportmanagement/services/support-measure-service';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { act } from 'react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import { SupportActionPointFollowUpSection } from './support-action-point-follow-up-section.component';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@sk-web-gui/react', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useSnackbar: () => vi.fn(),
}));
vi.mock('../investigation-section-text.component', () => ({ InvestigationSectionText: () => null }));
vi.mock('@supportmanagement/services/support-measure-service', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getSupportMeasures: vi.fn(),
  saveSupportMeasures: vi.fn(),
}));

const MEASURES: Measure[] = [
  { id: 'measure-1', type: 'EXTERNAL', title: 'Sätt upp prislista', status: 'ACTIVE', created: '2026-11-01T08:00:00Z' },
  // A point the process engine carried over without a title. Support Management takes it; the editable list treats
  // a blank title as a point to delete.
  { id: 'measure-2', type: 'EXTERNAL', title: '   ', status: 'ACTIVE', created: '2026-11-02T08:00:00Z' },
];

const renderSection = () =>
  render(
    <SupportActionPointFollowUpSection
      section={{ sectionKey: 'measures_taken' } as never}
      investigationId="investigation-1"
      writable
      onEdited={vi.fn()}
      onSaved={vi.fn()}
      saveRef={{ current: undefined }}
    />
  );

const resultButton = (key: string, result: string) =>
  document.querySelector(`[data-cy="action-point-follow-up-${key}"] [data-cy="action-point-result-${result}"]`);

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getSupportMeasures).mockResolvedValue(MEASURES);
  vi.mocked(saveSupportMeasures).mockResolvedValue(undefined);
  useConfigStore.setState({ municipalityId: '2281' } as never);
  useSupportStore.setState({ supportErrand: { id: 'errand-1' } as unknown as SupportErrand });
});

afterEach(cleanup);

// The shared diff deletes a saved point whose title is blank. The follow-up only ever changes a result, so it must
// send what changed and nothing else, or a click on one point would take another point off the errand.
test('settling a point writes that point only, and never deletes an untitled one', async () => {
  renderSection();
  await waitFor(() => expect(resultButton('measure-1', 'COMPLETED')).toBeTruthy());

  await act(async () => {
    fireEvent.click(resultButton('measure-1', 'COMPLETED') as HTMLButtonElement);
  });

  expect(saveSupportMeasures).toHaveBeenCalledTimes(1);
  const [, , changes] = vi.mocked(saveSupportMeasures).mock.calls[0];
  expect(changes).toHaveLength(1);
  expect(changes[0].remove).toEqual([]);
  expect(changes[0].create).toEqual([]);
  expect(changes[0].update).toHaveLength(1);
  expect(changes[0].update[0].id).toBe('measure-1');
  expect(changes[0].update[0].patch).toMatchObject({ result: 'COMPLETED' });
});

test('a point that is settled says which day it was settled on', async () => {
  renderSection();
  await waitFor(() => expect(resultButton('measure-1', 'COMPLETED')).toBeTruthy());

  await act(async () => {
    fireEvent.click(resultButton('measure-1', 'COMPLETED') as HTMLButtonElement);
  });

  expect(vi.mocked(saveSupportMeasures).mock.calls[0][2][0].update[0].patch.completedAt).toBeTruthy();
});

test('a point left unsettled carries no day', async () => {
  renderSection();
  await waitFor(() => expect(resultButton('measure-1', 'NOT_COMPLETED')).toBeTruthy());

  await act(async () => {
    fireEvent.click(resultButton('measure-1', 'NOT_COMPLETED') as HTMLButtonElement);
  });

  expect(vi.mocked(saveSupportMeasures).mock.calls[0][2][0].update[0].patch.completedAt).toBeUndefined();
});
