import type { Sections } from '@supportmanagement/services/support-investigation-sections';

interface InvestigationOfItsOwn {
  resourceNames: readonly string[];
}

export interface ExaminedInvestigation extends InvestigationOfItsOwn {
  body: 'sections';
  introKey: string;
  sections: readonly Sections[];
  basisTemplate?: string;
}

export interface ProtocolInvestigation extends InvestigationOfItsOwn {
  body: 'protocol';
}

export type InvestigationVariant = ExaminedInvestigation | ProtocolInvestigation;
