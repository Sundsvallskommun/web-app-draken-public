import type { ProcessActivity } from '@common/data-contracts/supportmanagement/data-contracts';
import { expect, test } from 'vitest';

import { supportProcessActivityMessage } from './support-process-messages';

const activity = (fields: Partial<ProcessActivity>): ProcessActivity =>
  ({ activityType: 'TASK', occurredAt: '2026-10-12T08:00:00Z', ...fields } as ProcessActivity);

test('a manual start is told by its type, not by the process key SM puts in the activity id', () => {
  const message = supportProcessActivityMessage(
    activity({
      activityType: 'START',
      activityId: 'internal-inspection',
      message: "start of process 'internal-inspection' requested by and06sod",
    })
  );

  expect(message).toMatchObject({ key: 'common:process.log.started_by', values: { by: 'and06sod' } });
  expect(message.activityKey).toBeUndefined();
});

test('a start nobody is named for is still a start', () => {
  const message = supportProcessActivityMessage(activity({ activityType: 'START', activityId: 'external-inspection' }));

  expect(message.key).toBe('common:process.log.started');
});

test('a signal that takes a step names the step', () => {
  const message = supportProcessActivityMessage(
    activity({
      activityType: 'SIGNAL',
      activityId: 'review_completed',
      message: "signal 'review_completed' sent by abc",
    })
  );

  expect(message).toMatchObject({
    key: 'common:process.log.step_taken_by',
    stepKey: 'common:process.steps.review',
    values: { by: 'abc' },
  });
});
