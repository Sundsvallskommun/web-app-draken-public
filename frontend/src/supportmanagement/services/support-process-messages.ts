import type { ErrandProcess, ProcessActivity } from '@common/data-contracts/supportmanagement/data-contracts';

import { supportProcessStepKeyOfGate } from './support-process-service';

export interface SupportProcessMessage {
  key: string;
  values?: Record<string, string>;
  stepKey?: string;
  detail?: string;
}

const CONCURRENT_TASKS = 'CONCURRENT_EXTERNAL_TASKS';

const roleTheErrandLacks = (message: string): string | undefined =>
  message.match(/has no stakeholder with role '([^']+)'/)?.[1];

const senderOfSignal = (message: string): string | undefined => message.match(/sent by ([^\s]+)/)?.[1];

const technicalText = (parts: (string | undefined)[]): string | undefined => {
  const detail = parts.filter(Boolean).join(': ');
  return detail || undefined;
};

export const supportProcessErrorMessage = (process: ErrandProcess | undefined): SupportProcessMessage | undefined => {
  const error = process?.error;
  if (!error) return undefined;

  const detail = technicalText([error.code, error.message]);
  const role = roleTheErrandLacks(error.message ?? '');

  if (role) {
    return { key: 'common:process.trouble.missing_stakeholder_role', values: { role }, detail };
  }

  return { key: 'common:process.trouble.unknown', detail };
};

export const supportProcessActivityMessage = (activity: ProcessActivity): SupportProcessMessage => {
  const detail = technicalText([activity.errorCode, activity.message]);

  if (activity.errorCode === CONCURRENT_TASKS) {
    return { key: 'common:process.trouble.concurrent_tasks', detail };
  }

  if (activity.severity === 'ERROR') {
    return { key: 'common:process.trouble.unknown', detail };
  }

  if (activity.activityType === 'SIGNAL') {
    const by = senderOfSignal(activity.message ?? '');
    const stepKey = supportProcessStepKeyOfGate(activity.activityId);

    if (stepKey && by) return { key: 'common:process.log.step_taken_by', values: { by }, stepKey, detail };
    if (stepKey) return { key: 'common:process.log.step_taken', stepKey, detail };
    if (by) return { key: 'common:process.log.stepped_by', values: { by }, detail };
  }

  return {
    key: 'common:process.log.reported',
    values: { activity: activity.activityName || activity.activityId || '' },
    detail,
  };
};
