import type { Decision } from '@common/data-contracts/supportmanagement/data-contracts';
import { Button, useConfirm, useSnackbar } from '@sk-web-gui/react';
import { useConfigStore, useSupportStore, useUserStore } from '@stores/index';
import {
  completeSupportDecision,
  getSupportDecisions,
  isSupportDecisionDraft,
} from '@supportmanagement/services/support-decision-service';
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
  awaitedGateOfStep,
  getSupportErrandProcess,
  isSupportProcessCompleted,
  isSupportProcessFailed,
  isSupportProcessSignalStale,
  sendSupportProcessSignal,
  SupportProcessStep,
  SupportProcessStepName,
  supportProcessStepName,
} from '@supportmanagement/services/support-process-service';
import {
  getSupportStatements,
  isSupportStatementAwaitingAnswer,
  isSupportStatementUnsent,
} from '@supportmanagement/services/support-statement-service';
import { ArrowRight } from 'lucide-react';
import { FC, ReactElement, useEffect, useState } from 'react';
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
  requiresDecisionOutcome?: boolean;
  requiresAnsweredStatements?: boolean;
  completesDecision?: boolean;
  tabKey?: string;
  closesErrand?: boolean;
  resolution?: Resolution;
}

/** Parked, solved and reopened errands are picked up from their own buttons, never started again. */
const RESUMED_ELSEWHERE = new Set([Status.SUSPENDED, Status.SOLVED, Status.REOPENED]);

const SIGNAL_REPORT_ATTEMPTS = 12;
const SIGNAL_REPORT_INTERVAL = 2500;

