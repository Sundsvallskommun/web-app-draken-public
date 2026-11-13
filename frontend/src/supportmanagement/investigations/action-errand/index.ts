import type { ExaminedInvestigation } from '../types';

/**
 * The action errand is not about whether someone is to be given a permit, but about whether the faults an
 * inspection found have been addressed. Its areas borrow their legal basis from the application that governs
 * the same trade, since that is where the law is written out.
 */
export const ACTION_ERRAND_INVESTIGATION: ExaminedInvestigation = {
  resourceNames: ['MEASURES'],
  body: 'sections',
  introKey: 'common:investigation.intro_action_errand',
  sections: [
    'statements',
    'established_faults',
    'permit_holder_statement',
    'measures_taken',
    'assessment',
    'legal_basis',
  ],
  areas: {
    ALCOHOL: { legalBasisTemplate: 'serving-permit-legal-basis' },
    TOBACCO: { legalBasisTemplate: 'tobacco-sales-legal-basis' },
  },
};
