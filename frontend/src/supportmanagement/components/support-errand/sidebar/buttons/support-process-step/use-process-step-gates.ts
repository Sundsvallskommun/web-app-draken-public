'use client';
import { getLatestRjsfSchema } from '@common/components/json/utils/schema-utils';
import type { RJSFSchema } from '@rjsf/utils';
import { useConfirm, useSnackbar } from '@sk-web-gui/react';
import { useConfigStore, useMetadataStore, useSupportStore } from '@stores/index';
import { investigationNeedsAnArea, investigationVariantFor } from '@supportmanagement/investigations';
import { missingAttachments } from '@supportmanagement/services/support-attachment-requirement-service';
import { getDecisionBasisForm } from '@supportmanagement/services/support-decision-basis-service';
import {
  missingDecisionInputs,
  missingPermitInputs,
  savedDecisionJson,
} from '@supportmanagement/services/support-decision-parameters-service';
import { type SupportDecision, supportDecisionPermitType } from '@supportmanagement/services/support-decision-service';
import { jsonParameterForSchema, schemaNameForErrand } from '@supportmanagement/services/support-errand-schema-service';
import {
  getMostSpecificLabelType,
  supportErrandHasAnIdentifiedApplicant,
} from '@supportmanagement/services/support-errand-service';
import { isRecord } from '@supportmanagement/services/support-form-value-service';
import { getSupportInvestigation } from '@supportmanagement/services/support-investigation-service';
import {
  getSupportStatements,
  isSupportStatementAwaitingAnswer,
  isSupportStatementUnsent,
} from '@supportmanagement/services/support-statement-service';
import { useTranslation } from 'react-i18next';

/** The tab a handler is sent to for the thing that is missing. */
const REGISTRATION_INPUT_TABS = {
  applicant: 'basics',
  errand_form: 'details',
  attachments: 'attachments',
} as const;

type RegistrationInput = keyof typeof REGISTRATION_INPUT_TABS;

const SCHEMA_NOT_PUBLISHED_STATUS = 404;

const isSchemaNotPublished = (error: unknown): boolean =>
  (error as { response?: { status?: number } })?.response?.status === SCHEMA_NOT_PUBLISHED_STATUS;

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
   * The errand type's schema, or nothing when the type publishes none. A type without a schema asks
   * for no form and no attachments; a schema that could not be read at all is not an answer, so the
   * step waits rather than passing on a guess.
   */
  const readErrandTypeSchema = async (
    schemaName: string | undefined
  ): Promise<{ read: true; schema: RJSFSchema | undefined } | { read: false }> => {
    if (!schemaName) return { read: true, schema: undefined };

    try {
      const { schema } = await getLatestRjsfSchema(municipalityId, schemaName);
      return { read: true, schema };
    } catch (error) {
      return isSchemaNotPublished(error) ? { read: true, schema: undefined } : { read: false };
    }
  };

  /**
   * What the errand has to carry before the handling starts. The registration is the last stop where
   * nothing has happened yet: a notification errand runs on to a decision of its own once the step is
   * taken, so what that decision will rest on is checked here rather than after it is written.
   *
   * Everything missing is named at once. Which attachments the type asks for depends on the answers,
   * so an errand without a filled in form is told about the form first and about its attachments once
   * the answers exist.
   */
  const registrationIsComplete = async (): Promise<boolean> => {
    if (!supportErrand) return true;

    const schemaName = schemaNameForErrand(supportErrand, supportMetadata?.namespace);
    const reading = await readErrandTypeSchema(schemaName);
    if (!reading.read) {
      complain(t('common:process.actions.registration_unread'));
      return false;
    }

    const storedParameter = jsonParameterForSchema(supportErrand, schemaName);
    const answers = isRecord(storedParameter?.value) ? storedParameter.value : undefined;
    const attachmentsNotDelivered = missingAttachments(reading.schema, answers, supportAttachments);

    const missing: RegistrationInput[] = [];
    if (!supportErrandHasAnIdentifiedApplicant(supportErrand)) missing.push('applicant');
    if (reading.schema && !storedParameter) missing.push('errand_form');
    if (attachmentsNotDelivered.length) missing.push('attachments');

    const [firstMissing] = missing;
    if (!firstMissing) return true;

    const named = (input: RegistrationInput) =>
      input === 'attachments'
        ? t('common:process.actions.registration_inputs.attachments', {
            labels: attachmentsNotDelivered.map((attachment) => attachment.label).join(', '),
          })
        : t(`common:process.actions.registration_inputs.${input}`);

    const goToWhatIsMissing = await confirm.showConfirmation(
      t('common:process.actions.missing_registration_inputs.title'),
      t('common:process.actions.missing_registration_inputs.text', { inputs: missing.map(named).join(', ') }),
      t(`common:process.actions.missing_registration_inputs.go_to_${firstMissing}`),
      t('common:process.actions.missing_registration_inputs.cancel'),
      'info',
      'info'
    );
    if (goToWhatIsMissing) setActiveTabKey(REGISTRATION_INPUT_TABS[firstMissing]);
    return false;
  };

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

    const typeLabel = getMostSpecificLabelType(supportErrand);
    const permitType = supportDecisionPermitType(typeLabel, supportErrand.process?.processKey);
    const missing = missingPermitInputs(
      permitType,
      typeLabel?.resourceName,
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

  const decisionCarriesWhatThePermitNeeds = async (decisions: SupportDecision[]): Promise<boolean> => {
    if (!supportErrand) return true;

    const permitType = supportDecisionPermitType(
      getMostSpecificLabelType(supportErrand),
      supportErrand.process?.processKey
    );
    const decided = decisions.find((decision) => !!decision.outcome);
    const missing = missingDecisionInputs(permitType, savedDecisionJson(decided));
    if (!missing.length) return true;

    const goToTheDecision = await confirm.showConfirmation(
      t('common:process.actions.missing_permit_inputs.decision_title'),
      t('common:process.actions.missing_permit_inputs.decision_text', {
        inputs: missing.map((key) => t(`common:process.actions.permit_inputs.${key}`)).join(', '),
      }),
      t('common:process.actions.missing_permit_inputs.go_to_decision'),
      t('common:process.actions.missing_permit_inputs.cancel'),
      'info',
      'info'
    );
    if (goToTheDecision) setActiveTabKey('decision');
    return false;
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

  /**
   * An errand type that covers more than one trade cannot conclude its investigation before the handler has said
   * which one it is: the legal basis and the statements both follow from it.
   */
  const investigationNamesItsArea = async (): Promise<boolean> => {
    const variant = investigationVariantFor(supportErrand);
    if (!investigationNeedsAnArea(variant, undefined)) return true;

    const investigation = await getSupportInvestigation(errandId ?? '', municipalityId).catch(() => undefined);
    if (!investigationNeedsAnArea(variant, investigation?.type)) return true;

    complain(t('common:process.actions.area_needed'));
    setActiveTabKey('investigation');
    return false;
  };

  return {
    registrationIsComplete,
    investigationNamesItsArea,
    statementsAllowADecision,
    permitInputsAreInPlace,
    decisionCarriesWhatThePermitNeeds,
    askForAnOutcomeFirst,
    complainThatTheDecisionCouldNotBeRead,
  };
};
