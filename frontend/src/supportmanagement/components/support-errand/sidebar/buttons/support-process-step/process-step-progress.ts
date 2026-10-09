import { getSupportErrandById, SupportErrand } from '@supportmanagement/services/support-errand-service';
import {
  getSupportErrandProcessState,
  isSupportProcessCompleted,
  SupportProcessStepName,
  supportProcessStepName,
} from '@supportmanagement/services/support-process-service';

const FIRST_REPORT_DELAY = 300;
const REPORT_BACKOFF = 1.8;
const LONGEST_REPORT_DELAY = 2500;
const SIGNAL_REPORT_WINDOW = 30000;

const waitFor = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

/**
 * The errand as it stands once the process has left the step behind, or nothing if it stays put for
 * the whole window. The process answers in its own time, so it is asked again with a growing pause.
 */
export const errandOnNextStep = async (
  errandId: string,
  municipalityId: string,
  leaving: SupportProcessStepName | undefined
): Promise<SupportErrand | undefined> => {
  const until = Date.now() + SIGNAL_REPORT_WINDOW;
  let delay = FIRST_REPORT_DELAY;

  while (Date.now() < until) {
    const state = await getSupportErrandProcessState(errandId, municipalityId).catch(() => undefined);
    const process = state?.process;

    if (process && (isSupportProcessCompleted(process) || supportProcessStepName(process) !== leaving)) {
      return (await getSupportErrandById(errandId, municipalityId).catch(() => ({ errand: undefined }))).errand;
    }

    await waitFor(delay);
    delay = Math.min(delay * REPORT_BACKOFF, LONGEST_REPORT_DELAY);
  }
  return undefined;
};
