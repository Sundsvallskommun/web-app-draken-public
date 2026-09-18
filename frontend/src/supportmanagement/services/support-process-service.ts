import type {
  ErrandProcess,
  PageProcessActivity,
  ProcessActivity,
} from '@common/data-contracts/supportmanagement/data-contracts';
import { apiService } from '@common/services/api-service';

import { SupportErrand } from './support-errand-service';

const SupportProcessStatus = {
  RUNNING: 'RUNNING',
  WAITING: 'WAITING',
  RETRYING: 'RETRYING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
} as const;

const PROCESS_STATUS_LABELS: Record<string, string> = {
  [SupportProcessStatus.RUNNING]: 'Processen arbetar',
  [SupportProcessStatus.WAITING]: 'Väntar',
  [SupportProcessStatus.RETRYING]: 'Försöker igen',
  [SupportProcessStatus.COMPLETED]: 'Processen är avslutad',
  [SupportProcessStatus.FAILED]: 'Processen misslyckades',
};

export const getSupportErrandProcess = (errand: SupportErrand | undefined): ErrandProcess | undefined => errand?.process;

export const hasSupportErrandProcess = (errand: SupportErrand | undefined): boolean =>
  Boolean(getSupportErrandProcess(errand)?.processStatus);

/**
 * Support Management carries the process status as a string rather than an enum, so that a value
 * added later does not break a client generated from the schema. An unknown value is shown as it
 * stands instead of being treated as an error.
 */
export const supportProcessStatusLabel = (status: string | undefined): string =>
  status ? (PROCESS_STATUS_LABELS[status] ?? status) : '';

export const isSupportProcessFailed = (process: ErrandProcess | undefined): boolean =>
  process?.processStatus === SupportProcessStatus.FAILED;

export const isSupportProcessCompleted = (process: ErrandProcess | undefined): boolean =>
  process?.processStatus === SupportProcessStatus.COMPLETED;

/**
 * The step the process is at, named as the process model names it. A step the model has not named
 * falls back to the process itself rather than to the model's own identifier, which says nothing to
 * a handler.
 */
export const supportProcessStepLabel = (process: ErrandProcess | undefined): string =>
  process?.currentActivityName || process?.processKey || '';

export const supportProcessErrorText = (process: ErrandProcess | undefined): string => {
  const parts = [process?.error?.code, process?.error?.message].filter(Boolean);
  return parts.join(': ');
};

export const getSupportProcessActivities = (errandId: string, municipalityId: string): Promise<ProcessActivity[]> =>
  apiService
    .get<PageProcessActivity>(`supportprocess/${municipalityId}/${errandId}/activities`)
    .then((res) => res.data.content ?? [])
    .catch((e) => {
      console.error('Something went wrong when fetching process activities');
      throw e;
    });
