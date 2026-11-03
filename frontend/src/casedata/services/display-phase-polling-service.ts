import { IErrand } from '@casedata/interfaces/errand';
import { UiPhase } from '@casedata/interfaces/errand-phase';
import { getErrand, validateStakeholdersForDecision } from '@casedata/services/casedata-errand-service';
import { getPhaseAction, getUiPhase, triggerErrandPhaseChange } from '@casedata/services/process-service';

export const DISPLAY_PHASE_POLL_INTERVAL_MS = 1000;
export const DISPLAY_PHASE_POLL_TIMEOUT_MS = 30000;
export const MAX_LOST_COMPLETE_RESENDS = 2;

/**
 * Whether the process has thrown away a COMPLETE that was already saved on an errand in Registrerad.
 *
 * The process re-reads the errand on every update and, while it is still waiting, writes phaseAction UNKNOWN
 * back. Setting the administrator wakes it right before COMPLETE is saved, so that write can land after
 * COMPLETE and discard it. A handled COMPLETE never leaves the errand in Registrerad with UNKNOWN, so when the
 * errand has what the process waits for (an administrator, and in PT an ärendeägare) the COMPLETE was lost.
 */
const hasLostPhaseComplete = (errand: IErrand) =>
  getUiPhase(errand) === UiPhase.registrerad &&
  getPhaseAction(errand) === 'UNKNOWN' &&
  !!errand.administrator &&
  validateStakeholdersForDecision(errand).valid;

interface DisplayPhasePollingOptions {
  municipalityId: string;
  errand: IErrand;
  onErrandFetched: (errand: IErrand) => void;
  /** Called once the polling ends by itself: the errand left Registrerad, or the poll timed out. */
  onPollingFinished?: () => void;
  /** Only set once COMPLETE has been saved, otherwise the errand is still UNKNOWN for a legitimate reason. */
  resendLostComplete?: boolean;
}

/**
 * Re-fetches an errand in Registrerad until the process moves it on or the poll times out, resending a lost
 * COMPLETE when asked to. Returns a function that stops the polling.
 */
export const startDisplayPhasePolling = ({
  municipalityId,
  errand,
  onErrandFetched,
  onPollingFinished = () => {},
  resendLostComplete = false,
}: DisplayPhasePollingOptions) => {
  const errandId = errand.id.toString();
  const deadline = Date.now() + DISPLAY_PHASE_POLL_TIMEOUT_MS;
  let resendsLeft = resendLostComplete ? MAX_LOST_COMPLETE_RESENDS : 0;
  let stopped = false;
  let nextPoll: ReturnType<typeof setTimeout> | undefined;

  const scheduleNextPoll = () => {
    if (stopped) return;
    if (Date.now() < deadline) {
      nextPoll = setTimeout(poll, DISPLAY_PHASE_POLL_INTERVAL_MS);
    } else {
      onPollingFinished();
    }
  };

  const poll = async () => {
    try {
      const { errand: latestErrand } = await getErrand(municipalityId, errandId);
      if (stopped) return;
      if (latestErrand) {
        onErrandFetched(latestErrand);
      }
      if (!latestErrand || getUiPhase(latestErrand) !== UiPhase.registrerad) {
        onPollingFinished();
        return;
      }
      if (resendsLeft > 0 && hasLostPhaseComplete(latestErrand)) {
        resendsLeft -= 1;
        await triggerErrandPhaseChange(municipalityId, latestErrand);
      }
    } catch (error) {
      console.error('Something went wrong when polling the display phase', error);
    }
    scheduleNextPoll();
  };

  if (getUiPhase(errand) === UiPhase.registrerad) {
    scheduleNextPoll();
  } else {
    onPollingFinished();
  }

  return () => {
    stopped = true;
    clearTimeout(nextPoll);
  };
};
