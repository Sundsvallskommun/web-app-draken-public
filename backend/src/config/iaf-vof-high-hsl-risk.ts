/** The label an IAF/VOF errand carries while its completed investigation assesses a high HSL risk. */
export const IAF_VOF_HIGH_HSL_RISK_LABEL = 'RISK/HIGH_HSL';

/** The HSL risk value from which the risk is high - the investigation's own analysis threshold. */
const IAF_VOF_HIGH_HSL_RISK_THRESHOLD = 4;

const HSL_RISK_ASSESSMENT = 'riskAssessmentHsl';

/**
 * Whether the errand should carry the high HSL risk label, as the unit manager's investigation decides it.
 *
 * Only a completed investigation decides: until it is marked completed the answer is `undefined` and the
 * label is left as it is, so an assessment still being worked on never moves it. Once completed, the label
 * follows the calculated HSL risk value - present from the threshold up, absent below it or without an HSL
 * assessment at all.
 */
export const resolveHighHslRisk = (completed: boolean, document: Readonly<Record<string, unknown>>): boolean | undefined => {
  if (!completed) return undefined;
  const assessment = document[HSL_RISK_ASSESSMENT];
  const riskValue =
    typeof assessment === 'object' && assessment !== null && !Array.isArray(assessment)
      ? (assessment as Record<string, unknown>).calculatedRiskValue
      : undefined;
  return typeof riskValue === 'number' && riskValue >= IAF_VOF_HIGH_HSL_RISK_THRESHOLD;
};
