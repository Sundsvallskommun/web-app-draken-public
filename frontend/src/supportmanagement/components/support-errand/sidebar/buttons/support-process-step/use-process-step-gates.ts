'use client';

import { useConfirm, useSnackbar } from '@sk-web-gui/react';
import { useConfigStore, useSupportStore } from '@stores/index';
import {
  getSupportStatements,
  isSupportStatementAwaitingAnswer,
  isSupportStatementUnsent,
} from '@supportmanagement/services/support-statement-service';
import { useTranslation } from 'react-i18next';

/**
 * What has to be true before a step may be taken. Each gate either lets the step through or points
 * the handler at the tab where the thing it is waiting for is written.
 */
export const useProcessStepGates = (errandId: string | undefined) => {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const toastMessage = useSnackbar();
  const municipalityId = useConfigStore((s) => s.municipalityId);
  const setActiveTabKey = useSupportStore((s) => s.setActiveTabKey);

  const complain = (message: string) =>
    toastMessage({ position: 'bottom', closeable: false, message, status: 'error' });

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
      complain(t('common:process.actions.statements_unread'));
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

  const complainThatTheDecisionCouldNotBeRead = () => complain(t('common:process.actions.decision_unread'));

  return { statementsAllowADecision, askForAnOutcomeFirst, complainThatTheDecisionCouldNotBeRead };
};
