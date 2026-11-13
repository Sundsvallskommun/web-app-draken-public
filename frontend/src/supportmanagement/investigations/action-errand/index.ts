import type { ExaminedInvestigation } from '../types';

/**
 * The action errand is not about whether someone is to be given a permit, but about whether the faults an
 * inspection found have been addressed.
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
};
