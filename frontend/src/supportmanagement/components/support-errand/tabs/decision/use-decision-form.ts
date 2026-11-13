'use client';

import { savedDecisionJson } from '@supportmanagement/services/support-decision-parameters-service';
import type { DecisionPremises } from '@supportmanagement/services/support-decision-premises-service';
import type { DecisionScope } from '@supportmanagement/services/support-decision-scope-service';
import {
  decisionTermTexts,
  outcomeWithoutConditions,
  type SupportDecision,
} from '@supportmanagement/services/support-decision-service';
import { objectAt, stringAt } from '@supportmanagement/services/support-json-parameter-service';
import { useCallback, useState } from 'react';

export interface DecisionFormValues {
  outcome: string;
  decidedByRole: string;
  legalBasis: string;
  /** The delegation point the decision is made under, printed in the decision document. */
  delegationReference: string;
  /** The decision's own registry number. */
  externalCaseRegistrationNumber: string;
  /** The att-satser, one per line. */
  clauses: string;
  justification: string;
  validFrom: string;
  validTo: string;
  /** The day the permit is issued, printed in the certificate's signature block. */
  executionDate: string;
  /** The premises within which serving is allowed, as the handler writes it. */
  servingAreaDescription: string;
  /** Starts as the telephone the application gave, which it often does not. */
  premisesPhoneNumber: string;
  terms: string[];
  /** The beverages and serving hours the permit grants, which start as the application asked. */
  scope: DecisionScope;
}

interface DecisionFormInput {
  decision: SupportDecision | undefined;
  /** A concluded decision is read, not written, and then nothing counts as edited. */
  editable: boolean;
  /** The premises the errand carries, and the ones the handler has settled on. */
  savedPremises: DecisionPremises | undefined;
  premisesToSend: DecisionPremises | undefined;
  applicationPremisesPhone: string;
  /** What a decision not yet saved starts its att-satser from. */
  investigationClauses: string;
  /** The decided scope as saved, and the application's where the decision has none saved. */
  scopeAsSaved: DecisionScope;
  defaultRole: string;
}

export interface DecisionForm {
  values: DecisionFormValues;
  set: <K extends keyof DecisionFormValues>(key: K, value: DecisionFormValues[K]) => void;
  /** True while a field, or the choice of premises, holds something other than what was saved. */
  edited: boolean;
}

/** What the decision was saved with, which is also what an unsaved form starts from. */
const asSaved = ({
  decision,
  applicationPremisesPhone,
  investigationClauses,
  scopeAsSaved,
  defaultRole,
}: DecisionFormInput): DecisionFormValues => {
  const json = savedDecisionJson(decision);
  return {
    outcome: outcomeWithoutConditions(decision?.outcome),
    decidedByRole: decision?.decidedByRole || defaultRole,
    legalBasis: decision?.legalBasis ?? '',
    delegationReference: decision?.delegationReference ?? '',
    externalCaseRegistrationNumber: stringAt(json?.externalCaseRegistrationNumber) ?? '',
    clauses: decision?.id ? stringAt(objectAt(json?.decision).clauses) ?? '' : investigationClauses,
    justification: decision?.justification ?? '',
    validFrom: decision?.validFrom ?? '',
    validTo: decision?.validTo ?? '',
    executionDate: stringAt(objectAt(json?.decision).executionDate) ?? '',
    servingAreaDescription: stringAt(objectAt(json?.servingArea).description) ?? '',
    premisesPhoneNumber:
      stringAt(objectAt(json?.premises ?? json?.pointOfSale).phoneNumber) ?? applicationPremisesPhone,
    terms: decisionTermTexts(decision),
    scope: scopeAsSaved,
  };
};

const comparable = (values: DecisionFormValues, premises: DecisionPremises | undefined) =>
  JSON.stringify({ ...values, terms: values.terms.filter(Boolean), premises: premises ?? null });

/**
 * The fields of the decision while it is being written. The decision behind them is read again
 * whenever the errand changes, and the fields follow it only when it is a different decision or a
 * newer version of it, so a reload does not wipe what the handler is in the middle of writing.
 * A new decision's att-satser follow the investigation for as long as the handler leaves them as prefilled.
 */
export const useDecisionForm = (input: DecisionFormInput): DecisionForm => {
  const saved = asSaved(input);
  const [values, setValues] = useState(saved);

  const version = input.decision?.id ? `${input.decision.id}:${input.decision.version ?? ''}` : 'new';
  const [filledFrom, setFilledFrom] = useState(version);
  const [prefilled, setPrefilled] = useState(input.investigationClauses);
  if (version !== filledFrom) {
    setFilledFrom(version);
    setPrefilled(input.investigationClauses);
    setValues(saved);
  } else if (input.investigationClauses !== prefilled) {
    setPrefilled(input.investigationClauses);
    if (!input.decision?.id) {
      setValues((current) =>
        current.clauses === prefilled ? { ...current, clauses: input.investigationClauses } : current
      );
    }
  }

  const set = useCallback(
    <K extends keyof DecisionFormValues>(key: K, value: DecisionFormValues[K]) =>
      setValues((current) => ({ ...current, [key]: value })),
    []
  );

  const edited = input.editable && comparable(values, input.premisesToSend) !== comparable(saved, input.savedPremises);

  return { values, set, edited };
};
