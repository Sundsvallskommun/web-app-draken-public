import type { IErrand } from '@casedata/interfaces/errand';
import { UiPhase } from '@casedata/interfaces/errand-phase';
import { getErrand, validateStakeholdersForDecision } from '@casedata/services/casedata-errand-service';
import { apiService } from '@common/services/api-service';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import {
  DISPLAY_PHASE_POLL_INTERVAL_MS,
  DISPLAY_PHASE_POLL_TIMEOUT_MS,
  MAX_LOST_COMPLETE_RESENDS,
  startDisplayPhasePolling,
} from './display-phase-polling-service';

vi.mock('@common/services/api-service', () => ({ apiService: { patch: vi.fn() } }));
vi.mock('@casedata/services/casedata-errand-service', () => ({
  getErrand: vi.fn(),
  validateStakeholdersForDecision: vi.fn(),
}));

const errandIn = (displayPhase: UiPhase, phaseAction: string, overrides: Partial<IErrand> = {}) =>
  ({
    id: 42,
    administrator: { adAccount: 'handler' },
    stakeholders: [],
    extraParameters: [
      { key: 'process.displayPhase', values: [displayPhase] },
      { key: 'process.phaseAction', values: [phaseAction] },
    ],
    ...overrides,
  } as unknown as IErrand);

const lostCompleteErrand = errandIn(UiPhase.registrerad, 'UNKNOWN');

const givenFetchedErrand = (errand: IErrand) => vi.mocked(getErrand).mockResolvedValue({ errand });

const givenOwnerPresent = (present: boolean) =>
  vi.mocked(validateStakeholdersForDecision).mockReturnValue({ valid: present, reason: '' });

const onPollingFinished = vi.fn();

const startPolling = (resendLostComplete: boolean, errand: IErrand = lostCompleteErrand) =>
  startDisplayPhasePolling({
    municipalityId: '2281',
    errand,
    onErrandFetched: vi.fn(),
    onPollingFinished,
    resendLostComplete,
  });

const resentCompletes = () => vi.mocked(apiService.patch).mock.calls;

beforeEach(() => {
  vi.useFakeTimers();
  onPollingFinished.mockReset();
  vi.mocked(getErrand).mockReset();
  vi.mocked(apiService.patch)
    .mockReset()
    .mockResolvedValue({} as never);
  givenOwnerPresent(true);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('startDisplayPhasePolling', () => {
  test('resends COMPLETE, at most twice, while the process keeps discarding it', async () => {
    givenFetchedErrand(lostCompleteErrand);

    startPolling(true);
    await vi.advanceTimersByTimeAsync(DISPLAY_PHASE_POLL_TIMEOUT_MS);

    expect(resentCompletes()).toHaveLength(MAX_LOST_COMPLETE_RESENDS);
    expect(resentCompletes()[0]).toEqual([
      'casedata/2281/errands/42/extraparameters/process',
      [{ key: 'process.phaseAction', values: ['COMPLETE'] }],
    ]);
  });

  test('stops without resending once the process has moved the errand on', async () => {
    givenFetchedErrand(errandIn(UiPhase.granskning, 'UNKNOWN'));

    startPolling(true);
    await vi.advanceTimersByTimeAsync(DISPLAY_PHASE_POLL_TIMEOUT_MS);

    expect(getErrand).toHaveBeenCalledTimes(1);
    expect(resentCompletes()).toHaveLength(0);
  });

  test.each([
    ['the process has not handled COMPLETE yet', errandIn(UiPhase.registrerad, 'COMPLETE'), true],
    ['the errand has no administrator', errandIn(UiPhase.registrerad, 'UNKNOWN', { administrator: undefined }), true],
    ['the errand has no ärendeägare', lostCompleteErrand, false],
  ])('does not resend COMPLETE when %s', async (_reason, fetchedErrand, ownerPresent) => {
    givenFetchedErrand(fetchedErrand);
    givenOwnerPresent(ownerPresent);

    startPolling(true);
    await vi.advanceTimersByTimeAsync(DISPLAY_PHASE_POLL_TIMEOUT_MS);

    expect(resentCompletes()).toHaveLength(0);
  });

  test('does not resend COMPLETE unless the caller has saved one', async () => {
    givenFetchedErrand(lostCompleteErrand);

    startPolling(false);
    await vi.advanceTimersByTimeAsync(DISPLAY_PHASE_POLL_TIMEOUT_MS);

    expect(resentCompletes()).toHaveLength(0);
  });

  test('keeps polling until the timeout and then reports that it is done', async () => {
    givenFetchedErrand(lostCompleteErrand);

    startPolling(false);
    await vi.advanceTimersByTimeAsync(DISPLAY_PHASE_POLL_TIMEOUT_MS - DISPLAY_PHASE_POLL_INTERVAL_MS);
    expect(onPollingFinished).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(DISPLAY_PHASE_POLL_TIMEOUT_MS);

    expect(getErrand).toHaveBeenCalledTimes(DISPLAY_PHASE_POLL_TIMEOUT_MS / DISPLAY_PHASE_POLL_INTERVAL_MS);
    expect(onPollingFinished).toHaveBeenCalledTimes(1);
  });

  test('reports that it is done as soon as the process has moved the errand on', async () => {
    givenFetchedErrand(errandIn(UiPhase.granskning, 'UNKNOWN'));

    startPolling(true);
    await vi.advanceTimersByTimeAsync(DISPLAY_PHASE_POLL_INTERVAL_MS);

    expect(onPollingFinished).toHaveBeenCalledTimes(1);
  });

  test('stops without reporting when the returned function is called', async () => {
    givenFetchedErrand(lostCompleteErrand);

    const stopPolling = startPolling(true);
    await vi.advanceTimersByTimeAsync(DISPLAY_PHASE_POLL_INTERVAL_MS);
    stopPolling();
    await vi.advanceTimersByTimeAsync(DISPLAY_PHASE_POLL_TIMEOUT_MS);

    expect(getErrand).toHaveBeenCalledTimes(1);
    expect(resentCompletes()).toHaveLength(1);
    expect(onPollingFinished).not.toHaveBeenCalled();
  });

  test('does not poll an errand that has already left Registrerad', async () => {
    startPolling(true, errandIn(UiPhase.utredning, 'UNKNOWN'));
    await vi.advanceTimersByTimeAsync(DISPLAY_PHASE_POLL_TIMEOUT_MS);

    expect(getErrand).not.toHaveBeenCalled();
    expect(onPollingFinished).toHaveBeenCalledTimes(1);
  });
});
