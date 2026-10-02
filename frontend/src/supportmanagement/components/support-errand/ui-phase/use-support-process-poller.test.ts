// @vitest-environment jsdom
import { getSupportErrandById, SupportErrand } from '@supportmanagement/services/support-errand-service';
import { getSupportErrandProcessState } from '@supportmanagement/services/support-process-service';
import { cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import { useSupportProcessPoller } from './use-support-process-poller';

const store = vi.hoisted(() => ({
  supportErrand: undefined as SupportErrand | undefined,
  setSupportErrand: vi.fn(),
  processSignal: undefined as { errandId: string; at: number } | undefined,
  setProcessSignal: vi.fn(),
}));

vi.mock('@config/appconfig', () => ({ appConfig: { features: { useProcess: true } } }));
vi.mock('@stores/index', () => ({
  useSupportStore: (select: (state: typeof store) => unknown) => select(store),
  useConfigStore: (select: (state: { municipalityId: string }) => unknown) => select({ municipalityId: '2281' }),
}));
vi.mock('@supportmanagement/services/support-errand-service', () => ({ getSupportErrandById: vi.fn() }));
vi.mock('@supportmanagement/services/support-process-service', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getSupportErrandProcessState: vi.fn(),
}));

const ERRAND_ID = 'errand-1';

const processAt = (processStatus: string, currentActivityId = 'review_phase', modified = 'first') => ({
  processStatus,
  currentActivityId,
  modified,
});

const errandWith = (processStatus: string | undefined, currentActivityId = 'review_phase'): SupportErrand =>
  ({
    id: ERRAND_ID,
    modified: '2026-10-02T08:00:00Z',
    ...(processStatus ? { process: processAt(processStatus, currentActivityId) } : {}),
  } as SupportErrand);

const stateOf = (processStatus: string, currentActivityId = 'review_phase', modified = 'first') =>
  ({ process: processAt(processStatus, currentActivityId, modified), startability: 'LIVE_INSTANCE' } as never);

const processReads = () => vi.mocked(getSupportErrandProcessState).mock.calls.length;
const errandReads = () => vi.mocked(getSupportErrandById).mock.calls.length;

