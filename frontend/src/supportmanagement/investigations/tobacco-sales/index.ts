import type { ExaminedInvestigation } from '../types';

export const TOBACCO_SALES_INVESTIGATION: ExaminedInvestigation = {
  resourceNames: ['TOBACCO', 'SALES_PERMIT_APPLICATION'],
  body: 'sections',
  introKey: 'common:investigation.intro_tobacco',
  sections: [
    'statements',
    'ownership',
    'persons_of_influence',
    'financial_suitability',
    'sales_point',
    'lease',
    'self_monitoring',
    'communication',
    'legal_basis',
  ],
  basisTemplate: 'tobacco-sales-decision-basis',
  legalBasisTemplate: 'tobacco-sales-legal-basis',
};
