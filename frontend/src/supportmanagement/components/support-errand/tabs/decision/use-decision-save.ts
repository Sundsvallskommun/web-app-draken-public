'use client';

import type { Decision } from '@common/data-contracts/supportmanagement/data-contracts';
import { useSnackbar } from '@sk-web-gui/react';
import { useConfigStore, useMetadataStore, useSupportStore, useUserStore } from '@stores/index';
import {
  type CertificateDecision,
  type DecisionParameterInput,
  toCertificateParameters,
  toDecisionParameters,
} from '@supportmanagement/services/support-decision-parameters-service';
import {
  type DecisionPremises,
  withPremisesProcessParameters,
} from '@supportmanagement/services/support-decision-premises-service';
import {
  hasInvalidServingHours,
  type SlotSpec,
  toScopeParameters,
} from '@supportmanagement/services/support-decision-scope-service';
import {
  createSupportDecision,
  getSupportDecisions,
  isSupportDecisionLockedError,
  outcomeForTerms,
  outcomeLabel,
  supportDecisionWithoutBlanks,
  updateSupportDecision,
} from '@supportmanagement/services/support-decision-service';
import {
  getLabelType,
  saveSupportErrandParameters,
  type SupportErrand,
} from '@supportmanagement/services/support-errand-service';
import { type FormValue, text } from '@supportmanagement/services/support-form-value-service';
import dayjs from 'dayjs';
import { useCallback, useEffect, useRef } from 'react';
import { useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import type { DecisionPermit } from './decision-permit';
import type { DecisionFormValues } from './use-decision-form';

interface DecisionSaveInput {
  decision: Decision | undefined;
  values: DecisionFormValues;
  edited: boolean;
  editable: boolean;
  permit: DecisionPermit;
  /** The premises the handler has settled on, written on the errand for the process to read. */
  premisesToSend: DecisionPremises | undefined;
  /** The answers filed under the errand type's schema, which several parameters are read off. */
  applicationForm: FormValue | undefined;
  /** The serving-hours slots the errand type decides on; every one of them is written on save. */
  servingHoursSlots: SlotSpec[];
  onSaved: (decisions: Decision[]) => void;
}

export interface DecisionSave {
  /** What the preview renders, which is what the certificate will be given. */
  certificateParameters: Record<string, string>;
}

/**
 * Writing the decision. The fields go on the decision as parameters, since the process adds nothing
 * off its root but the conditions, and the premises go on the errand, where the process reads them to
 * resolve the restaurant number. Spara ärende in the sidebar is what saves the tab, so the save is
 * registered as the tab's saver instead of sitting behind a button of its own.
 */
export const useDecisionSave = ({
  decision,
  values,
  edited,
  editable,
  permit,
  premisesToSend,
  applicationForm,
  servingHoursSlots,
  onSaved,
}: DecisionSaveInput): DecisionSave => {
  const { t } = useTranslation();
  const municipalityId = useConfigStore((s) => s.municipalityId);
  const supportErrand = useSupportStore((s) => s.supportErrand);
  const setSupportErrand = useSupportStore((s) => s.setSupportErrand);
  const setTabSaver = useSupportStore((s) => s.setTabSaver);
  const supportAttachments = useSupportStore((s) => s.supportAttachments);
  const outcomes = useMetadataStore((s) => s.supportMetadata)?.decisionOutcomes ?? [];
  const user = useUserStore((s) => s.user);
  const toastMessage = useSnackbar();
  const errandForm = useFormContext();
  const saveLatest = useRef<() => Promise<boolean>>(undefined);
  const saver = useCallback(() => saveLatest.current?.() ?? Promise.resolve(true), []);

  const writtenTerms = values.terms.map((term) => term.trim()).filter(Boolean);

  const parameterInput = (errand: SupportErrand): DecisionParameterInput => ({
    errand,
    errandType: permit.errandType,
    form: applicationForm,
    premises: premisesToSend,
    scope: values.scope,
    servingArea: values.servingArea,
    attachments: supportAttachments,
    issuedOn: values.issuedOn,
    premisesPhone: values.premisesPhone,
    user,
    today: dayjs().format('YYYY-MM-DD'),
  });

  /** What the certificate says about the decision, outcome and all, whether previewed or sent. */
  const certificateDecision: CertificateDecision = {
    decisionText: outcomeLabel(outcomes, outcomeForTerms(values.outcome, writtenTerms, outcomes)),
    decisionMaker: values.decidedByRole,
    validFrom: values.validFrom,
    terms: writtenTerms,
  };

  const savePremisesOnErrand = async () => {
    if (!premisesToSend || !supportErrand?.id) return;

    // Spara ärende saves the errand before it saves the tabs, so the freshest parameters are the form's.
    const onErrand = errandForm?.getValues('parameters') ?? supportErrand.parameters;
    const parameters = withPremisesProcessParameters(
      onErrand,
      premisesToSend,
      text(applicationForm?.serveringsstalletsNamn) ?? ''
    );
    if (JSON.stringify(parameters) === JSON.stringify(onErrand)) return;

    await saveSupportErrandParameters(supportErrand.id, municipalityId, parameters);
    const latest = useSupportStore.getState().supportErrand;
    if (latest) setSupportErrand({ ...latest, parameters });
    errandForm?.setValue('parameters', parameters, { shouldDirty: false });
  };

  /**
   * What a decision that will be printed cannot be saved without, named in the order the fields stand
   * on the tab. The premises are left to the step that concludes the decision: they are picked in a
   * card of their own, which says for itself when nothing is chosen.
   */
  const missingBeforeSaving = (): string[] =>
    [
      !values.outcome && 'decisionText',
      permit.certificate && !values.validFrom && 'validFrom',
      permit.certificate && !values.issuedOn && 'executionDate',
      permit.serving && !values.premisesPhone.trim() && 'premisesPhone',
      permit.serving && !values.servingArea.trim() && 'servingAreaDescription',
    ].filter((key): key is string => !!key);

  const tell = (message: string, status: 'success' | 'error') =>
    toastMessage({ position: 'bottom', closeable: false, message, status });

  const save = async (): Promise<boolean> => {
    if (!supportErrand?.id || !editable || !edited) return true;

    const missing = missingBeforeSaving();
    if (missing.length) {
      tell(
        t('common:decision.incomplete', {
          inputs: missing.map((key) => t(`common:process.actions.permit_inputs.${key}`)).join(', '),
        }),
        'error'
      );
      return false;
    }
    if (hasInvalidServingHours(values.scope)) {
      tell(t('common:decision.scope.serving_hours.half_filled'), 'error');
      return false;
    }

    const permitName = getLabelType(supportErrand)?.displayName;
    const written = supportDecisionWithoutBlanks({
      outcome: outcomeForTerms(values.outcome, writtenTerms, outcomes),
      type: permit.type,
      title: permitName ? t('common:decision.title_for', { permit: permitName.toLocaleLowerCase('sv-SE') }) : undefined,
      decidedByRole: values.decidedByRole,
      legalBasis: values.legalBasis,
      delegationReference: values.delegationReference,
      justification: values.justification,
      validFrom: values.validFrom,
      validTo: values.validTo,
      terms: writtenTerms,
      parameters: [
        ...toDecisionParameters(permit.type, parameterInput(supportErrand), certificateDecision),
        ...toScopeParameters(values.scope, servingHoursSlots, permit.type, t),
      ],
    });

    try {
      await savePremisesOnErrand();
      const saved = decision?.id
        ? await updateSupportDecision(supportErrand.id, municipalityId, decision.id, written)
        : await createSupportDecision(supportErrand.id, municipalityId, written);

      onSaved([saved]);
      tell(t('common:decision.saved'), 'success');
      return true;
    } catch (error) {
      const isLocked = isSupportDecisionLockedError(error);
      if (isLocked) {
        const inHand = await getSupportDecisions(supportErrand.id, municipalityId).catch(() => undefined);
        if (inHand) onSaved(inHand);
      }

      tell(t(isLocked ? 'common:decision.locked_error' : 'common:decision.save_error'), 'error');
      return false;
    }
  };

  // The saver is registered once; the ref keeps it pointing at the fields of the latest render.
  useEffect(() => {
    saveLatest.current = save;
  });

  useEffect(() => {
    setTabSaver('decision', saver);
    return () => setTabSaver('decision', undefined);
  }, [saver, setTabSaver]);

  return {
    certificateParameters: supportErrand
      ? toCertificateParameters(permit.type, parameterInput(supportErrand), certificateDecision)
      : {},
  };
};
