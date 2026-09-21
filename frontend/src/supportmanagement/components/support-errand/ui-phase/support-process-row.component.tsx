'use client';

import { Badge, Icon, Label, ProgressStepper } from '@sk-web-gui/react';
import { useSupportStore } from '@stores/index';
import {
  getSupportErrandProcess,
  isSupportProcessCompleted,
  isSupportProcessFailed,
  supportProcessErrorText,
  supportProcessStatusKey,
  supportProcessStepIndex,
  supportProcessStepKeys,
  supportProcessStepLabel,
} from '@supportmanagement/services/support-process-service';
import { CircleAlert, CircleCheck } from 'lucide-react';
import { FC } from 'react';
import { useTranslation } from 'react-i18next';

const ProcessStateIcon: FC<{ failed: boolean; completed: boolean }> = ({ failed, completed }) => {
  if (failed) return <Icon icon={<CircleAlert />} size="1.5rem" />;
  if (completed) return <Icon icon={<CircleCheck />} size="1.5rem" />;
  return <Badge rounded counter={1} color="vattjom" inverted />;
};

/** The activity the process reports, for a step the six-step row does not cover. */
const CurrentActivity: FC<{ failed: boolean; completed: boolean; label: string }> = ({ failed, completed, label }) => (
  <>
    <ProcessStateIcon failed={failed} completed={completed} />
    {label ? <span className="font-bold">{label}</span> : null}
  </>
);

export const SupportProcessRow = () => {
  const { t } = useTranslation();
  const supportErrand = useSupportStore((s) => s.supportErrand);
  const process = getSupportErrandProcess(supportErrand);

  if (!process) return null;

  const failed = isSupportProcessFailed(process);
  const completed = isSupportProcessCompleted(process);
  const stepIndex = supportProcessStepIndex(process);
  const errorText = supportProcessErrorText(process);
  const statusKey = supportProcessStatusKey(process.processStatus);

  return (
    <div
      className="flex items-center gap-12 rounded-xl border-1 h-[40px] w-fit px-12 whitespace-nowrap"
      data-cy="process-row"
    >
      {stepIndex >= 0 ? (
        <ProgressStepper
          steps={supportProcessStepKeys().map((key) => t(key))}
          current={stepIndex}
          labelPosition="right"
          size="sm"
          data-cy="process-stepper"
        />
      ) : (
        <CurrentActivity failed={failed} completed={completed} label={supportProcessStepLabel(process)} />
      )}
      <Label rounded color={completed ? 'gronsta' : 'tertiary'} inverted={!failed}>
        {t(statusKey, { defaultValue: process.processStatus })}
      </Label>
      {failed && errorText ? (
        <span className="text-small text-dark-secondary" data-cy="process-error">
          {errorText}
        </span>
      ) : null}
    </div>
  );
};
