import type { ErrandProcess, ProcessActivity } from '@common/data-contracts/supportmanagement/data-contracts';

import { supportProcessActivityKey, supportProcessStepKeyOfGate } from './support-process-service';

export interface SupportProcessMessage {
  key: string;
  values?: Record<string, string>;
  stepKey?: string;
  activityKey?: string;
  detail?: string;
}

const CONCURRENT_TASKS = 'CONCURRENT_EXTERNAL_TASKS';
const CANCELLATION = 'process_cancelled';
const MISSING_ROLE = /has no stakeholder with role '([^']+)'/;
const SIGNAL_SENDER = /sent by (\S+)/;
const HTTP_STATUS = /^\d{3}$/;
const REFUSAL = ' error: {status=';

const roleTheErrandLacks = (message: string): string | undefined => MISSING_ROLE.exec(message)?.[1];

const serviceThatRefused = (message: string): { service: string; status: string } | undefined => {
  const [refusedBy, refusal] = message.split(REFUSAL);
  if (!refusal) return undefined;

  const service = refusedBy.trim().split(' ').pop();
  const status = refusal.slice(0, 3);

  return service && HTTP_STATUS.test(status) ? { service, status } : undefined;
};

const senderOfSignal = (message: string): string | undefined => SIGNAL_SENDER.exec(message)?.[1];

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

  const refused = serviceThatRefused(error.message ?? '');
  if (refused) {
    return { key: 'common:process.trouble.upstream_refused', values: refused, detail };
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

    if (activity.activityId === CANCELLATION) {
      if (by) return { key: 'common:process.log.cancelled_by', values: { by }, detail };
      return { key: 'common:process.log.cancelled', detail };
    }

    const stepKey = supportProcessStepKeyOfGate(activity.activityId);

    if (stepKey && by) return { key: 'common:process.log.step_taken_by', values: { by }, stepKey, detail };
    if (stepKey) return { key: 'common:process.log.step_taken', stepKey, detail };
    if (by) return { key: 'common:process.log.stepped_by', values: { by }, detail };
  }

  return {
    key: 'common:process.log.reported',
    activityKey: supportProcessActivityKey(activity.activityId),
    values: { activity: activity.activityName || activity.activityId || '' },
    detail,
  };
};
