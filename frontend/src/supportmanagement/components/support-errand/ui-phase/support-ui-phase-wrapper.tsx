'use client';

import { appConfig } from '@config/appconfig';
import { useSupportStore } from '@stores/index';
import { hasSupportErrandProcess } from '@supportmanagement/services/support-process-service';

import { SupportProcessRow } from './support-process-row.component';

/**
 * Where the errand stands, as the process reports it. An errand without a process - one registered
 * before the process ran, or in a namespace that runs none - has no step of its own, and the row
 * stays away rather than deriving one from the status.
 */
export const SupportUiPhaseWrapper = () => {
  const supportErrand = useSupportStore((s) => s.supportErrand);

  if (!appConfig.features.useProcess || !hasSupportErrandProcess(supportErrand)) {
    return null;
  }

  return <SupportProcessRow />;
};
