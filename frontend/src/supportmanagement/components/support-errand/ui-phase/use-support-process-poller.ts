import { useConfigStore, useSupportStore } from '@stores/index';
import { getSupportErrandById } from '@supportmanagement/services/support-errand-service';
import { getSupportErrandProcess, isSupportProcessWorking } from '@supportmanagement/services/support-process-service';
import { useEffect } from 'react';

const POLL_INTERVAL = 3000;
const POLL_ATTEMPTS = 40;

export const useSupportProcessPoller = (): boolean => {
  const supportErrand = useSupportStore((s) => s.supportErrand);
  const setSupportErrand = useSupportStore((s) => s.setSupportErrand);
  const municipalityId = useConfigStore((s) => s.municipalityId);

  const errandId = supportErrand?.id;
  const working = isSupportProcessWorking(getSupportErrandProcess(supportErrand));

  useEffect(() => {
    if (!errandId || !working) return undefined;

    let stopped = false;
    let attempts = 0;
    let timer: ReturnType<typeof setTimeout>;

    const read = async () => {
      attempts += 1;
      const { errand } = await getSupportErrandById(errandId, municipalityId).catch(() => ({ errand: undefined }));
      if (stopped) return;
      if (errand) setSupportErrand(errand);
      if (attempts < POLL_ATTEMPTS) timer = setTimeout(read, POLL_INTERVAL);
    };

    timer = setTimeout(read, POLL_INTERVAL);

    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [errandId, municipalityId, working, setSupportErrand]);

  return working;
};