beforeEach(() => {
  vi.useFakeTimers();
  store.supportErrand = errandWith('RUNNING');
  store.processSignal = undefined;
  store.setSupportErrand.mockReset();
  store.setProcessSignal.mockReset();
  vi.mocked(getSupportErrandProcessState)
    .mockReset()
    .mockImplementation(async () => stateOf('RUNNING'));
  vi.mocked(getSupportErrandById)
    .mockReset()
    .mockImplementation(async () => ({ errand: errandWith('RUNNING', 'investigation_phase') } as never));
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

test('a process that is working is read again, and at a widening distance', async () => {
  renderHook(() => useSupportProcessPoller());

  await vi.advanceTimersByTimeAsync(1900);
  expect(processReads()).toBe(0);

  await vi.advanceTimersByTimeAsync(200);
  expect(processReads()).toBe(1);

  await vi.advanceTimersByTimeAsync(3100);
  expect(processReads()).toBe(2);
});

test('a process that was asked to move is followed although it says it is waiting', async () => {
  store.supportErrand = errandWith('WAITING');
  store.processSignal = { errandId: ERRAND_ID, at: 1 };
  vi.mocked(getSupportErrandProcessState).mockImplementation(async () => stateOf('WAITING'));

  const { result } = renderHook(() => useSupportProcessPoller());

  expect(result.current).toBe(true);

  await vi.advanceTimersByTimeAsync(1100);
  expect(processReads()).toBe(1);
});

test('the first twenty seconds after a signal are read once a second', async () => {
  store.supportErrand = errandWith('WAITING');
  store.processSignal = { errandId: ERRAND_ID, at: 1 };
  vi.mocked(getSupportErrandProcessState).mockImplementation(async () => stateOf('WAITING'));

  renderHook(() => useSupportProcessPoller());

  await vi.advanceTimersByTimeAsync(10000);
  expect(processReads()).toBeGreaterThan(8);
});

test('a signal left standing is let go of when watching runs out', async () => {
  store.supportErrand = errandWith('WAITING');
  store.processSignal = { errandId: ERRAND_ID, at: 1 };
  vi.mocked(getSupportErrandProcessState).mockImplementation(async () => stateOf('WAITING'));

  renderHook(() => useSupportProcessPoller());

  await vi.advanceTimersByTimeAsync(60000);
  expect(store.setProcessSignal).not.toHaveBeenCalled();

  await vi.advanceTimersByTimeAsync(65000);
  expect(store.setProcessSignal).toHaveBeenCalledWith(undefined);
});

test('a signal sent for another errand is none of this errand business', async () => {
  store.supportErrand = errandWith('WAITING');
  store.processSignal = { errandId: 'errand-2', at: 1 };

  renderHook(() => useSupportProcessPoller());

  await vi.advanceTimersByTimeAsync(60000);
  expect(processReads()).toBe(0);
});

test('the errand is left alone as long as the process has not been written', async () => {
  renderHook(() => useSupportProcessPoller());

  await vi.advanceTimersByTimeAsync(60000);

  expect(processReads()).toBeGreaterThan(3);
  expect(errandReads()).toBe(0);
  expect(store.setSupportErrand).not.toHaveBeenCalled();
});

test('the errand is read as soon as the process has been written, whatever changed in it', async () => {
  renderHook(() => useSupportProcessPoller());

  await vi.advanceTimersByTimeAsync(2000);
  expect(errandReads()).toBe(0);

  vi.mocked(getSupportErrandProcessState).mockImplementation(async () => stateOf('RUNNING', 'review_phase', 'second'));

  await vi.advanceTimersByTimeAsync(3200);
  expect(errandReads()).toBe(1);
  expect(store.setSupportErrand).toHaveBeenCalledWith(errandWith('RUNNING', 'investigation_phase'));
});

test('a signal is held until the process has left the activity it was sent at, not merely written', async () => {
  store.supportErrand = errandWith('WAITING');
  store.processSignal = { errandId: ERRAND_ID, at: 1 };
  vi.mocked(getSupportErrandProcessState).mockImplementation(async () => stateOf('WAITING', 'review_phase', 'second'));

  renderHook(() => useSupportProcessPoller());

  await vi.advanceTimersByTimeAsync(1100);
  expect(store.setSupportErrand).toHaveBeenCalled();
  expect(store.setProcessSignal).not.toHaveBeenCalled();

  vi.mocked(getSupportErrandProcessState).mockImplementation(async () =>
    stateOf('WAITING', 'investigation_phase', 'third')
  );

  await vi.advanceTimersByTimeAsync(1100);
  expect(store.setProcessSignal).toHaveBeenCalledWith(undefined);
});

test('an errand that is never going to have a process is read once and then let be', async () => {
  store.supportErrand = errandWith(undefined);
  vi.mocked(getSupportErrandProcessState).mockImplementation(
    async () => ({ process: undefined, startability: 'ERRAND_DRAFT' } as never)
  );

  renderHook(() => useSupportProcessPoller());

  await vi.advanceTimersByTimeAsync(2100);
  expect(processReads()).toBe(1);

  await vi.advanceTimersByTimeAsync(120000);
  expect(processReads()).toBe(1);
});

test('an errand whose process is on its way is kept under watch', async () => {
  store.supportErrand = errandWith(undefined);
  vi.mocked(getSupportErrandProcessState).mockImplementation(
    async () => ({ process: undefined, startability: 'START_PENDING' } as never)
  );

  renderHook(() => useSupportProcessPoller());

  await vi.advanceTimersByTimeAsync(10000);
  expect(processReads()).toBeGreaterThan(1);
});

test('a process that has settled is not read at all', async () => {
  store.supportErrand = errandWith('WAITING');
  renderHook(() => useSupportProcessPoller());

  await vi.advanceTimersByTimeAsync(60000);
  expect(processReads()).toBe(0);
});

test('the errand the watching writes does not start the watching over', async () => {
  const { rerender } = renderHook(() => useSupportProcessPoller());

  await vi.advanceTimersByTimeAsync(2000);
  expect(processReads()).toBe(1);

  store.supportErrand = { ...errandWith('RUNNING'), modified: '2026-10-02T08:00:03Z' };
  rerender();

  await vi.advanceTimersByTimeAsync(1900);
  expect(processReads()).toBe(1);
});

test('a read that fails leaves the errand alone and does not stop the watching', async () => {
  vi.mocked(getSupportErrandProcessState).mockRejectedValue(new Error('nere'));
  renderHook(() => useSupportProcessPoller());

  await vi.advanceTimersByTimeAsync(2000);
  expect(store.setSupportErrand).not.toHaveBeenCalled();

  await vi.advanceTimersByTimeAsync(3200);
  expect(processReads()).toBe(2);
});

test('an errand written while it still has no process is looked at again', async () => {
  store.supportErrand = errandWith(undefined);
  vi.mocked(getSupportErrandProcessState).mockImplementation(
    async () => ({ process: undefined, startability: 'ERRAND_DRAFT' } as never)
  );

  const { rerender } = renderHook(() => useSupportProcessPoller());

  await vi.advanceTimersByTimeAsync(2100);
  expect(processReads()).toBe(1);

  store.supportErrand = { ...errandWith(undefined), modified: '2026-10-02T08:00:09Z' };
  rerender();

  await vi.advanceTimersByTimeAsync(2100);
  expect(processReads()).toBe(2);
});
