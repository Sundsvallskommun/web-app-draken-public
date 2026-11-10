'use client';

import { Badge, Icon, Label, ProgressStepper, Spinner } from '@sk-web-gui/react';
import { useMetadataStore, useSupportStore } from '@stores/index';
import { supportProcessErrorMessage } from '@supportmanagement/services/support-process-messages';
import {
  getSupportErrandProcess,
  isSupportProcessCompleted,
  isSupportProcessFailed,
  supportProcessActivityKey,
  supportProcessName,
  supportProcessShownStepIndex,
  supportProcessStatusKey,
  supportProcessStepKeys,
} from '@supportmanagement/services/support-process-service';
import { CircleAlert, CircleCheck } from 'lucide-react';
import { FC } from 'react';
import { useTranslation } from 'react-i18next';

const ProcessStateIcon: FC<{ failed: boolean; completed: boolean; working: boolean }> = ({
  failed,
  completed,
  working,
}) => {
  if (working) return <Spinner size={2} />;
  if (failed) return <Icon icon={<CircleAlert />} size="1.5rem" />;
  if (completed) return <Icon icon={<CircleCheck />} size="1.5rem" />;
  return <Badge rounded counter={1} color="vattjom" inverted />;
};

/**
 * The activity the process reports, for a step the six-step row does not cover. The model's own
 * identifier is kept as the title: it is what the team that owns the process goes by, and it stays
 * readable even when the activity is one the translations do not name.
 */
const CurrentActivity: FC<{
  failed: boolean;
  completed: boolean;
  working: boolean;
  label: string;
  activityId?: string;
}> = ({ failed, completed, working, label, activityId }) => (
  <>
    <ProcessStateIcon failed={failed} completed={completed} working={working} />
    {label ? (
      <span className="font-bold" title={activityId} data-cy="process-activity">
        {label}
      </span>
    ) : null}
  </>
);

export const SupportProcessRow: FC<{ working: boolean }> = ({ working }) => {
  const { t } = useTranslation();
  const supportErrand = useSupportStore((s) => s.supportErrand);
  const supportMetadata = useMetadataStore((s) => s.supportMetadata);
  const process = getSupportErrandProcess(supportErrand);

  if (!process) return null;

  const failed = isSupportProcessFailed(process);
  const completed = isSupportProcessCompleted(process);
  const stepIndex = supportProcessShownStepIndex(process);
  const errorMessage = supportProcessErrorMessage(process);
  const statusKey = supportProcessStatusKey(process.processStatus);
  const steps = supportProcessStepKeys().map((key) => t(key));
  const activityKey = supportProcessActivityKey(process.currentActivityId);
  const activityLabel = activityKey
    ? t(activityKey)
    : supportProcessName(process.processKey, supportMetadata) || t('common:process.activities.unknown');
  // A step counts as done when it comes before the current one, so a finished process is one step
  // past the last: then every step, the last one included, is ticked off.
  const currentStep = completed ? steps.length : stepIndex;

  return (
    <div
      className="flex items-center gap-12 rounded-xl border-1 h-[40px] w-fit px-12 whitespace-nowrap"
      data-cy="process-row"
    >
      {stepIndex >= 0 ? (
        <ProgressStepper
          steps={steps}
          current={currentStep}
          labelPosition="right"
          size="sm"
          data-cy="process-stepper"
        />
      ) : (
        <CurrentActivity
          failed={failed}
          completed={completed}
          working={working}
          label={activityLabel}
          activityId={process.currentActivityId}
        />
      )}
      <Label rounded color={completed ? 'gronsta' : 'tertiary'} inverted={!failed}>
        {working ? <Spinner size={1} className="mr-8" aria-hidden="true" /> : null}
        {t(statusKey, { defaultValue: process.processStatus })}
      </Label>
      {failed && errorMessage ? (
        <span className="text-small text-dark-secondary" title={errorMessage.detail} data-cy="process-error">
          {t(errorMessage.key, errorMessage.values)}
        </span>
      ) : null}
    </div>
  );
};
