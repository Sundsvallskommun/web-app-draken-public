import { NamespaceConfig } from '@/data-contracts/supportmanagement/data-contracts';
import { FTCaseType, MEXCaseType } from '@/interfaces/case-type.interface';

import { getNewErrandDefaults } from './support-errand.service';

/** A casedata namespace that support errands are forwarded to (a casedata forward, never a handover). */
export interface CasedataForwardTarget {
  namespace: string;
  displayName: string;
  shortCode: string;
  /** Case type of the errand created in the target namespace. */
  caseType: string;
}

const CASEDATA_FORWARD_TARGETS: CasedataForwardTarget[] = [
  {
    namespace: 'SBK_MEX',
    displayName: 'Mark och exploatering (MEX)',
    shortCode: 'MEX',
    caseType: MEXCaseType.MEX_FORWARDED_FROM_CONTACTSUNDSVALL,
  },
  {
    namespace: 'SBK_PARKING_PERMIT',
    displayName: 'Parkeringstillstånd/Färdtjänst',
    shortCode: 'PT',
    caseType: FTCaseType.PARATRANSIT_FROM_KS,
  },
];

export const getCasedataForwardTarget = (namespace?: string): CasedataForwardTarget | undefined =>
  CASEDATA_FORWARD_TARGETS.find(target => target.namespace === namespace);

export const isCasedataForwardTarget = (namespace?: string): boolean => !!getCasedataForwardTarget(namespace);

// HANDOVER_TARGETS holds the namespaces this drake may hand errands over to, comma-separated in display
// order, e.g. "CONTACTCENTER,LOK,SBK_MEX". Matched exactly, case included. Empty means none.
// Read at call time so tests can vary it.
export const getAllowedHandoverTargets = (): string[] =>
  (process.env.HANDOVER_TARGETS ?? '')
    .split(',')
    .map(target => target.trim())
    .filter(Boolean);

export const isAllowedHandoverTarget = (namespace?: string): boolean => !!namespace && getAllowedHandoverTargets().includes(namespace);

/**
 * Targets whose label tree sits under a ROOT label, and the application whose new-errand classification a
 * handed-over errand gets (SupportManagement requires one).
 */
const LABEL_CATEGORIZATION_TARGETS: Record<string, { categorizationRoot: string; application: string }> = {
  CONTACTSUNDSVALL: { categorizationRoot: 'CATEGORIZATION_ROOT', application: 'KC' },
};

export interface LabelCategorizationTarget {
  categorizationRoot: string;
  classification?: { category: string; type: string };
}

export const getLabelCategorizationTarget = (namespace?: string): LabelCategorizationTarget | undefined => {
  const target = namespace ? LABEL_CATEGORIZATION_TARGETS[namespace] : undefined;
  return target && { categorizationRoot: target.categorizationRoot, classification: getNewErrandDefaults(target.application)?.classification };
};

/** Namespace config plus, for a label-categorization target, the ROOT label holding its tree. */
export type HandoverTargetConfig = NamespaceConfig & { categorizationRoot?: string };
