export const investigationDocumentKeys = ['utredning-enhetschef', 'utredning-sol-lss', 'utredning-hsl'] as const;

export type InvestigationDocumentKey = (typeof investigationDocumentKeys)[number];

export type InvestigationFormData = Record<string, unknown>;

export interface InvestigationDocumentDefinition {
  key: InvestigationDocumentKey;
  tabLabel: string;
  ownerLabel: string;
}

/**
 * The parameter key is also the JSON Schema name. Keeping those identities
 * together prevents a document from accidentally being saved against another
 * investigation schema.
 */
export const investigationDocuments: readonly InvestigationDocumentDefinition[] = [
  {
    key: 'utredning-enhetschef',
    tabLabel: 'Utredning enhetschef',
    ownerLabel: 'Enhetschef',
  },
  {
    key: 'utredning-sol-lss',
    tabLabel: 'Utredning SoL/LSS',
    ownerLabel: 'LEX-utredare',
  },
  {
    key: 'utredning-hsl',
    tabLabel: 'Utredning HSL',
    ownerLabel: 'MAS/MAR',
  },
];

const investigationDocumentKeySet = new Set<string>(investigationDocumentKeys);

export function isInvestigationDocumentKey(key: string): key is InvestigationDocumentKey {
  return investigationDocumentKeySet.has(key);
}
