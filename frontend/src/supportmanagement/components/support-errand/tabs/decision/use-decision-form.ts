'use client';

import { savedDecisionJson } from '@supportmanagement/services/support-decision-parameters-service';
import type { DecisionPremises } from '@supportmanagement/services/support-decision-premises-service';
import type { DecisionScope } from '@supportmanagement/services/support-decision-scope-service';
import {
  decisionTermTexts,
  outcomeWithoutConditions,
  type SupportDecision,
} from '@supportmanagement/services/support-decision-service';
import {
  type JsonObject,
  objectAt,
  sameJson,
  stringAt,
} from '@supportmanagement/services/support-json-parameter-service';
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
  /** What the decision means for the permit holder, written for the errand at hand. */
  outcomeText: string;
  /** The three paragraphs of an action errand's justification. */
  justificationDeficiencies: string;
  justificationStatement: string;
  justificationOutcome: string;
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

/**
 * What a decision not yet saved starts from: the investigation's own examinations. The handler may write over
 * any of it, and a field that has been written over stops following the investigation.
 */
export interface DecisionPrefill {
  clauses: string;
  justificationDeficiencies: string;
  justificationStatement: string;
  justificationOutcome: string;
}

export const NO_DECISION_PREFILL: DecisionPrefill = {
  clauses: '',
  justificationDeficiencies: '',
  justificationStatement: '',
  justificationOutcome: '',
};

const PREFILLED_FIELDS = Object.keys(NO_DECISION_PREFILL) as (keyof DecisionPrefill)[];

interface DecisionFormInput {
  decision: SupportDecision | undefined;
  /** A concluded decision is read, not written, and then nothing counts as edited. */
  editable: boolean;
  /** The premises the errand carries, and the ones the handler has settled on. */
  savedPremises: DecisionPremises | undefined;
  premisesToSend: DecisionPremises | undefined;
  applicationPremisesPhone: string;
  /** What a decision not yet saved starts from. */
  prefill: DecisionPrefill;
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
  prefill,
  scopeAsSaved,
  defaultRole,
}: DecisionFormInput): DecisionFormValues => {
  const json = savedDecisionJson(decision);
  const written = (field: keyof DecisionPrefill, saved: string | undefined): string =>
    decision?.id ? saved ?? '' : prefill[field];
  return {
    outcome: outcomeWithoutConditions(decision?.outcome),
    decidedByRole: decision?.decidedByRole || defaultRole,
    legalBasis: decision?.legalBasis ?? '',
    delegationReference: decision?.delegationReference ?? '',
    externalCaseRegistrationNumber: stringAt(json?.externalCaseRegistrationNumber) ?? '',
    clauses: written('clauses', clausesAsSaved(json)),
    justification: decision?.justification ?? '',
    outcomeText: stringAt(objectAt(json?.decision).outcomeText) ?? '',
    justificationDeficiencies: written(
      'justificationDeficiencies',
      stringAt(objectAt(json?.decision).justificationDeficiencies)
    ),
    justificationStatement: written(
      'justificationStatement',
      stringAt(objectAt(json?.decision).justificationStatement)
    ),
    justificationOutcome: written('justificationOutcome', stringAt(objectAt(json?.decision).justificationOutcome)),
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

/** The att-satser are kept as a list where the document numbers them, and as one text where it does not. */
const clausesAsSaved = (json: JsonObject | undefined): string | undefined => {
  const clauses = objectAt(json?.decision).clauses;
  return Array.isArray(clauses) ? clauses.filter((line) => typeof line === 'string').join('\n') : stringAt(clauses);
};

const comparable = (values: DecisionFormValues, premises: DecisionPremises | undefined) =>
  JSON.stringify({ ...values, terms: values.terms.filter(Boolean), premises: premises ?? null });

/**
 * The fields of the decision while it is being written. The decision behind them is read again
 * whenever the errand changes, and the fields follow it only when it is a different decision or a
 * newer version of it, so a reload does not wipe what the handler is in the middle of writing.
 * A new decision's att-satser follow the investigation for as long as the handler leaves them as prefilled.
 */
/** A field the handler has not written in follows the investigation; one that has been written in stays put. */
const stillFollowingThePrefill = (
  values: DecisionFormValues,
  before: DecisionPrefill,
  after: DecisionPrefill
): DecisionFormValues =>
  PREFILLED_FIELDS.reduce(
    (current, field) => (current[field] === before[field] ? { ...current, [field]: after[field] } : current),
    values
  );

export const useDecisionForm = (input: DecisionFormInput): DecisionForm => {
  const saved = asSaved(input);
  const [values, setValues] = useState(saved);

  const version = input.decision?.id ? `${input.decision.id}:${input.decision.version ?? ''}` : 'new';
  const [filledFrom, setFilledFrom] = useState(version);
  const [prefilled, setPrefilled] = useState(input.prefill);
  if (version !== filledFrom) {
    setFilledFrom(version);
    setPrefilled(input.prefill);
    setValues(saved);
  } else if (!sameJson(input.prefill, prefilled)) {
    setPrefilled(input.prefill);
    if (!input.decision?.id) {
      setValues((current) => stillFollowingThePrefill(current, prefilled, input.prefill));
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
