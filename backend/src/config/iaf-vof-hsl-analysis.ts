/** The schema of MAS/MAR's HSL event analysis, Händelseanalys HSL. */
export const IAF_VOF_HSL_ANALYSIS_SCHEMA_NAME = 'utredning-hsl';

/**
 * The label an IAF/VOF errand carries while MAS/MAR's initial assessment is that the event is analysed. Support
 * Management's subscription profile for the head of operations e-mails them from it.
 */
export const IAF_VOF_HSL_ANALYSIS_STARTED_LABEL = 'ANALYSIS/HSL_STARTED';

const ANALYSIS_DECISION_FIELD = 'analysisDecision';

/**
 * What MAS/MAR's saved initial assessment decides: `true` when the event is to be analysed, `false` when it is not,
 * and `undefined` while they have not decided - an analysis bound to a schema version before 1.5 never has.
 */
export const decidesHslAnalysis = (document: Readonly<Record<string, unknown>>): boolean | undefined => {
  const decision = document[ANALYSIS_DECISION_FIELD];
  if (decision === 'analyze') return true;
  if (decision === 'not_analyze') return false;
  return undefined;
};
