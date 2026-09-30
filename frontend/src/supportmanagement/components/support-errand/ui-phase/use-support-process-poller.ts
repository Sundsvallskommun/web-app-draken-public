import { appConfig } from '@config/appconfig';
import { useConfigStore, useSupportStore } from '@stores/index';
import { getSupportErrandById } from '@supportmanagement/services/support-errand-service';
import { getSupportErrandProcess, isSupportProcessWorking } from '@supportmanagement/services/support-process-service';
import { useEffect } from 'react';

const POLL_INTERVAL = 3000;
const POLL_ATTEMPTS_WHILE_WORKING = 40;
const POLL_ATTEMPTS_WHILE_STARTING = 10;

export const useSupportProcessPoller = (): boolean => {
  const supportErrand = useSupportStore((s) => s.supportErrand);
  const setSupportErrand = useSupportStore((s) => s.setSupportErrand);
  const municipalityId = useConfigStore((s) => s.municipalityId);

  const errandId = supportErrand?.id;
  const process = getSupportErrandProcess(supportErrand);
  const working = isSupportProcessWorking(process);
  const starting = appConfig.features.useProcess && !process;
  const attempts = working ? POLL_ATTEMPTS_WHILE_WORKING : POLL_ATTEMPTS_WHILE_STARTING;

  useEffect(() => {
    if (!errandId || (!working && !starting)) return undefined;

    let stopped = false;
    let attempt = 0;
    let timer: ReturnType<typeof setTimeout>;

    const read = async () => {
      attempt += 1;
      const { errand } = await getSupportErrandById(errandId, municipalityId).catch(() => ({ errand: undefined }));
      if (stopped) return;
      if (errand) setSupportErrand(errand);
      if (attempt < attempts) timer = setTimeout(read, POLL_INTERVAL);
    };

    timer = setTimeout(read, POLL_INTERVAL);

    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [errandId, municipalityId, working, starting, attempts, setSupportErrand]);

  return working;
};
