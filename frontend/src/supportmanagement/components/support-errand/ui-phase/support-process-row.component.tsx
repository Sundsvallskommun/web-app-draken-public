'use client';

import { Badge, cx, Icon, Label } from '@sk-web-gui/react';
import { useSupportStore } from '@stores/index';
import {
  getSupportErrandProcess,
  isSupportProcessCompleted,
  isSupportProcessFailed,
  supportProcessErrorText,
  supportProcessStatusLabel,
  supportProcessStepLabel,
} from '@supportmanagement/services/support-process-service';
import { CircleAlert, CircleCheck } from 'lucide-react';
import { FC } from 'react';

import { SupportProcessLog } from './support-process-log.component';

const ProcessStateIcon: FC<{ failed: boolean; completed: boolean }> = ({ failed, completed }) => {
  if (failed) return <Icon icon={<CircleAlert />} size="1.5rem" />;
  if (completed) return <Icon icon={<CircleCheck />} size="1.5rem" />;
  return <Badge rounded counter={1} color="vattjom" inverted />;
};

export const SupportProcessRow = () => {
  const supportErrand = useSupportStore((s) => s.supportErrand);
  const process = getSupportErrandProcess(supportErrand);

  if (!process) return null;

  const failed = isSupportProcessFailed(process);
  const completed = isSupportProcessCompleted(process);
  const step = supportProcessStepLabel(process);
  const errorText = supportProcessErrorText(process);

  return (
    <div
      className="flex items-center gap-12 rounded-xl border-1 h-[40px] w-fit px-12 whitespace-nowrap"
      data-cy="process-row"
    >
      <ProcessStateIcon failed={failed} completed={completed} />
      {step ? <span className={cx('font-bold')}>{step}</span> : null}
      <Label rounded color={completed ? 'gronsta' : 'tertiary'} inverted={!failed}>
        {supportProcessStatusLabel(process.processStatus)}
      </Label>
      {failed && errorText ? (
        <span className="text-small text-dark-secondary" data-cy="process-error">
          {errorText}
        </span>
      ) : null}
      <SupportProcessLog />
    </div>
  );
};
