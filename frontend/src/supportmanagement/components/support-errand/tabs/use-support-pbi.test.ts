// @vitest-environment jsdom
import { useConfigStore, useSupportStore } from '@stores/index';
import { getSupportErrandById } from '@supportmanagement/services/support-errand-service';
import { addSupportPbiByHand, getSupportPbi, markSupportPbi } from '@supportmanagement/services/support-pbi-service';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { useSupportPbi } from './use-support-pbi';

vi.mock('@supportmanagement/services/support-pbi-service', () => ({
  addSupportPbiByHand: vi.fn(),
  getSupportPbi: vi.fn(),
  isSupportPbiConflict: () => false,
  markSupportPbi: vi.fn(),
  removeSupportPbi: vi.fn(),
}));

vi.mock('@supportmanagement/services/support-errand-service', () => ({
  getSupportErrandById: vi.fn(),
}));

const reset = vi.fn();
vi.mock('react-hook-form', () => ({
  useFormContext: () => ({ formState: { dirtyFields: {} }, reset }),
}));

vi.mock('@sk-web-gui/react', () => ({ useSnackbar: () => vi.fn() }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

const MUNICIPALITY_ID = '2281';
const errandId = 'd2c1e9a4-7b53-4f08-9a16-5c3b8e7d4f02';
const partyId = 'b1f3a0a6-6a61-4a7e-9d3a-9a1f2e0c8a11';

const candidate = { partyId, name: 'Edwin Molina', marked: false };

beforeEach(() => {
  vi.mocked(getSupportPbi)
    .mockReset()
    .mockResolvedValue({ candidates: [candidate], people: [] });
  vi.mocked(getSupportErrandById)
    .mockReset()
    .mockResolvedValue({ errand: { id: errandId } } as never);
  vi.mocked(markSupportPbi).mockReset().mockResolvedValue(undefined);
  vi.mocked(addSupportPbiByHand).mockReset().mockResolvedValue(undefined);
  useConfigStore.setState({ municipalityId: MUNICIPALITY_ID });
  useSupportStore.setState({ supportErrand: { id: errandId } as never, pbiSignal: undefined });
});
afterEach(cleanup);

const loaded = async (result: { current: { candidates?: unknown[] } }) =>
  waitFor(() => expect(result.current.candidates).toHaveLength(1));

describe('useSupportPbi', () => {
  test('reads again when the marking was changed somewhere else, without a reading of its own setting that off', async () => {
    const { result } = renderHook(() => useSupportPbi(true));
    await loaded(result);
    expect(getSupportPbi).toHaveBeenCalledTimes(1);

    await act(async () => {
      useSupportStore.getState().setPbiSignal({ errandId, at: Date.now() });
    });

    await waitFor(() => expect(getSupportPbi).toHaveBeenCalledTimes(2));
    expect(useSupportStore.getState().pbiSignal?.at).toBeDefined();
    await new Promise((settle) => setTimeout(settle, 20));
    expect(getSupportPbi).toHaveBeenCalledTimes(2);
  });

  test('ignores a marking changed on another errand', async () => {
    const { result } = renderHook(() => useSupportPbi(true));
    await loaded(result);

    await act(async () => {
      useSupportStore.getState().setPbiSignal({ errandId: 'f4c7a1e2-5b38-4a90-8c2d-1e9f3b7a6c50', at: Date.now() });
    });

    await new Promise((settle) => setTimeout(settle, 20));
    expect(getSupportPbi).toHaveBeenCalledTimes(1);
  });

  test('tells every other list that a marking changed, and reads once for it', async () => {
    const { result } = renderHook(() => useSupportPbi(true));
    await loaded(result);

    await act(async () => {
      await result.current.marking?.onMark(partyId);
    });

    expect(markSupportPbi).toHaveBeenCalledWith(errandId, MUNICIPALITY_ID, partyId);
    expect(useSupportStore.getState().pbiSignal?.errandId).toBe(errandId);
    await waitFor(() => expect(getSupportPbi).toHaveBeenCalledTimes(2));
  });

  test('naming a person by hand puts the errand back in the form, so the next save keeps them', async () => {
    const { result } = renderHook(() => useSupportPbi(true));
    await loaded(result);
    reset.mockClear();

    await act(async () => {
      expect(await result.current.addByHand({ partyId, role: 'Finansiär' })).toBe(true);
    });

    expect(addSupportPbiByHand).toHaveBeenCalledWith(errandId, MUNICIPALITY_ID, { partyId, role: 'Finansiär' });
    expect(reset).toHaveBeenCalledWith({ id: errandId }, { keepDirtyValues: true });
    expect(useSupportStore.getState().pbiSignal?.errandId).toBe(errandId);
  });

  test('does not read the people of an errand when the drake has no company data', async () => {
    renderHook(() => useSupportPbi(false));

    await new Promise((settle) => setTimeout(settle, 20));
    expect(getSupportPbi).not.toHaveBeenCalled();
  });
});
