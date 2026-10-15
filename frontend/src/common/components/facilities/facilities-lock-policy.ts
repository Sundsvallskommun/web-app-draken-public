export type FacilitiesErrandDomain = 'support-management' | 'case-data';

interface FacilitiesLockSources {
  readonly supportManagement: () => boolean;
  readonly caseData: () => boolean;
}

/** Selects the lock owner by backend domain, independently of application name. */
export const resolveFacilitiesEditingLock = (
  domain: FacilitiesErrandDomain,
  sources: FacilitiesLockSources
): boolean => {
  switch (domain) {
    case 'support-management':
      return sources.supportManagement();
    case 'case-data':
      return sources.caseData();
  }
};
