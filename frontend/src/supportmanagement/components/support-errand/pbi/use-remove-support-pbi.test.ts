// @vitest-environment jsdom
import { useConfigStore, useSupportStore } from '@stores/index';
import { getSupportErrandById } from '@supportmanagement/services/support-errand-service';
import { removeSupportPbi } from '@supportmanagement/services/support-pbi-service';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import { useRemoveSupportPbi } from './use-remove-support-pbi';

vi.mock('@supportmanagement/services/support-pbi-service', () => ({
  removeSupportPbi: vi.fn(),
  isSupportPbiConflict: () => false,
}));
vi.mock('@supportmanagement/services/support-errand-service', () => ({ getSupportErrandById: vi.fn() }));
const reset = vi.fn();
vi.mock('react-hook-form', () => ({ useFormContext: () => ({ formState: { dirtyFields: {} }, reset }) }));
const toastMessage = vi.fn();
vi.mock('@sk-web-gui/react', () => ({ useSnackbar: () => toastMessage }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

const ERRAND_ID = 'd2c1e9a4-7b53-4f08-9a16-5c3b8e7d4f02';
const EDWIN = 'b1f3a0a6-6a61-4a7e-9d3a-9a1f2e0c8a11';

const errandWithoutEdwin = { id: ERRAND_ID, stakeholders: [] };

beforeEach(() => {
  vi.clearAllMocks();
  useSupportStore.setState({ supportErrand: { id: ERRAND_ID } as never, pbiSignal: undefined });
  useConfigStore.setState({ municipalityId: '2281' } as never);
  vi.mocked(removeSupportPbi).mockResolvedValue(undefined);
  vi.mocked(getSupportErrandById).mockResolvedValue({ errand: errandWithoutEdwin } as never);
});

afterEach(cleanup);

test('the errand is read back once the person is gone, so saving Grundinformation cannot put them back', async () => {
  const { result } = renderHook(() => useRemoveSupportPbi());

  await act(async () => {
    await expect(result.current(EDWIN)).resolves.toBe(true);
  });

  expect(removeSupportPbi).toHaveBeenCalledWith(ERRAND_ID, '2281', EDWIN);
  expect(useSupportStore.getState().supportErrand).toEqual(errandWithoutEdwin);
  expect(reset).toHaveBeenCalledWith(errandWithoutEdwin, { keepDirtyValues: true });
  expect(useSupportStore.getState().pbiSignal?.errandId).toBe(ERRAND_ID);
});

test('a removal that failed says so and leaves the errand alone', async () => {
  vi.mocked(removeSupportPbi).mockRejectedValue(new Error('upstream'));
  const { result } = renderHook(() => useRemoveSupportPbi());

  await act(async () => {
    await expect(result.current(EDWIN)).resolves.toBe(false);
  });

  expect(getSupportErrandById).not.toHaveBeenCalled();
  expect(toastMessage).toHaveBeenCalled();
  expect(useSupportStore.getState().pbiSignal).toBeUndefined();
});
