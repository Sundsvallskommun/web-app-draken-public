import { typedLinesOf } from '@supportmanagement/services/support-investigation-basis-service';
import { sectionKeyOf } from '@supportmanagement/services/support-investigation-sections';
import type { SupportInvestigation } from '@supportmanagement/services/support-investigation-service';

import { type DecisionPrefill, NO_DECISION_PREFILL } from './use-decision-form';

/**
 * Which examination each paragraph of the decision starts from. The action errand examines the faults, what the
 * permit holder has said about them and what follows, which is what the decision has to justify.
 */
const SECTION_OF_PARAGRAPH: Record<keyof Omit<DecisionPrefill, 'clauses'>, string> = {
  justificationDeficiencies: 'established_faults',
  justificationStatement: 'permit_holder_statement',
  justificationOutcome: 'assessment',
};

/** The text of the examination as the handler wrote it, without the editor's markup. */
const examinationText = (investigation: SupportInvestigation | undefined, sectionKey: string): string => {
  const section = (investigation?.sections ?? []).find((candidate) => sectionKeyOf(candidate) === sectionKey);
  return typedLinesOf(section?.text).join('\n');
};

/** What a decision not yet saved starts from, read off the investigation the decision rests on. */
export const decisionPrefillOf = (investigation: SupportInvestigation | undefined): DecisionPrefill => ({
  ...NO_DECISION_PREFILL,
  clauses: typedLinesOf(investigation?.summary).join('\n'),
  justificationDeficiencies: examinationText(investigation, SECTION_OF_PARAGRAPH.justificationDeficiencies),
  justificationStatement: examinationText(investigation, SECTION_OF_PARAGRAPH.justificationStatement),
  justificationOutcome: examinationText(investigation, SECTION_OF_PARAGRAPH.justificationOutcome),
});
