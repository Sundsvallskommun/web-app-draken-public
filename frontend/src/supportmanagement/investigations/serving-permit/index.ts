import type { ExaminedInvestigation } from '../types';

export const SERVING_PERMIT_INVESTIGATION: ExaminedInvestigation = {
  resourceNames: ['ALCOHOL'],
  body: 'sections',
  introKey: 'common:investigation.intro',
  sections: [
    'persons_of_influence',
    'statements',
    'ownership',
    'financial_suitability',
    'premises',
    'lease',
    'fire_safety',
    'food_and_beverages',
    'staffing',
    'communication',
    'child_perspective',
    'marketing',
    'legal_basis',
  ],
  basisTemplate: 'serving-permit-decision-basis',
  legalBasisTemplate: 'serving-permit-legal-basis',
};
