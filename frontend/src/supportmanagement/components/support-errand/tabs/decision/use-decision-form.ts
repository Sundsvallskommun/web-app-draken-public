'use client';

import { savedDecisionJson } from '@supportmanagement/services/support-decision-parameters-service';
import type { DecisionPremises } from '@supportmanagement/services/support-decision-premises-service';
import type { DecisionScope } from '@supportmanagement/services/support-decision-scope-service';
import {
  ACTION_ERRAND_PERMIT_TYPE,
  decisionTermTexts,
  isSupportDecisionDraft,
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
  /** The decision's registry number, which starts as the errand's from Grundinformation. */
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
  /** The permit the decision is about, which the handler names where the inspection has no relation to it. */
  permitType: string;
  permitCaseNumber: string;
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
  /** The outcome the investigation recommends, where the decision offers it as a choice. */
  outcome: string;
  clauses: string;
  justificationDeficiencies: string;
  justificationStatement: string;
  justificationOutcome: string;
  /** The permit the inspection was about, where its relation names one. */
  permitType: string;
  permitCaseNumber: string;
}

export const NO_DECISION_PREFILL: DecisionPrefill = {
  outcome: '',
  clauses: '',
  justificationDeficiencies: '',
  justificationStatement: '',
  justificationOutcome: '',
  permitType: '',
  permitCaseNumber: '',
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
  /** The errand's registry number, which a decision saved without one starts from. */
  errandCaseRegistrationNumber: string;
  /** What the errand decides on; only the action errand keeps filling a draft in from the investigation. */
  permitType: string;
}

export interface DecisionForm {
  values: DecisionFormValues;
  set: <K extends keyof DecisionFormValues>(key: K, value: DecisionFormValues[K]) => void;
  /** True while a field, or the choice of premises, holds something other than what the form started from. */
  edited: boolean;
  /**
   * True while the form holds anything the saved decision does not, the texts taken from the investigation
   * included. What is prefilled is not a change the handler made, so it does not warn about leaving the tab, but
   * it is still something to write, so a save has to go through.
   */
  unwritten: boolean;
}

/**
 * Only the action errand's decision keeps filling itself in from the investigation once it has been saved. A permit
 * decision is the handler's from its first save, as it has always been.
 */
const followsWhileDraft = (permitType: string): boolean => permitType === ACTION_ERRAND_PERMIT_TYPE;

/**
 * Whether a field still starts from the investigation.
 *
 * A decision that has never been saved always does. An action errand's draft does for a field it has nothing saved
 * in, since a blank field is left out of the saved JSON altogether and a draft saved before the paragraphs were
 * written would otherwise lose them for good. A decided decision never does; it says what was decided.
 */
const followsTheInvestigation = (
  decision: SupportDecision | undefined,
  saved: string | undefined,
  whileDraft: boolean
): boolean => {
  if (!decision?.id) return true;
  return whileDraft && isSupportDecisionDraft(decision) && !saved?.trim();
};

/**
 * The fields as they stand, either as the form starts them, with the investigation filling in what the decision
 * has nothing saved in, or as the decision alone has them, which is what a save is measured against.
 */
const valuesOf = (
  {
    decision,
    applicationPremisesPhone,
    prefill,
    scopeAsSaved,
    defaultRole,
    errandCaseRegistrationNumber,
    permitType,
  }: DecisionFormInput,
  fromTheInvestigation: boolean
): DecisionFormValues => {
  const json = savedDecisionJson(decision);
  const written = (field: keyof DecisionPrefill, saved: string | undefined): string =>
    fromTheInvestigation && followsTheInvestigation(decision, saved, followsWhileDraft(permitType))
      ? prefill[field]
      : saved ?? '';
  return {
    outcome: written('outcome', outcomeWithoutConditions(decision?.outcome)),
    decidedByRole: decision?.decidedByRole || defaultRole,
    legalBasis: decision?.legalBasis ?? '',
    delegationReference: decision?.delegationReference ?? '',
    externalCaseRegistrationNumber: stringAt(json?.externalCaseRegistrationNumber) ?? errandCaseRegistrationNumber,
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
    permitType: written('permitType', stringAt(objectAt(json?.permit).type)),
    permitCaseNumber: written('permitCaseNumber', stringAt(objectAt(json?.permit).caseNumber)),
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
 * A decision still being drafted follows the investigation for as long as the handler leaves a field as prefilled.
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
  const start = valuesOf(input, true);
  const asSaved = valuesOf(input, false);
  const [values, setValues] = useState(start);

  const version = input.decision?.id ? `${input.decision.id}:${input.decision.version ?? ''}` : 'new';
  const [filledFrom, setFilledFrom] = useState(version);
  const [prefilled, setPrefilled] = useState(input.prefill);
  if (version !== filledFrom) {
    setFilledFrom(version);
    setPrefilled(input.prefill);
    setValues(start);
  } else if (!sameJson(input.prefill, prefilled)) {
    setPrefilled(input.prefill);
    if (!input.decision?.id || (followsWhileDraft(input.permitType) && isSupportDecisionDraft(input.decision))) {
      setValues((current) => stillFollowingThePrefill(current, prefilled, input.prefill));
    }
  }

  const set = useCallback(
    <K extends keyof DecisionFormValues>(key: K, value: DecisionFormValues[K]) =>
      setValues((current) => ({ ...current, [key]: value })),
    []
  );

  const held = comparable(values, input.premisesToSend);
  const edited = input.editable && held !== comparable(start, input.savedPremises);
  // A decision that does not exist yet is created by what the handler does, never by what the investigation
  // filled in; one that does is written with the texts it has nothing saved in.
  const unwritten = input.decision?.id ? input.editable && held !== comparable(asSaved, input.savedPremises) : edited;

  return { values, set, edited, unwritten };
};
