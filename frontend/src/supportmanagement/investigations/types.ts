import type { Sections } from '@supportmanagement/services/support-investigation-sections';

interface InvestigationOfItsOwn {
  resourceNames: readonly string[];
}

/** The permit area an investigation is about, for an errand type that covers both. */
export const InvestigationArea = {
  ALCOHOL: 'ALCOHOL',
  TOBACCO: 'TOBACCO',
} as const;

export type InvestigationAreaName = (typeof InvestigationArea)[keyof typeof InvestigationArea];

/** What an area decides: the legal basis it is written from. Which statements it offers is the referrals' own table. */
interface InvestigationOfArea {
  legalBasisTemplate: string;
}

export interface ExaminedInvestigation extends InvestigationOfItsOwn {
  body: 'sections';
  introKey: string;
  sections: readonly Sections[];
  basisTemplate?: string;
  legalBasisTemplate?: string;
  /**
   * Set where the errand type alone does not say which permit area the errand is about. The handler picks one, and
   * it decides the legal basis and the statements; the variant's own legalBasisTemplate is then left unset.
   */
  areas?: Record<InvestigationAreaName, InvestigationOfArea>;
}

export interface ProtocolInvestigation extends InvestigationOfItsOwn {
  body: 'protocol';
}

export type InvestigationVariant = ExaminedInvestigation | ProtocolInvestigation;
