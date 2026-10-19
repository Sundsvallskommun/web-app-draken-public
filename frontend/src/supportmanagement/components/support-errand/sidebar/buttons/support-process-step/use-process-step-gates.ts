'use client';

import { useConfirm, useSnackbar } from '@sk-web-gui/react';
import { useConfigStore, useMetadataStore, useSupportStore } from '@stores/index';
import { getDecisionBasisForm } from '@supportmanagement/services/support-decision-basis-service';
import { missingPermitInputs } from '@supportmanagement/services/support-decision-parameters-service';
import { supportDecisionPermitType } from '@supportmanagement/services/support-decision-service';
import { getMostSpecificLabelType } from '@supportmanagement/services/support-errand-service';
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
  const supportErrand = useSupportStore((s) => s.supportErrand);
  const supportAttachments = useSupportStore((s) => s.supportAttachments);
  const supportMetadata = useMetadataStore((s) => s.supportMetadata);

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

  /**
   * What the permit certificate prints, checked while the errand is still being reviewed rather than
   * at the decision, where a missing value stops the process after the decision is already locked.
   * What stands on the errand is the handler's to fill, so the step waits for it. What the application
   * carries can only be completed by the applicant, so that is said out loud and then left to the
   * handler to judge.
   */
  const permitInputsAreInPlace = async (): Promise<boolean> => {
    if (!supportErrand) return true;

    const permitType = supportDecisionPermitType(
      getMostSpecificLabelType(supportErrand),
      supportErrand.process?.processKey
    );
    const missing = missingPermitInputs(
      permitType,
      supportErrand,
      getDecisionBasisForm(supportErrand, supportMetadata?.namespace)?.value,
      supportAttachments
    );
    const named = (keys: string[]) => keys.map((key) => t(`common:process.actions.permit_inputs.${key}`)).join(', ');

    if (missing.fromTheErrand.length) {
      const goToTheErrand = await confirm.showConfirmation(
        t('common:process.actions.missing_permit_inputs.errand_title'),
        t('common:process.actions.missing_permit_inputs.errand_text', { inputs: named(missing.fromTheErrand) }),
        t('common:process.actions.missing_permit_inputs.go_to_basics'),
        t('common:process.actions.missing_permit_inputs.cancel'),
        'info',
        'info'
      );
      if (goToTheErrand) setActiveTabKey('basics');
      return false;
    }

    if (missing.fromTheApplication.length) {
      return confirm.showConfirmation(
        t('common:process.actions.missing_permit_inputs.application_title'),
        t('common:process.actions.missing_permit_inputs.application_text', {
          inputs: named(missing.fromTheApplication),
        }),
        t('common:process.actions.missing_permit_inputs.continue_anyway'),
        t('common:process.actions.missing_permit_inputs.cancel'),
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

  return {
    statementsAllowADecision,
    permitInputsAreInPlace,
    askForAnOutcomeFirst,
    complainThatTheDecisionCouldNotBeRead,
  };
};
