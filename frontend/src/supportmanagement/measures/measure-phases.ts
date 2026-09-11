/**
 * The phases the measures belong to.
 *
 * Åtgärder are decided while the errand is investigated, and they are followed up once it has been
 * decided - so each tab is offered from its own phase onward. The names are the namespace's, read
 * from the phase metadata; a deployment whose phase model does not use them, or runs no workflow at
 * all, keeps both tabs exactly as it had them before the phases existed.
 */
export const MEASURES_PHASE_NAME = 'Utredning';
export const MEASURE_FOLLOW_UP_PHASE_NAME = 'Beslut';
