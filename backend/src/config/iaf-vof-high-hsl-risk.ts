/** The label an IAF/VOF errand carries while its saved investigation assesses a high HSL risk. */
export const IAF_VOF_HIGH_HSL_RISK_LABEL = 'RISK/HIGH_HSL';

/** The HSL risk value from which the risk is high - the investigation's own analysis threshold. */
const IAF_VOF_HIGH_HSL_RISK_THRESHOLD = 4;

const HSL_RISK_ASSESSMENT = 'riskAssessmentHsl';

/**
 * Whether the errand should carry the high HSL risk label, as the unit manager's investigation decides it.
 *
 * Every save decides, completed or not: the label is what lets MAS/MAR reach the errand, and they are to reach
 * it as soon as a high risk is assessed rather than once the investigation is done. It follows the calculated
 * HSL risk value - present from the threshold up, absent below it or without an HSL assessment at all.
 */
export const resolveHighHslRisk = (document: Readonly<Record<string, unknown>>): boolean => {
  const assessment = document[HSL_RISK_ASSESSMENT];
  const riskValue =
    typeof assessment === 'object' && assessment !== null && !Array.isArray(assessment)
      ? (assessment as Record<string, unknown>).calculatedRiskValue
      : undefined;
  return typeof riskValue === 'number' && riskValue >= IAF_VOF_HIGH_HSL_RISK_THRESHOLD;
};
