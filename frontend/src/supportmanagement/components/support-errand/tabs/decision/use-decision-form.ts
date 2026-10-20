'use client';

import type { Decision } from '@common/data-contracts/supportmanagement/data-contracts';
import { decisionParameterValue } from '@supportmanagement/services/support-decision-parameters-service';
import type { DecisionPremises } from '@supportmanagement/services/support-decision-premises-service';
import { decisionTermTexts, outcomeWithoutConditions } from '@supportmanagement/services/support-decision-service';
import { useCallback, useState } from 'react';

export interface DecisionFormValues {
  outcome: string;
  decidedByRole: string;
  legalBasis: string;
  delegationReference: string;
  justification: string;
  validFrom: string;
  validTo: string;
  /** The day the permit is issued, printed in the certificate's signature block. */
  issuedOn: string;
  /** The premises within which serving is allowed, as the handler writes it. */
  servingArea: string;
  /** Starts as the telephone the application gave, which it often does not. */
  premisesPhone: string;
  terms: string[];
}

interface DecisionFormInput {
  decision: Decision | undefined;
  /** A concluded decision is read, not written, and then nothing counts as edited. */
  editable: boolean;
  /** The premises the errand carries, and the ones the handler has settled on. */
  savedPremises: DecisionPremises | undefined;
  premisesToSend: DecisionPremises | undefined;
  applicationPremisesPhone: string;
  defaultRole: string;
}

export interface DecisionForm {
  values: DecisionFormValues;
  set: <K extends keyof DecisionFormValues>(key: K, value: DecisionFormValues[K]) => void;
  /** True while a field, or the choice of premises, holds something other than what was saved. */
  edited: boolean;
}

/** What the decision was saved with, which is also what an unsaved form starts from. */
const asSaved = ({ decision, applicationPremisesPhone, defaultRole }: DecisionFormInput): DecisionFormValues => ({
  outcome: outcomeWithoutConditions(decision?.outcome),
  decidedByRole: decision?.decidedByRole || defaultRole,
  legalBasis: decision?.legalBasis ?? '',
  delegationReference: decision?.delegationReference ?? '',
  justification: decision?.justification ?? '',
  validFrom: decision?.validFrom ?? '',
  validTo: decision?.validTo ?? '',
  issuedOn: decisionParameterValue(decision?.parameters, 'executionDate') ?? '',
  servingArea: decisionParameterValue(decision?.parameters, 'servingAreaDescription') ?? '',
  premisesPhone: decisionParameterValue(decision?.parameters, 'premisesPhone') ?? applicationPremisesPhone,
  terms: decisionTermTexts(decision),
});

const comparable = (values: DecisionFormValues, premises: DecisionPremises | undefined) =>
  JSON.stringify({ ...values, terms: values.terms.filter(Boolean), premises: premises ?? null });

/**
 * The fields of the decision while it is being written. The decision behind them is read again
 * whenever the errand changes, and the fields follow it only when it is a different decision or a
 * newer version of it, so a reload does not wipe what the handler is in the middle of writing.
 */
export const useDecisionForm = (input: DecisionFormInput): DecisionForm => {
  const saved = asSaved(input);
  const [values, setValues] = useState(saved);

  const version = `${input.decision?.id ?? ''}:${input.decision?.version ?? ''}`;
  const [filledFrom, setFilledFrom] = useState(version);
  if (version !== filledFrom) {
    setFilledFrom(version);
    setValues(saved);
  }

  const set = useCallback(
    <K extends keyof DecisionFormValues>(key: K, value: DecisionFormValues[K]) =>
      setValues((current) => ({ ...current, [key]: value })),
    []
  );

  const edited = input.editable && comparable(values, input.premisesToSend) !== comparable(saved, input.savedPremises);

  return { values, set, edited };
};
