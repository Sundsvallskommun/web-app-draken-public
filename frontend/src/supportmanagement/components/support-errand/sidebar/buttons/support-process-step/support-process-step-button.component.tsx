import type { Decision } from '@common/data-contracts/supportmanagement/data-contracts';
import { Button, useConfirm } from '@sk-web-gui/react';
import { useConfigStore, useSupportStore, useUserStore } from '@stores/index';
import { getSupportDecisions } from '@supportmanagement/services/support-decision-service';
import { Status } from '@supportmanagement/services/support-errand-service';
import {
  awaitedGateOfStep,
  getSupportErrandProcess,
  isSupportProcessCompleted,
  isSupportProcessFailed,
  supportProcessStepName,
} from '@supportmanagement/services/support-process-service';
import { FC, useEffect, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { ProcessAction, RESUMED_ELSEWHERE, signalIsRequired, STEP_ACTIONS } from './process-step-actions';
import { useProcessStepGates } from './use-process-step-gates';
import { useProcessStepRun } from './use-process-step-run';

export const SupportProcessStepButton: FC<{
  disabled?: boolean;
  onSubmit?: () => Promise<any>;
  onError?: () => void;
}> = ({ disabled, onSubmit, onError }) => {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const supportErrand = useSupportStore((s) => s.supportErrand);
  const processSignal = useSupportStore((s) => s.processSignal);
  const unsavedTabs = useSupportStore((s) => s.unsavedTabs);
  const decisionTabHoldsDecision = useSupportStore((s) => s.tabsWithContent['decision']);
  const municipalityId = useConfigStore((s) => s.municipalityId);
  const canEdit = useUserStore((s) => s.user.permissions?.canEditSupportManagement);
  const { handleSubmit, reset } = useFormContext();
  const [decisions, setDecisions] = useState<Decision[]>();

  const process = getSupportErrandProcess(supportErrand);
  const step = supportProcessStepName(process);
  const stepAction = step ? STEP_ACTIONS[step] : undefined;
  const awaitingSignal = awaitedGateOfStep(process, step);
  const errandId = supportErrand?.id;
  const processIsOver = isSupportProcessCompleted(process) || isSupportProcessFailed(process);

  const signalIsOutstanding = Boolean(processSignal && errandId && processSignal.errandId === errandId);
  const somethingIsUnsaved = Object.values(unsavedTabs).some(Boolean);
  const modified = supportErrand?.modified;

  const gates = useProcessStepGates(errandId);
  const { running, run } = useProcessStepRun({
    supportErrand: supportErrand!,
    step,
    process,
    processIsOver,
    onSubmit,
    reset,
  });

  useEffect(() => {
    if (!errandId || !stepAction?.requiresDecisionOutcome) return;
    getSupportDecisions(errandId, municipalityId)
      .then(setDecisions)
      .catch(() => setDecisions(undefined));
  }, [errandId, municipalityId, modified, decisionTabHoldsDecision, stepAction?.requiresDecisionOutcome]);

  if (!supportErrand?.id) {
    return null;
  }

  const decisionsOnErrand = async (): Promise<Decision[] | undefined> => {
    if (decisions) return decisions;

    const read = await getSupportDecisions(supportErrand.id!, municipalityId).catch(() => undefined);
    if (read) setDecisions(read);
    return read;
  };

  const ask = (action: ProcessAction, decisionsInHand = decisions) =>
    confirm
      .showConfirmation(
        t(`common:process.actions.${action.key}.confirm_title`),
        <span>{t(`common:process.actions.${action.key}.confirm_text`)}</span>,
        t(`common:process.actions.${action.key}.confirm_yes`),
        t('common:process.actions.confirm_no'),
        'primary'
      )
      .then((confirmed) => (confirmed ? run(action, decisionsInHand) : undefined));

  const carryOut = (action: ProcessAction, decisionsInHand = decisions) =>
    action.confirms === false ? run(action, decisionsInHand) : ask(action, decisionsInHand);

  const start = async (action: ProcessAction) => {
    if (action.requiresAnsweredStatements && !(await gates.statementsAllowADecision())) return;

    if (!action.requiresDecisionOutcome) return carryOut(action);

    const onErrand = await decisionsOnErrand();
    if (!onErrand) {
      gates.complainThatTheDecisionCouldNotBeRead();
      return;
    }

    if (!onErrand.some((decision) => !!decision.outcome)) {
      gates.askForAnOutcomeFirst();
      return;
    }

    return carryOut(action, onErrand);
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
        disabled ||
        !canEdit ||
        !!running ||
        signalIsOutstanding ||
        somethingIsUnsaved ||
        (signalIsRequired(action, processIsOver) && !awaitingSignal?.name)
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

  return (
    <>
      {actionButton(stepAction)}
      {somethingIsUnsaved ? (
        <p className="text-small text-dark-secondary mb-12" data-cy="process-action-unsaved">
          {t('common:process.actions.unsaved')}
        </p>
      ) : null}
    </>
  );
};
