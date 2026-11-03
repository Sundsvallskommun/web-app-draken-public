import { startDisplayPhasePolling } from '@casedata/services/display-phase-polling-service';
import { useCasedataStore, useConfigStore } from '@stores/index';
import { useEffect, useRef } from 'react';

function useDisplayPhasePoller() {
  const municipalityId = useConfigStore((s) => s.municipalityId);
  const errand = useCasedataStore((s) => s.errand);
  const setErrand = useCasedataStore((s) => s.setErrand);
  const stopPolling = useRef<() => void>(() => {});

  // A response that arrives after leaving the errand must not overwrite whatever errand is shown next.
  useEffect(() => () => stopPolling.current(), []);

  const pollDisplayPhase = (options?: { resendLostComplete?: boolean; onPollingFinished?: () => void }) => {
    if (!errand) return;
    stopPolling.current();
    stopPolling.current = startDisplayPhasePolling({
      municipalityId,
      errand,
      onErrandFetched: setErrand,
      onPollingFinished: options?.onPollingFinished,
      resendLostComplete: options?.resendLostComplete,
    });
  };

  return {
    pollDisplayPhase,
  };
}

export default useDisplayPhasePoller;
