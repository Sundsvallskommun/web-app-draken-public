'use client';

import { getLatestSchema } from '@common/services/jsonschema-service';
import { useSnackbar } from '@sk-web-gui/react';
import { useConfigStore, useMetadataStore, useSupportStore, useUserStore } from '@stores/index';
import {
  type CertificateDecision,
  type DecisionParameterInput,
  decisionSchemaName,
  toCertificateParameters,
  toDecisionJson,
} from '@supportmanagement/services/support-decision-parameters-service';
import type { DecisionPremises } from '@supportmanagement/services/support-decision-premises-service';
import { hasInvalidServingHours } from '@supportmanagement/services/support-decision-scope-service';
import {
  createSupportDecision,
  getSupportDecisions,
  isSupportDecisionLockedError,
  isSupportDecisionRejectedError,
  outcomeForTerms,
  outcomeLabel,
  saveSupportDecisionJsonParameter,
  type SupportDecision,
  supportDecisionWithoutBlanks,
  updateSupportDecision,
} from '@supportmanagement/services/support-decision-service';
import { getLabelType, type SupportErrand } from '@supportmanagement/services/support-errand-service';
import type { FormValue } from '@supportmanagement/services/support-form-value-service';
import dayjs from 'dayjs';
import { useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import type { DecisionPermit } from './decision-permit';
import type { DecisionFormValues } from './use-decision-form';

interface DecisionSaveInput {
  decision: SupportDecision | undefined;
  values: DecisionFormValues;
  edited: boolean;
  editable: boolean;
  permit: DecisionPermit;
  /** The premises the handler has settled on, written in the decision for the process to read. */
  premisesToSend: DecisionPremises | undefined;
  /** The answers filed under the errand type's schema, which several parameters are read off. */
  applicationForm: FormValue | undefined;
  onSaved: (decisions: SupportDecision[]) => void;
}

export interface DecisionSave {
  /** What the preview renders, which is what the certificate will be given. */
  certificateParameters: Record<string, string>;
}

/**
 * Writing the decision: its own fields first, then what it says of the permit as its JSON parameter,
 * the premises and the restaurant number choice included, which the process reads to issue the
 * permit. Spara ärende in the sidebar is what saves the tab, so the save is registered as the tab's
 * saver instead of sitting behind a button of its own.
 */
export const useDecisionSave = ({
  decision,
  values,
  edited,
  editable,
  permit,
  premisesToSend,
  applicationForm,
  onSaved,
}: DecisionSaveInput): DecisionSave => {
  const { t } = useTranslation();
  const municipalityId = useConfigStore((s) => s.municipalityId);
  const supportErrand = useSupportStore((s) => s.supportErrand);
  const setTabSaver = useSupportStore((s) => s.setTabSaver);
  const setDecisionJsonWriter = useSupportStore((s) => s.setDecisionJsonWriter);
  const supportAttachments = useSupportStore((s) => s.supportAttachments);
  const outcomes = useMetadataStore((s) => s.supportMetadata)?.decisionOutcomes ?? [];
  const user = useUserStore((s) => s.user);
  const toastMessage = useSnackbar();
  // Survives a failed JSON write, so that saving again updates the new decision instead of creating another.
  const createdId = useRef<string>(undefined);
  const saveLatest = useRef<() => Promise<boolean>>(undefined);
  const saver = useCallback(() => saveLatest.current?.() ?? Promise.resolve(true), []);
  const writeJsonLatest = useRef<(decisionId: string) => Promise<SupportDecision | undefined>>(undefined);
  const jsonWriter = useCallback(
    (decisionId: string) => writeJsonLatest.current?.(decisionId) ?? Promise.resolve(undefined),
    []
  );

  const writtenTerms = values.terms.map((term) => term.trim()).filter(Boolean);

  const parameterInput = (errand: SupportErrand): DecisionParameterInput => ({
    errand,
    errandType: permit.errandType,
    form: applicationForm,
    premises: premisesToSend,
    scope: values.scope,
    servingAreaDescription: values.servingAreaDescription,
    attachments: supportAttachments,
    executionDate: values.executionDate,
    premisesPhoneNumber: values.premisesPhoneNumber,
    externalCaseRegistrationNumber: values.externalCaseRegistrationNumber,
    user,
    today: dayjs().format('YYYY-MM-DD'),
  });

  /** What the certificate says about the decision, outcome and all, whether previewed or sent. */
  const outcome = outcomeForTerms(values.outcome, writtenTerms, outcomes);
  const certificateDecision: CertificateDecision = {
    outcome,
    decisionText: outcomeLabel(outcomes, outcome),
    decisionMaker: values.decidedByRole,
    validFrom: values.validFrom,
    legalBasis: values.legalBasis,
    justification: values.justification,
    clauses: values.clauses,
    terms: writtenTerms,
  };

  // The JSON copies errand data, so it is rebuilt from the errand as it is now on every write.
  const writeDecisionJson = async (decisionId: string): Promise<SupportDecision | undefined> => {
    if (!supportErrand?.id) return undefined;

    const schemaName = decisionSchemaName(permit.type);
    // A decision stays on the schema version it was first saved with.
    const schemaId =
      decision?.jsonParameters?.find(({ key }) => key === schemaName)?.schemaId ??
      (await getLatestSchema(municipalityId, schemaName)).data.id;
    return saveSupportDecisionJsonParameter(supportErrand.id, municipalityId, decisionId, schemaName, {
      schemaId,
      value: toDecisionJson(permit.type, parameterInput(supportErrand), certificateDecision),
    });
  };

  const tell = (message: string, status: 'success' | 'error') =>
    toastMessage({ position: 'bottom', closeable: false, message, status });

  const saveErrorKey = (error: unknown, decisionWasSaved: boolean): string => {
    if (isSupportDecisionLockedError(error)) return 'common:decision.locked_error';
    if (!decisionWasSaved) return 'common:decision.save_error';
    return isSupportDecisionRejectedError(error)
      ? 'common:decision.permit_json_rejected'
      : 'common:decision.permit_json_save_error';
  };

  // A draft is saved however incomplete; what the permit needs is checked when the decision is concluded.
  const save = async (): Promise<boolean> => {
    if (!supportErrand?.id || !editable || !edited) return true;

    if (hasInvalidServingHours(values.scope)) {
      tell(t('common:decision.scope.serving_hours.half_filled'), 'error');
      return false;
    }

    // The service cannot create a decision without an outcome; until then the fields stay in the form.
    if (!decision?.id && !outcome) return true;

    const permitName = getLabelType(supportErrand)?.displayName;
    const written = supportDecisionWithoutBlanks({
      outcome,
      type: permit.type,
      title: permitName ? t('common:decision.title_for', { permit: permitName.toLocaleLowerCase('sv-SE') }) : undefined,
      decidedByRole: values.decidedByRole,
      legalBasis: values.legalBasis,
      justification: values.justification,
      validFrom: values.validFrom,
      validTo: values.validTo,
      terms: writtenTerms,
    });
    let saved: SupportDecision | undefined;
    try {
      const existingId = decision?.id ?? createdId.current;
      saved = existingId
        ? await updateSupportDecision(supportErrand.id, municipalityId, existingId, written)
        : await createSupportDecision(supportErrand.id, municipalityId, written);
      createdId.current = saved.id;
      const withJson = await writeDecisionJson(saved.id ?? '');

      onSaved(withJson ? [withJson] : [saved]);
      tell(t('common:decision.saved'), 'success');
      return true;
    } catch (error) {
      if (isSupportDecisionLockedError(error)) {
        const inHand = await getSupportDecisions(supportErrand.id, municipalityId).catch(() => undefined);
        if (inHand) onSaved(inHand);
      }

      tell(t(saveErrorKey(error, !!saved)), 'error');
      return false;
    }
  };

  // The saver is registered once; the ref keeps it pointing at the fields of the latest render.
  useEffect(() => {
    saveLatest.current = save;
    writeJsonLatest.current = writeDecisionJson;
  });

  useEffect(() => {
    setTabSaver('decision', saver);
    return () => setTabSaver('decision', undefined);
  }, [saver, setTabSaver]);

  useEffect(() => {
    setDecisionJsonWriter(jsonWriter);
    return () => setDecisionJsonWriter(undefined);
  }, [jsonWriter, setDecisionJsonWriter]);

  return {
    certificateParameters: supportErrand
      ? toCertificateParameters(permit.type, parameterInput(supportErrand), certificateDecision)
      : {},
  };
};
