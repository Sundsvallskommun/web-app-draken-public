import type { Decision, ProcessSignal } from '@common/data-contracts/supportmanagement/data-contracts';
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
  getSupportErrandProcessState,
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
import { FC, ReactElement, useEffect, useRef, useState } from 'react';
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

const A_MOVE_IS_FORGOTTEN_AFTER = 120000;

const NO_GATE_TO_LEAVE_BY = 'no gate to leave by';

const FIRST_REPORT_DELAY = 300;
const REPORT_BACKOFF = 1.8;
const LONGEST_REPORT_DELAY = 2500;
const SIGNAL_REPORT_WINDOW = 30000;

const waitFor = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const errandOnNextStep = async (
  errandId: string,
  municipalityId: string,
  leaving: SupportProcessStepName | undefined
): Promise<SupportErrand | undefined> => {
  const until = Date.now() + SIGNAL_REPORT_WINDOW;
  let delay = FIRST_REPORT_DELAY;

  while (Date.now() < until) {
    const state = await getSupportErrandProcessState(errandId, municipalityId).catch(() => undefined);
    const process = state?.process;

    if (process && (isSupportProcessCompleted(process) || supportProcessStepName(process) !== leaving)) {
      return (await getSupportErrandById(errandId, municipalityId).catch(() => ({ errand: undefined }))).errand;
    }

    await waitFor(delay);
    delay = Math.min(delay * REPORT_BACKOFF, LONGEST_REPORT_DELAY);
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
  const setProcessSignal = useSupportStore((s) => s.setProcessSignal);
  const processSignal = useSupportStore((s) => s.processSignal);
  const unsavedTabs = useSupportStore((s) => s.unsavedTabs);
  const decisionTabHoldsDecision = useSupportStore((s) => s.tabsWithContent['decision']);
  const municipalityId = useConfigStore((s) => s.municipalityId);
  const canEdit = useUserStore((s) => s.user.permissions?.canEditSupportManagement);
  const { handleSubmit, reset } = useFormContext();
  const [running, setRunning] = useState<string>();
  const [decisions, setDecisions] = useState<Decision[]>();
  const awaitedMove = useRef<{ from: SupportProcessStepName; tabKey: string; at: number } | undefined>(undefined);

  const process = getSupportErrandProcess(supportErrand);
  const step = supportProcessStepName(process);
  const stepAction = step ? STEP_ACTIONS[step] : undefined;
  const awaitingSignal = awaitedGateOfStep(process, step);
  const errandId = supportErrand?.id;

  const signalIsOutstanding = Boolean(processSignal && errandId && processSignal.errandId === errandId);
  const modified = supportErrand?.modified;

  useEffect(() => {
    const move = awaitedMove.current;
    if (!move) return;

    if (Date.now() - move.at > A_MOVE_IS_FORGOTTEN_AFTER) {
      awaitedMove.current = undefined;
      return;
    }
    if (!step || step === move.from) return;

    awaitedMove.current = undefined;
    setActiveTabKey(move.tabKey);
  }, [step, setActiveTabKey]);

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

  const gateToLeaveTheStep = async (action: ProcessAction): Promise<ProcessSignal | undefined> => {
    if (!action.needsSignal) return undefined;

    const state = await getSupportErrandProcessState(supportErrand.id!, municipalityId).catch(() => undefined);
    return awaitedGateOfStep(state?.process ?? process, step);
  };

  const sendSignalToleratingAStepAlreadyLeft = (errandId: string, signal: string) =>
    sendSignal(errandId, signal).catch((error) => {
      if (!isSupportProcessSignalStale(error)) throw error;
    });

  const takeErrand = async () => {
    await onSubmit?.();

    const currentAdmin = supportErrand.assignedUserId
      ? undefined
      : administrators.find((a) => a.adAccount === user.username);

    if (currentAdmin) {
      await setSupportErrandAdmin(
        supportErrand.id!,
        municipalityId,
        currentAdmin.adAccount,
        Status.ONGOING,
        currentAdmin.adAccount
      );
      return;
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

  const tellTheHandler = (message: string, status: 'success' | 'error') =>
    toastMessage({ position: 'bottom', closeable: false, message, status });

  const concludeAnyDraftDecision = async (
    action: ProcessAction,
    decisionsInHand: Decision[] | undefined
  ): Promise<boolean> => {
    const draft = action.completesDecision ? decisionsInHand?.find(isSupportDecisionDraft) : undefined;
    if (!draft?.id) return false;

    await completeSupportDecision(supportErrand.id!, municipalityId, draft.id);
    return true;
  };

  const leaveTheStep = async (action: ProcessAction): Promise<boolean | typeof NO_GATE_TO_LEAVE_BY> => {
    const gate = await gateToLeaveTheStep(action);
    if (!gate?.name) return signalIsRequired(action) ? NO_GATE_TO_LEAVE_BY : false;

    const send = action.completesDecision ? sendSignalToleratingAStepAlreadyLeft : sendSignal;
    await send(supportErrand.id!, gate.name);
    return true;
  };

  const errandAfterTheStep = async (action: ProcessAction): Promise<SupportErrand | undefined> => {
    if (action.closesErrand) return closeThroughRemainingGates(supportErrand.id!, action);

    return (await getSupportErrandById(supportErrand.id!, municipalityId).catch(() => ({ errand: undefined }))).errand;
  };

  const watchTheProcessUnlessItHasMoved = (stepped: SupportErrand | undefined) => {
    const stage = stepped ? getSupportErrandProcess(stepped) : undefined;
    const hasNowhereLeftToGo = isSupportProcessCompleted(stage);
    const hasMovedAlready = !!stepped && supportProcessStepName(stage) !== step;
    if (hasMovedAlready || hasNowhereLeftToGo) return;

    setProcessSignal({ errandId: supportErrand.id!, at: Date.now() });
  };

  const recoverFromAFailedStep = async (action: ProcessAction, error: unknown) => {
    awaitedMove.current = undefined;
    tellTheHandler(
      isSupportProcessSignalStale(error)
        ? t('common:process.actions.stale')
        : t(`common:process.actions.${action.key}.error`),
      'error'
    );

    const updated = await getSupportErrandById(supportErrand.id!, municipalityId).catch(() => undefined);
    if (updated) setSupportErrand(updated.errand);
  };

  const run = async (action: ProcessAction, decisionsInHand = decisions) => {
    setRunning(action.key);
    try {
      if (action.takesErrand) {
        await takeErrand();
      }

      const decisionWasConcluded = await concludeAnyDraftDecision(action, decisionsInHand);
      const signalWasSent = await leaveTheStep(action);
      if (signalWasSent === NO_GATE_TO_LEAVE_BY) {
        tellTheHandler(t('common:process.actions.not_ready'), 'error');
        return;
      }

      if (action.tabKey && step) {
        awaitedMove.current = { from: step, tabKey: action.tabKey, at: Date.now() };
      }

      const stepped = await errandAfterTheStep(action);
      if (stepped) {
        setSupportErrand(stepped);
        reset(stepped);
      }

      if (signalWasSent || decisionWasConcluded) {
        watchTheProcessUnlessItHasMoved(stepped);
      }

      if (action.tabKey && !awaitedMove.current) setActiveTabKey(action.tabKey);
      tellTheHandler(t(`common:process.actions.${action.key}.done`), 'success');
    } catch (error) {
      await recoverFromAFailedStep(action, error);
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
      loading={running === action.key || signalIsOutstanding}
      disabled={
        disabled || !canEdit || !!running || signalIsOutstanding || (signalIsRequired(action) && !awaitingSignal?.name)
      }
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
