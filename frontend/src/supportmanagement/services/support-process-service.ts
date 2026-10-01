import type {
  ErrandProcess,
  Label,
  PageProcessActivity,
  ProcessActivity,
  ProcessSignal,
} from '@common/data-contracts/supportmanagement/data-contracts';
import { apiService } from '@common/services/api-service';

import { SupportErrand } from './support-errand-service';
import type { SupportMetadata } from './support-metadata-service';

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

export const getSupportErrandProcess = (errand: SupportErrand | undefined): ErrandProcess | undefined =>
  errand?.process;

export const hasSupportErrandProcess = (errand: SupportErrand | undefined): boolean =>
  Boolean(getSupportErrandProcess(errand)?.processStatus);

/**
 * Support Management carries the process status as a string rather than an enum, so that a value
 * added later does not break a client generated from the schema. A value the translations do not
 * cover is handed back as it stands instead of being treated as an error.
 */
export const supportProcessStatusKey = (status: string | undefined): string =>
  status ? PROCESS_STATUS_KEYS[status] ?? status : '';

export const isSupportProcessFailed = (process: ErrandProcess | undefined): boolean =>
  process?.processStatus === SupportProcessStatus.FAILED;

export const isSupportProcessCompleted = (process: ErrandProcess | undefined): boolean =>
  process?.processStatus === SupportProcessStatus.COMPLETED;

export const isSupportProcessWorking = (process: ErrandProcess | undefined): boolean =>
  process?.processStatus === SupportProcessStatus.RUNNING || process?.processStatus === SupportProcessStatus.RETRYING;

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

const SUPPORT_PROCESS_STEPS: {
  name: SupportProcessStepName;
  translationKey: string;
  activityIds: string[];
  gate: string;
}[] = [
  {
    name: SupportProcessStep.REGISTRATION,
    translationKey: 'common:process.steps.registration',
    activityIds: ['registration_phase', 'register_phase'],
    gate: 'registration_completed',
  },
  {
    name: SupportProcessStep.REVIEW,
    translationKey: 'common:process.steps.review',
    activityIds: ['review_phase'],
    gate: 'review_completed',
  },
  {
    name: SupportProcessStep.INVESTIGATION,
    translationKey: 'common:process.steps.investigation',
    activityIds: ['investigation_phase'],
    gate: 'investigation_completed',
  },
  {
    name: SupportProcessStep.DECISION,
    translationKey: 'common:process.steps.decision',
    activityIds: ['decision_phase'],
    gate: 'decision_completed',
  },
  {
    name: SupportProcessStep.FOLLOW_UP,
    translationKey: 'common:process.steps.follow_up',
    activityIds: ['follow_up_phase'],
    gate: 'follow_up_completed',
  },
  {
    name: SupportProcessStep.CLOSING,
    translationKey: 'common:process.steps.closing',
    activityIds: ['closure_phase', 'closing_phase', 'complete_phase'],
    gate: 'closure_completed',
  },
];

export const supportProcessStepKeys = (): string[] => SUPPORT_PROCESS_STEPS.map((step) => step.translationKey);

const EXTERNAL_TASK_KEYS: Record<string, string> = {
  external_task_create_decision: 'common:process.activities.create_decision',
  external_task_check_decision: 'common:process.activities.check_decision',
  external_task_create_asset: 'common:process.activities.create_asset',
  external_task_complete_process: 'common:process.activities.complete_process',
  external_task_cancel_process: 'common:process.activities.cancel_process',
};

const ACTIVITY_KEYS = new Map<string, string>([
  ...SUPPORT_PROCESS_STEPS.flatMap((step) => step.activityIds.map((id) => [id, step.translationKey] as const)),
  ...Object.entries(EXTERNAL_TASK_KEYS),
]);

export const supportProcessActivityKey = (activityId: string | undefined): string | undefined =>
  activityId ? ACTIVITY_KEYS.get(activityId) : undefined;

const PROCESS_KEY_ATTRIBUTE = 'processKey';

const labelWithItsOwn = (label: Label): Label[] => [label, ...(label.labels ?? []).flatMap(labelWithItsOwn)];