const waitFor = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

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
    requiresAnsweredStatements: true,
  },
  [SupportProcessStep.DECISION]: {
    key: 'start_follow_up',
    variant: 'primary',
    needsSignal: true,
    tabKey: 'followup',
    unsavedTabKey: 'decision',
    requiresDecisionOutcome: true,
    completesDecision: true,
  },
  [SupportProcessStep.FOLLOW_UP]: {
    key: 'close_errand',
    variant: 'primary',
    needsSignal: true,
    closesErrand: true,
    resolution: Resolution.CLOSED,
  },
  [SupportProcessStep.CLOSING]: {
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
  const decisionTabHoldsDecision = useSupportStore((s) => s.tabsWithContent['decision']);
  const municipalityId = useConfigStore((s) => s.municipalityId);
  const canEdit = useUserStore((s) => s.user.permissions?.canEditSupportManagement);
  const { handleSubmit, reset } = useFormContext();
  const [running, setRunning] = useState<string>();
  const [decisions, setDecisions] = useState<Decision[]>();

  const process = getSupportErrandProcess(supportErrand);
  const step = supportProcessStepName(process);
  const stepAction = step ? STEP_ACTIONS[step] : undefined;
  const awaitingSignal = awaitedGateOfStep(process, step);
  const errandId = supportErrand?.id;
  const modified = supportErrand?.modified;

  useEffect(() => {
    if (!errandId || !stepAction?.requiresDecisionOutcome) return;
    getSupportDecisions(errandId, municipalityId)
      .then(setDecisions)
      .catch(() => setDecisions(undefined));
  }, [errandId, municipalityId, modified, decisionTabHoldsDecision, stepAction?.requiresDecisionOutcome]);

  if (!supportErrand?.id) {
    return null;
  }

  const processIsOver = isSupportProcessCompleted(process) || isSupportProcessFailed(process);

  const signalIsRequired = (action: ProcessAction): boolean =>
    action.needsSignal && !action.completesDecision && !processIsOver;

  const decisionsOnErrand = async (): Promise<Decision[] | undefined> => {
    if (decisions) return decisions;

    const read = await getSupportDecisions(supportErrand.id!, municipalityId).catch(() => undefined);
    if (read) setDecisions(read);
    return read;
  };

  const sendSignal = (errandId: string, signal: string) => sendSupportProcessSignal(errandId, municipalityId, signal);

  const sendSignalToleratingAStepAlreadyLeft = (errandId: string, signal: string) =>
    sendSignal(errandId, signal).catch((error) => {
      if (!isSupportProcessSignalStale(error)) throw error;
    });

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
    if (action.needsSignal && !processIsOver) {
      const onClosure = await errandOnNextStep(errandId, municipalityId, SupportProcessStep.FOLLOW_UP);
      const closureProcess = getSupportErrandProcess(onClosure);
      const closureSignal = awaitedGateOfStep(closureProcess, SupportProcessStep.CLOSING);

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

  const run = async (action: ProcessAction, decisionsInHand = decisions) => {
    setRunning(action.key);
    try {
      if (action.takesErrand) {
        await takeErrand();
      }

      const draftDecision = decisionsInHand?.find(isSupportDecisionDraft);
      if (action.completesDecision && draftDecision?.id) {
        await completeSupportDecision(supportErrand.id!, municipalityId, draftDecision.id);
      }

      if (action.needsSignal && awaitingSignal?.name) {
        const send = action.completesDecision ? sendSignalToleratingAStepAlreadyLeft : sendSignal;
        await send(supportErrand.id!, awaitingSignal.name);
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

  const ask = (action: ProcessAction, decisionsInHand = decisions) =>
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
      .then((confirmed) => (confirmed ? run(action, decisionsInHand) : undefined));

  /**
   * Whether the statements leave the way to a decision open. One still out with a counterparty closes
   * it: the decision would rest on an answer nobody has given. One prepared but never sent is worth
   * asking about, since it holds up nothing, and a settled one - answered, opposed, never replied to
   * or withdrawn - stands in nobody's way.
   */
  const statementsAllowADecision = async (): Promise<boolean> => {
    if (!errandId) return false;

    const onErrand = await getSupportStatements(errandId, municipalityId).catch(() => undefined);
    if (!onErrand) {
      toastMessage({
        position: 'bottom',
        closeable: false,
        message: t('common:process.actions.statements_unread'),
        status: 'error',
      });
      return false;
    }

    if (onErrand.some(isSupportStatementAwaitingAnswer)) {
      const goToStatements = await confirm.showConfirmation(
        t('common:process.actions.awaiting_statements.title'),
        t('common:process.actions.awaiting_statements.text'),
        t('common:process.actions.awaiting_statements.go_to_investigation'),
        t('common:process.actions.awaiting_statements.cancel'),
        'info',
        'info'
      );
      if (goToStatements) setActiveTabKey('investigation');
      return false;
    }

    if (onErrand.some(isSupportStatementUnsent)) {
      return confirm.showConfirmation(
        t('common:process.actions.unsent_statements.title'),
        t('common:process.actions.unsent_statements.text'),
        t('common:process.actions.unsent_statements.confirm_yes'),
        t('common:process.actions.unsent_statements.cancel'),
        'info',
        'info'
      );
    }

    return true;
  };

  const askForAnOutcomeFirst = () =>
    confirm
      .showConfirmation(
        t('common:process.actions.missing_outcome.title'),
        t('common:process.actions.missing_outcome.text'),
        t('common:process.actions.missing_outcome.go_to_decision'),
        t('common:process.actions.missing_outcome.cancel'),
        'info',
        'info'
      )
      .then((confirmed) => {
        if (confirmed) setActiveTabKey('decision');
      });

  const start = async (action: ProcessAction) => {
    if (action.requiresAnsweredStatements && !(await statementsAllowADecision())) return;

    if (!action.requiresDecisionOutcome) {
      return action.confirms === false ? run(action) : ask(action);
    }

    const onErrand = await decisionsOnErrand();
    if (!onErrand) {
      toastMessage({
        position: 'bottom',
        closeable: false,
        message: t('common:process.actions.decision_unread'),
        status: 'error',
      });
      return;
    }

    if (!onErrand.some((decision) => !!decision.outcome)) {
      askForAnOutcomeFirst();
      return;
    }

    return action.confirms === false ? run(action, onErrand) : ask(action, onErrand);
  };

  const actionButton = (action: ProcessAction) => (
    <Button
      key={action.key}
      className="w-full my-8"
      variant={action.variant}
      color={action.color}
      rightIcon={action.icon}
      loading={running === action.key}
      disabled={disabled || !canEdit || !!running || (signalIsRequired(action) && !awaitingSignal?.name)}
      onClick={action.takesErrand ? handleSubmit(() => start(action), onError) : () => void start(action)}
      data-cy={`process-action-${action.key}`}
    >
      {t(`common:process.actions.${action.key}.label`)}
    </Button>
  );

  const errandIsClosed = supportErrand.status === Status.SOLVED;
  const nothingLeftToDo =
    (stepAction?.takesErrand && RESUMED_ELSEWHERE.has(supportErrand.status as Status)) ||
    (stepAction?.closesErrand && errandIsClosed);

  if (!stepAction || nothingLeftToDo) {
    return null;
  }

  return actionButton(stepAction);
};
