import { appConfig } from '@config/appconfig';
import { useConfigStore, useSupportStore } from '@stores/index';
import { getSupportErrandById } from '@supportmanagement/services/support-errand-service';
import {
  getSupportErrandProcess,
  getSupportErrandProcessState,
  isSupportProcessCompleted,
  isSupportProcessFailed,
  isSupportProcessWorking,
  supportProcessIsOnItsWay,
} from '@supportmanagement/services/support-process-service';
import { useEffect } from 'react';

const FIRST_POLL_DELAY = 2000;
const POLL_BACKOFF = 1.6;
const LONGEST_POLL_DELAY = 20000;
const POLL_WINDOW = 120000;

const POLL_DELAY_AFTER_A_SIGNAL = 1000;
const CLOSE_READING_AFTER_A_SIGNAL = 20000;

export const useSupportProcessPoller = (): boolean => {
  const supportErrand = useSupportStore((s) => s.supportErrand);
  const setSupportErrand = useSupportStore((s) => s.setSupportErrand);
  const processSignal = useSupportStore((s) => s.processSignal);
  const setProcessSignal = useSupportStore((s) => s.setProcessSignal);
  const municipalityId = useConfigStore((s) => s.municipalityId);

  const errandId = supportErrand?.id;
  const process = getSupportErrandProcess(supportErrand);
  const working = isSupportProcessWorking(process);
  const noProcessYet = appConfig.features.useProcess && !process;
  const signalledAt = processSignal?.errandId && processSignal.errandId === errandId ? processSignal.at : undefined;
  const watching = working || noProcessYet || !!signalledAt;

  const watchedModified = process?.modified;
  const signalledActivity = process?.currentActivityId;
  const errandWrittenWithoutAProcess = noProcessYet ? supportErrand?.modified : undefined;

  useEffect(() => {
    if (!errandId || !watching) return undefined;

    let stopped = false;
    let delay = signalledAt ? POLL_DELAY_AFTER_A_SIGNAL : FIRST_POLL_DELAY;
    let timer: ReturnType<typeof setTimeout>;
    let standing = watchedModified;
    const startedAt = Date.now();
    const until = startedAt + POLL_WINDOW;

    const letGoOfTheSignal = () => {
      if (signalledAt) setProcessSignal(undefined);
    };

    const nextDelay = () => {
      const closely = signalledAt && Date.now() - startedAt < CLOSE_READING_AFTER_A_SIGNAL;
      return closely ? POLL_DELAY_AFTER_A_SIGNAL : Math.min(delay * POLL_BACKOFF, LONGEST_POLL_DELAY);
    };

    const read = async () => {
      const state = await getSupportErrandProcessState(errandId, municipalityId).catch(() => undefined);
      if (stopped) return;

      if (state?.process && state.process.modified !== standing) {
        standing = state.process.modified;

        const { errand } = await getSupportErrandById(errandId, municipalityId).catch(() => ({ errand: undefined }));
        if (stopped) return;
        if (errand) setSupportErrand(errand);

        const hasLeftTheActivity =
          state.process.currentActivityId !== signalledActivity ||
          isSupportProcessCompleted(state.process) ||
          isSupportProcessFailed(state.process);

        if (signalledAt && hasLeftTheActivity) {
          setProcessSignal(undefined);
          return;
        }
      }

      if (stopped) return;

      if (state && !state.process && !supportProcessIsOnItsWay(state.startability)) {
        letGoOfTheSignal();
        return;
      }

      delay = nextDelay();
      if (Date.now() + delay < until) {
        timer = setTimeout(read, delay);
        return;
      }

      letGoOfTheSignal();
    };

    timer = setTimeout(read, delay);

    return () => {
      stopped = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    errandId,
    municipalityId,
    watching,
    signalledAt,
    errandWrittenWithoutAProcess,
    setSupportErrand,
    setProcessSignal,
  ]);

  return working || !!signalledAt;
};
