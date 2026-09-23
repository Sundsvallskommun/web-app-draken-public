/** Casedata namespace of the MEX forward flow. */
export const MEX_HANDOVER_TARGET = 'SBK_MEX';

// HANDOVER_TARGETS holds the namespaces this drake may hand errands over to, comma-separated in display
// order, e.g. "CONTACTCENTER,LOK,SBK_MEX". Matched exactly, case included. Empty means none.
// Read at call time so tests can vary it.
export const getAllowedHandoverTargets = (): string[] =>
  (process.env.HANDOVER_TARGETS ?? '')
    .split(',')
    .map(target => target.trim())
    .filter(Boolean);

export const isAllowedHandoverTarget = (namespace?: string): boolean => !!namespace && getAllowedHandoverTargets().includes(namespace);