const startsProcess = (label: Label, processKey: string): boolean =>
  label.attributes?.some((attribute) => attribute.key === PROCESS_KEY_ATTRIBUTE && attribute.value === processKey) ===
  true;

export const supportProcessName = (processKey: string | undefined, metadata: SupportMetadata | undefined): string => {
  if (!processKey) return '';

  const labels = (metadata?.labels?.labelStructure ?? []).flatMap(labelWithItsOwn);
  return labels.find((label) => startsProcess(label, processKey))?.displayName ?? '';
};

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

/** The step the process stands in, or undefined for an activity the mapping does not know. */
export const supportProcessStepName = (process: ErrandProcess | undefined): SupportProcessStepName | undefined =>
  SUPPORT_PROCESS_STEPS[supportProcessStepIndex(process)]?.name;

const PHASE_OF_EXTERNAL_TASK: Record<string, SupportProcessStepName> = {
  external_task_create_decision: SupportProcessStep.DECISION,
  external_task_check_decision: SupportProcessStep.DECISION,
  external_task_create_asset: SupportProcessStep.DECISION,
  external_task_complete_process: SupportProcessStep.CLOSING,
};

export const supportProcessPhaseKey = (process: ErrandProcess | undefined): string | undefined => {
  const stepKey = supportProcessStepKeys()[supportProcessStepIndex(process)];
  if (stepKey) return stepKey;

  const phase = process?.currentActivityId ? PHASE_OF_EXTERNAL_TASK[process.currentActivityId] : undefined;
  return SUPPORT_PROCESS_STEPS.find((step) => step.name === phase)?.translationKey;
};

export const getSupportProcessActivities = (errandId: string, municipalityId: string): Promise<ProcessActivity[]> =>
  apiService
    .get<PageProcessActivity>(`supportprocess/${municipalityId}/${errandId}/activities`)
    .then((res) => res.data.content ?? [])
    .catch((e) => {
      console.error('Something went wrong when fetching process activities');
      throw e;
    });

export const supportProcessStepKeyOfGate = (gate: string | undefined): string | undefined =>
  SUPPORT_PROCESS_STEPS.find((candidate) => candidate.gate === gate)?.translationKey;

const gateOfSupportProcessStep = (step: SupportProcessStepName): string | undefined =>
  SUPPORT_PROCESS_STEPS.find((candidate) => candidate.name === step)?.gate;

const gateHasBeenSent = (gate: string | undefined, activities: ProcessActivity[]): boolean =>
  !!gate && activities.some((activity) => activity.activityId === gate);

export const hasVisitedSupportProcessStep = (
  step: SupportProcessStepName,
  process: ErrandProcess | undefined,
  activities: ProcessActivity[]
): boolean =>
  Boolean(process) &&
  (supportProcessStepName(process) === step || gateHasBeenSent(gateOfSupportProcessStep(step), activities));

/**
 * What the process waits for from the handler right now. The names come from the process model and
 * are relayed as they are, so a gate added to the model shows up here without a change in Draken.
 */
const supportProcessAwaitingSignals = (process: ErrandProcess | undefined): ProcessSignal[] =>
  process?.awaitingSignals ?? [];

export const awaitedGateOfStep = (
  process: ErrandProcess | undefined,
  step: SupportProcessStepName | undefined
): ProcessSignal | undefined => {
  const gate = step && gateOfSupportProcessStep(step);
  return supportProcessAwaitingSignals(process).find((signal) => signal.name === gate);
};

export const sendSupportProcessSignal = (errandId: string, municipalityId: string, signal: string): Promise<void> =>
  apiService
    .post<void, { signal: string }>(`supportprocess/${municipalityId}/${errandId}/signals`, { signal })
    .then(() => undefined)
    .catch((e) => {
      console.error('Something went wrong when stepping the process');
      throw e;
    });

/** A signal the process no longer waits for: the button is stale and the errand has to be read again. */
export const isSupportProcessSignalStale = (error: unknown): boolean =>
  (error as { response?: { status?: number } })?.response?.status === 409;
