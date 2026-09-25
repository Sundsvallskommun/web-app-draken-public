import { Button, useConfirm, useSnackbar } from '@sk-web-gui/react';
import { useConfigStore, useSupportStore, useUserStore } from '@stores/index';
import {
  closeSupportErrand,
  getSupportErrandById,
  Resolution,
  setSupportErrandAdmin,
  setSupportErrandStatus,
  Status,
  SupportErrand,
} from '@supportmanagement/services/support-errand-service';
import {
  getSupportErrandProcess,
  isSupportProcessCompleted,
  isSupportProcessSignalStale,
  sendSupportProcessSignal,
  supportProcessAwaitingSignals,
  SupportProcessStep,
  SupportProcessStepName,
  supportProcessStepName,
} from '@supportmanagement/services/support-process-service';
import { ArrowRight } from 'lucide-react';
import { FC, ReactElement, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

interface ProcessAction {
  key: string;
  variant: 'primary' | 'secondary';
  color?: 'vattjom';
  icon?: ReactElement;
  needsSignal: boolean;
  /** Every step is confirmed in a dialog, except starting the handling, which never was. */
  confirms?: boolean;
  /** Takes the errand and sets it ongoing before the signal, the way the handling has always started. */
  takesErrand?: boolean;
  /** The tab whose unsaved work the step leaves behind, if it has one. */
  unsavedTabKey?: string;
  tabKey?: string;
  closesErrand?: boolean;
  resolution?: Resolution;
}

/** Parked, solved and reopened errands are picked up from their own buttons, never started again. */
const RESUMED_ELSEWHERE: string[] = [Status.SUSPENDED, Status.SOLVED, Status.REOPENED];

const SIGNAL_REPORT_ATTEMPTS = 12;
const SIGNAL_REPORT_INTERVAL = 2500;

const waitFor = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

/**
 * The step the errand has moved to, once the process has reported it. Nothing is pushed to Draken, so
 * the errand is read again until the step changes, or until the process reports that it is done -
 * the last step keeps its activity id to the end, so the name alone never says that.
 *
 * A read that fails leaves the errand undefined rather than throwing, so it counts as an attempt
 * and not as a step: a process that is lost sight of must not look like one that moved on.
 */
const errandOnNextStep = async (
  errandId: string,
  municipalityId: string,
  leaving: SupportProcessStepName | undefined
): Promise<SupportErrand | undefined> => {
  for (let attempt = 0; attempt < SIGNAL_REPORT_ATTEMPTS; attempt++) {
    await waitFor(SIGNAL_REPORT_INTERVAL);
    const { errand } = await getSupportErrandById(errandId, municipalityId);
    if (!errand) continue;

    const process = getSupportErrandProcess(errand);
    if (isSupportProcessCompleted(process) || supportProcessStepName(process) !== leaving) return errand;
  }
  return undefined;
};

/**
 * What the handler does to leave a step, in the words of the business. The signal that carries it
 * comes from the process, so a model that renames its gates needs no change here.
 */
const STEP_ACTIONS: Partial<Record<SupportProcessStepName, ProcessAction>> = {
  [SupportProcessStep.REGISTRATION]: {
    key: 'start_handling',
    variant: 'primary',
    color: 'vattjom',
    icon: <ArrowRight size={18} />,
    needsSignal: true,
    confirms: false,
    takesErrand: true,
  },
  [SupportProcessStep.REVIEW]: {
    key: 'start_investigation',
    variant: 'primary',
    needsSignal: true,
    tabKey: 'investigation',
  },
  [SupportProcessStep.INVESTIGATION]: {
    key: 'ready_for_decision',
    variant: 'primary',
    needsSignal: true,
    tabKey: 'decision',
    unsavedTabKey: 'investigation',
  },
  [SupportProcessStep.DECISION]: {
    key: 'start_follow_up',
    variant: 'primary',
    needsSignal: true,
    tabKey: 'followup',
    unsavedTabKey: 'decision',
  },
  [SupportProcessStep.FOLLOW_UP]: {
    key: 'close_errand',
    variant: 'primary',
    needsSignal: true,
    closesErrand: true,
    resolution: Resolution.CLOSED,
  },
};

export const SupportProcessStepButton: FC<{
  disabled?: boolean;
  onSubmit?: () => Promise<any>;
  onError?: () => void;
}> = ({ disabled, onSubmit, onError }) => {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const toastMessage = useSnackbar();
  const user = useUserStore((s) => s.user);
  const administrators = useUserStore((s) => s.administrators);
  const supportErrand = useSupportStore((s) => s.supportErrand);
  const setSupportErrand = useSupportStore((s) => s.setSupportErrand);
  const setActiveTabKey = useSupportStore((s) => s.setActiveTabKey);
  const unsavedTabs = useSupportStore((s) => s.unsavedTabs);
  const municipalityId = useConfigStore((s) => s.municipalityId);
  const canEdit = useUserStore((s) => s.user.permissions?.canEditSupportManagement);
  const { handleSubmit, reset } = useFormContext();
  const [running, setRunning] = useState<string>();

  const process = getSupportErrandProcess(supportErrand);
  const step = supportProcessStepName(process);
  const stepAction = step ? STEP_ACTIONS[step] : undefined;
  const awaitingSignal = supportProcessAwaitingSignals(process)[0];

  if (!supportErrand?.id) {
    return null;
  }

  const takeErrand = async () => {
    await onSubmit?.();

    if (!supportErrand.assignedUserId) {
      const currentAdmin = administrators.find((a) => a.adAccount === user.username);
      if (currentAdmin) {
        await setSupportErrandAdmin(
          supportErrand.id!,
          municipalityId,
          currentAdmin.adAccount,
          Status.ONGOING,
          currentAdmin.adAccount
        );
      }
    }

    await setSupportErrandStatus(supportErrand.id!, municipalityId, Status.ONGOING);
  };

  const closeThroughRemainingGates = async (
    errandId: string,
    action: ProcessAction
  ): Promise<SupportErrand | undefined> => {
    if (action.needsSignal) {
      const onClosure = await errandOnNextStep(errandId, municipalityId, SupportProcessStep.FOLLOW_UP);
      const closureProcess = getSupportErrandProcess(onClosure);
      const closureSignal = supportProcessAwaitingSignals(closureProcess)[0];

      if (closureSignal?.name) {
        await sendSupportProcessSignal(errandId, municipalityId, closureSignal.name);
        await errandOnNextStep(errandId, municipalityId, SupportProcessStep.CLOSING);
      } else if (!isSupportProcessCompleted(closureProcess)) {
        throw new Error('The process did not reach the step that closes the errand');
      }
    }

    await closeSupportErrand(errandId, municipalityId, action.resolution ?? Resolution.CLOSED);
    return (await getSupportErrandById(errandId, municipalityId)).errand;
  };

  const run = async (action: ProcessAction) => {
    setRunning(action.key);
    try {
      if (action.takesErrand) {
        await takeErrand();
      }

      if (action.needsSignal) {
        await sendSupportProcessSignal(supportErrand.id!, municipalityId, awaitingSignal.name!);
      }

      const stepped = action.closesErrand
        ? await closeThroughRemainingGates(supportErrand.id!, action)
        : (await errandOnNextStep(supportErrand.id!, municipalityId, step)) ??
          (await getSupportErrandById(supportErrand.id!, municipalityId)).errand;

      if (stepped) {
        setSupportErrand(stepped);
        reset(stepped);
      }
      if (action.tabKey) setActiveTabKey(action.tabKey);
      toastMessage({
        position: 'bottom',
        closeable: false,
        message: t(`common:process.actions.${action.key}.done`),
        status: 'success',
      });
    } catch (error) {
      toastMessage({
        position: 'bottom',
        closeable: false,
        message: isSupportProcessSignalStale(error)
          ? t('common:process.actions.stale')
          : t(`common:process.actions.${action.key}.error`),
        status: 'error',
      });
      const updated = await getSupportErrandById(supportErrand.id!, municipalityId).catch(() => undefined);
      if (updated) setSupportErrand(updated.errand);
    } finally {
      setRunning(undefined);
    }
  };

  const unsavedBehind = (action: ProcessAction): boolean =>
    !!action.unsavedTabKey && !!unsavedTabs[action.unsavedTabKey];

  const ask = (action: ProcessAction) =>
    confirm
      .showConfirmation(
        t(`common:process.actions.${action.key}.confirm_title`),
        <div className="flex flex-col gap-8">
          <span>{t(`common:process.actions.${action.key}.confirm_text`)}</span>
          {unsavedBehind(action) ? (
            <span className="font-bold" data-cy="process-action-unsaved">
              {t(`common:tabs.unsaved_${action.unsavedTabKey}`)}
            </span>
          ) : null}
        </div>,
        t(`common:process.actions.${action.key}.confirm_yes`),
        t('common:process.actions.confirm_no'),
        'primary'
      )
      .then((confirmed) => {
        if (confirmed) run(action);
      });

  const start = (action: ProcessAction) => (action.confirms === false ? run(action) : ask(action));

  const actionButton = (action: ProcessAction) => (
    <Button
      key={action.key}
      className="w-full my-8"
      variant={action.variant}
      color={action.color}
      rightIcon={action.icon}
      loading={running === action.key}
      disabled={disabled || !canEdit || !!running || (action.needsSignal && !awaitingSignal?.name)}
      onClick={action.takesErrand ? handleSubmit(() => start(action), onError) : () => start(action)}
      data-cy={`process-action-${action.key}`}
    >
      {t(`common:process.actions.${action.key}.label`)}
    </Button>
  );

  const startsAgain = stepAction?.takesErrand && RESUMED_ELSEWHERE.includes(supportErrand.status as Status);

  return stepAction && !startsAgain ? actionButton(stepAction) : null;
};
