import { resolveHighHslRisk } from '@/config/iaf-vof-high-hsl-risk';

const withHslRisk = (calculatedRiskValue: number) => ({ riskAssessmentHsl: { calculatedRiskValue } });

describe('resolveHighHslRisk', () => {
  it('asks for the label from an HSL risk value of 4 up, whether or not the investigation is completed', () => {
    expect(resolveHighHslRisk(withHslRisk(4))).toBe(true);
    expect(resolveHighHslRisk(withHslRisk(16))).toBe(true);
    expect(resolveHighHslRisk({ ...withHslRisk(6), completed: 'no' })).toBe(true);
  });

  it('asks for no label below 4, or without an HSL assessment', () => {
    expect(resolveHighHslRisk(withHslRisk(3))).toBe(false);
    expect(resolveHighHslRisk({ riskAssessmentSolLss: { calculatedRiskValue: 9 } })).toBe(false);
    expect(resolveHighHslRisk({})).toBe(false);
  });
});
