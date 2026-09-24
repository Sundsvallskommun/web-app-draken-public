import { Button, useConfirm, useSnackbar } from '@sk-web-gui/react';
import { useConfigStore, useSupportStore, useUserStore } from '@stores/index';
import {
  closeSupportErrand,
  getSupportErrandById,
  Resolution,
  SupportErrand,
} from '@supportmanagement/services/support-errand-service';
import {
  getSupportErrandProcess,
  isSupportProcessSignalStale,
  sendSupportProcessSignal,
  supportProcessAwaitingSignals,
  SupportProcessStep,
  SupportProcessStepName,
  supportProcessStepName,
} from '@supportmanagement/services/support-process-service';
import { FC, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

interface ProcessAction {
  key: string;
  variant: 'primary' | 'secondary';
  needsSignal: boolean;
  tabKey?: string;
  closesErrand?: boolean;
  resolution?: Resolution;
}

const SIGNAL_REPORT_ATTEMPTS = 12;
const SIGNAL_REPORT_INTERVAL = 2500;

const waitFor = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

/**
 * The step the errand has moved to, once the process has reported it. Nothing is pushed to Draken, so
 * the errand is read again until the step changes or the process stops answering with something new.
 */
const errandOnNextStep = async (
  errandId: string,
  municipalityId: string,
  leaving: SupportProcessStepName | undefined
): Promise<SupportErrand | undefined> => {
  for (let attempt = 0; attempt < SIGNAL_REPORT_ATTEMPTS; attempt++) {
    await waitFor(SIGNAL_REPORT_INTERVAL);
    const { errand } = await getSupportErrandById(errandId, municipalityId);
    if (supportProcessStepName(getSupportErrandProcess(errand)) !== leaving) return errand;
  }
  return undefined;
};

/**
 * What the handler does to leave a step, in the words of the business. The signal that carries it
 * comes from the process, so a model that renames its gates needs no change here.
 */
const STEP_ACTIONS: Partial<Record<SupportProcessStepName, ProcessAction>> = {
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
  },
  [SupportProcessStep.DECISION]: { key: 'start_follow_up', variant: 'primary', needsSignal: true, tabKey: 'followup' },
  [SupportProcessStep.FOLLOW_UP]: {
    key: 'close_errand',
    variant: 'primary',
    needsSignal: true,
    closesErrand: true,
    resolution: Resolution.CLOSED,
  },
};

export const SupportProcessStepButton: FC = () => {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const toastMessage = useSnackbar();
  const supportErrand = useSupportStore((s) => s.supportErrand);
  const setSupportErrand = useSupportStore((s) => s.setSupportErrand);
  const setActiveTabKey = useSupportStore((s) => s.setActiveTabKey);
  const municipalityId = useConfigStore((s) => s.municipalityId);
  const canEdit = useUserStore((s) => s.user.permissions?.canEditSupportManagement);
  const { reset } = useFormContext();
  const [running, setRunning] = useState<string>();

  const process = getSupportErrandProcess(supportErrand);
  const step = supportProcessStepName(process);
  const stepAction = step ? STEP_ACTIONS[step] : undefined;
  const awaitingSignal = supportProcessAwaitingSignals(process)[0];

  if (!supportErrand?.id) {
    return null;
  }

  const closeThroughRemainingGates = async (errandId: string, action: ProcessAction): Promise<SupportErrand> => {
    if (action.needsSignal) {
      const onClosure = await errandOnNextStep(errandId, municipalityId, SupportProcessStep.FOLLOW_UP);
      const closureSignal = supportProcessAwaitingSignals(getSupportErrandProcess(onClosure))[0];
      if (closureSignal?.name) {
        await sendSupportProcessSignal(errandId, municipalityId, closureSignal.name);
        await errandOnNextStep(errandId, municipalityId, SupportProcessStep.CLOSING);
      }
    }

    await closeSupportErrand(errandId, municipalityId, action.resolution ?? Resolution.CLOSED);
    return (await getSupportErrandById(errandId, municipalityId)).errand;
  };

  const run = async (action: ProcessAction) => {
    setRunning(action.key);
    try {
      if (action.needsSignal) {
        await sendSupportProcessSignal(supportErrand.id!, municipalityId, awaitingSignal.name!);
      }

      const stepped = action.closesErrand
        ? await closeThroughRemainingGates(supportErrand.id!, action)
        : (await errandOnNextStep(supportErrand.id!, municipalityId, step)) ??
          (await getSupportErrandById(supportErrand.id!, municipalityId)).errand;

      setSupportErrand(stepped);
      reset(stepped);
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

  const ask = (action: ProcessAction) =>
    confirm
      .showConfirmation(
        t(`common:process.actions.${action.key}.confirm_title`),
        <div className="flex flex-col gap-8">
          <span>{t(`common:process.actions.${action.key}.confirm_text`)}</span>
        </div>,
        t(`common:process.actions.${action.key}.confirm_yes`),
        t('common:process.actions.confirm_no'),
        'primary'
      )
      .then((confirmed) => {
        if (confirmed) run(action);
      });

  const actionButton = (action: ProcessAction) => (
    <Button
      key={action.key}
      className="w-full my-8"
      variant={action.variant}
      loading={running === action.key}
      disabled={!canEdit || !!running || (action.needsSignal && !awaitingSignal?.name)}
      onClick={() => ask(action)}
      data-cy={`process-action-${action.key}`}
    >
      {t(`common:process.actions.${action.key}.label`)}
    </Button>
  );

  return stepAction ? actionButton(stepAction) : null;
};
