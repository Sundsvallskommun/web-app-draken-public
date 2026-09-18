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

const PROCESS_STATUS_KEYS: Record<string, string> = {
  [SupportProcessStatus.RUNNING]: 'common:process.status.running',
  [SupportProcessStatus.WAITING]: 'common:process.status.waiting',
  [SupportProcessStatus.RETRYING]: 'common:process.status.retrying',
  [SupportProcessStatus.COMPLETED]: 'common:process.status.completed',
  [SupportProcessStatus.FAILED]: 'common:process.status.failed',
};

export const getSupportErrandProcess = (errand: SupportErrand | undefined): ErrandProcess | undefined => errand?.process;

export const hasSupportErrandProcess = (errand: SupportErrand | undefined): boolean =>
  Boolean(getSupportErrandProcess(errand)?.processStatus);

/**
 * Support Management carries the process status as a string rather than an enum, so that a value
 * added later does not break a client generated from the schema. A value the translations do not
 * cover is handed back as it stands instead of being treated as an error.
 */
export const supportProcessStatusKey = (status: string | undefined): string =>
  status ? (PROCESS_STATUS_KEYS[status] ?? status) : '';

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

/**
 * The steps the AoT process runs, in the order the business describes them. The process model has
 * one subprocess per step and reports the one it is in as `currentActivityId`; until the model can
 * hand over its own step list, the mapping from activity to step lives here.
 */
export const SupportProcessStep = {
  REGISTRATION: 'REGISTRATION',
  REVIEW: 'REVIEW',
  INVESTIGATION: 'INVESTIGATION',
  DECISION: 'DECISION',
  FOLLOW_UP: 'FOLLOW_UP',
  CLOSING: 'CLOSING',
} as const;

export type SupportProcessStepName = (typeof SupportProcessStep)[keyof typeof SupportProcessStep];

const SUPPORT_PROCESS_STEPS: { name: SupportProcessStepName; translationKey: string; activityIds: string[] }[] = [
  {
    name: SupportProcessStep.REGISTRATION,
    translationKey: 'common:process.steps.registration',
    activityIds: ['registration_phase', 'register_phase'],
  },
  { name: SupportProcessStep.REVIEW, translationKey: 'common:process.steps.review', activityIds: ['review_phase'] },
  {
    name: SupportProcessStep.INVESTIGATION,
    translationKey: 'common:process.steps.investigation',
    activityIds: ['investigation_phase'],
  },
  { name: SupportProcessStep.DECISION, translationKey: 'common:process.steps.decision', activityIds: ['decision_phase'] },
  {
    name: SupportProcessStep.FOLLOW_UP,
    translationKey: 'common:process.steps.follow_up',
    activityIds: ['follow_up_phase'],
  },
  {
    name: SupportProcessStep.CLOSING,
    translationKey: 'common:process.steps.closing',
    activityIds: ['closing_phase', 'complete_phase'],
  },
];

export const supportProcessStepKeys = (): string[] => SUPPORT_PROCESS_STEPS.map((step) => step.translationKey);

/**
 * Which of the steps the process is at, or -1 for an activity the mapping does not know. A finished
 * process is at the last step whichever activity it ended on, since its errand is done.
 */
export const supportProcessStepIndex = (process: ErrandProcess | undefined): number => {
  if (!process) return -1;
  if (isSupportProcessCompleted(process)) return SUPPORT_PROCESS_STEPS.length - 1;
  const activityId = process.currentActivityId;
  if (!activityId) return -1;
  return SUPPORT_PROCESS_STEPS.findIndex((step) => step.activityIds.includes(activityId));
};

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

/**
 * Whether the process has reached a step - being in it counts, and so does having passed it. A
 * process the mapping cannot place, and an errand without a process at all, has reached nothing.
 */
export const hasReachedSupportProcessStep = (
  step: SupportProcessStepName,
  process: ErrandProcess | undefined
): boolean => {
  const current = supportProcessStepIndex(process);
  if (current < 0) return false;
  return current >= SUPPORT_PROCESS_STEPS.findIndex((candidate) => candidate.name === step);
};
