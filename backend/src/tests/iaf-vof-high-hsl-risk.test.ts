import { resolveHighHslRisk } from '@/config/iaf-vof-high-hsl-risk';

const withHslRisk = (calculatedRiskValue: number) => ({ riskAssessmentHsl: { calculatedRiskValue } });

describe('resolveHighHslRisk', () => {
  it('leaves the label alone until the investigation is marked completed', () => {
    expect(resolveHighHslRisk(false, withHslRisk(16))).toBeUndefined();
    expect(resolveHighHslRisk(false, {})).toBeUndefined();
  });

  it('asks for the label from an HSL risk value of 4 up once completed', () => {
    expect(resolveHighHslRisk(true, withHslRisk(4))).toBe(true);
    expect(resolveHighHslRisk(true, withHslRisk(16))).toBe(true);
  });

  it('asks for no label below 4, or without an HSL assessment, once completed', () => {
    expect(resolveHighHslRisk(true, withHslRisk(3))).toBe(false);
    expect(resolveHighHslRisk(true, { riskAssessmentSolLss: { calculatedRiskValue: 9 } })).toBe(false);
    expect(resolveHighHslRisk(true, {})).toBe(false);
  });
});
