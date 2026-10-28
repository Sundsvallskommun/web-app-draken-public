'use client';

import type { Decision, ErrandProcess, ProcessSignal } from '@common/data-contracts/supportmanagement/data-contracts';
import { useSnackbar } from '@sk-web-gui/react';
import { useConfigStore, useSupportStore, useUserStore } from '@stores/index';
import { completeSupportDecision, isSupportDecisionDraft } from '@supportmanagement/services/support-decision-service';
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
  completeSupportInvestigation,
  getSupportInvestigation,
  isSupportInvestigationCompleted,
} from '@supportmanagement/services/support-investigation-service';
import {
  awaitedGateOfStep,
  getSupportErrandProcess,
  getSupportErrandProcessState,
  isSupportProcessCompleted,
  isSupportProcessSignalStale,
  sendSupportProcessSignal,
  startSupportProcess,
  SupportProcessStep,
  SupportProcessStepName,
  supportProcessStepName,
} from '@supportmanagement/services/support-process-service';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ProcessAction, signalIsRequired } from './process-step-actions';
import { errandOnNextStep } from './process-step-progress';

const A_MOVE_IS_FORGOTTEN_AFTER = 120000;

const NO_GATE_TO_LEAVE_BY = 'no gate to leave by';

interface StepContext {
  supportErrand: SupportErrand;
  step: SupportProcessStepName | undefined;
  process: ErrandProcess | undefined;
  processIsOver: boolean;
  /** Eligible keys for a manual start. */
  processKeys?: string[];
  onSubmit?: () => Promise<any>;
  reset: (errand: SupportErrand) => void;
}

/** Carrying a step out: taking the errand, concluding a decision, leaving by the gate, and following where it lands. */
export const useProcessStepRun = ({
  supportErrand,
  step,
  process,
  processIsOver,
  processKeys,
  onSubmit,
  reset,
}: StepContext) => {
  const { t } = useTranslation();
  const toastMessage = useSnackbar();
  const user = useUserStore((s) => s.user);
  const administrators = useUserStore((s) => s.administrators);
  const municipalityId = useConfigStore((s) => s.municipalityId);
  const setSupportErrand = useSupportStore((s) => s.setSupportErrand);
  const setActiveTabKey = useSupportStore((s) => s.setActiveTabKey);
  const setProcessSignal = useSupportStore((s) => s.setProcessSignal);
  const [running, setRunning] = useState<string>();
  const awaitedMove = useRef<{ from: SupportProcessStepName; tabKey: string; at: number } | undefined>(undefined);

  const errandId = supportErrand.id!;

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

  const tellTheHandler = (message: string, status: 'success' | 'error') =>
    toastMessage({ position: 'bottom', closeable: false, message, status });

  const sendSignal = (signal: string) => sendSupportProcessSignal(errandId, municipalityId, signal);

  /** Starts the process and lets the poller pick it up once the engine has registered it. */
  const startTheProcess = async () => {
    await startSupportProcess(errandId, municipalityId, processKeys?.length === 1 ? processKeys[0] : undefined);
    setProcessSignal({ errandId, at: Date.now() });
  };

  const sendSignalToleratingAStepAlreadyLeft = (signal: string) =>
    sendSignal(signal).catch((error) => {
      if (!isSupportProcessSignalStale(error)) throw error;
    });

  const gateToLeaveTheStep = async (action: ProcessAction): Promise<ProcessSignal | undefined> => {
    if (!action.needsSignal) return undefined;

    const state = await getSupportErrandProcessState(errandId, municipalityId).catch(() => undefined);
    return awaitedGateOfStep(state?.process ?? process, step);
  };

  const takeErrand = async () => {
    await onSubmit?.();

    const currentAdmin = supportErrand.assignedUserId
      ? undefined
      : administrators.find((a) => a.adAccount === user.username);

    if (currentAdmin) {
      await setSupportErrandAdmin(
        errandId,
        municipalityId,
        currentAdmin.adAccount,
        Status.ONGOING,
        currentAdmin.adAccount
      );
      return;
    }

    await setSupportErrandStatus(errandId, municipalityId, Status.ONGOING);
  };

  const closeThroughRemainingGates = async (action: ProcessAction): Promise<SupportErrand | undefined> => {
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

  const concludeAnyDraftDecision = async (decisionsInHand: Decision[] | undefined): Promise<boolean> => {
    const draft = decisionsInHand?.find(isSupportDecisionDraft);
    if (!draft?.id) return false;

    await completeSupportDecision(errandId, municipalityId, draft.id);
    return true;
  };

  const completeAnyOpenInvestigation = async () => {
    const investigation = await getSupportInvestigation(errandId, municipalityId);
    if (!investigation?.id || isSupportInvestigationCompleted(investigation)) return;

    await completeSupportInvestigation(errandId, municipalityId, investigation);
  };

  const leaveTheStep = async (action: ProcessAction): Promise<boolean | typeof NO_GATE_TO_LEAVE_BY> => {
    const gate = await gateToLeaveTheStep(action);
    if (!gate?.name) return signalIsRequired(action, processIsOver) ? NO_GATE_TO_LEAVE_BY : false;

    const send = action.completesDecision ? sendSignalToleratingAStepAlreadyLeft : sendSignal;
    await send(gate.name);
    return true;
  };

  const errandAfterTheStep = async (action: ProcessAction): Promise<SupportErrand | undefined> => {
    if (action.closesErrand) return closeThroughRemainingGates(action);

    return (await getSupportErrandById(errandId, municipalityId).catch(() => ({ errand: undefined }))).errand;
  };

  const watchTheProcessUnlessItHasMoved = (stepped: SupportErrand | undefined) => {
    const stage = stepped ? getSupportErrandProcess(stepped) : undefined;
    const hasNowhereLeftToGo = isSupportProcessCompleted(stage);
    const hasMovedAlready = !!stepped && supportProcessStepName(stage) !== step;
    if (hasMovedAlready || hasNowhereLeftToGo) return;

    setProcessSignal({ errandId, at: Date.now() });
  };

  const recoverFromAFailedStep = async (action: ProcessAction, error: unknown) => {
    awaitedMove.current = undefined;
    tellTheHandler(
      isSupportProcessSignalStale(error)
        ? t('common:process.actions.stale')
        : t(`common:process.actions.${action.key}.error`),
      'error'
    );

    const updated = await getSupportErrandById(errandId, municipalityId).catch(() => undefined);
    if (updated) setSupportErrand(updated.errand);
  };

  const run = async (action: ProcessAction, decisionsInHand: Decision[] | undefined) => {
    setRunning(action.key);
    try {
      if (action.startsProcess) {
        await startTheProcess();
        tellTheHandler(t(`common:process.actions.${action.key}.done`), 'success');
        return;
      }

      if (action.takesErrand) {
        await takeErrand();
      }

      if (action.completesInvestigation) {
        await completeAnyOpenInvestigation();
      }

      let decisionWasConcluded = false;
      if (action.completesDecision) {
        decisionWasConcluded = await concludeAnyDraftDecision(decisionsInHand);
      }

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

  return { running, run };
};
