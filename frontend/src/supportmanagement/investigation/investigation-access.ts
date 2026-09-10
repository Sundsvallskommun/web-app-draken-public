import type { InvestigationProfile } from './investigation-profile';

/** Document grants are scoped to the selected errand; the application profile carries no grants. */
export type InvestigationDocumentAccess = 'edit' | 'read' | 'hidden';

export interface InvestigationAccess {
  readonly municipalityId: string;
  readonly errandId: string;
  readonly documents: ReadonlyMap<string, InvestigationDocumentAccess>;
}

export type InvestigationAccessState =
  | { readonly status: 'loading' | 'disabled' | 'error' | 'denied' }
  | { readonly status: 'ready'; readonly access: InvestigationAccess };

const invalidAccess = (): never => {
  throw new Error('Behörigheterna för ärendets dokument kunde inte läsas.');
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export function parseInvestigationAccess(
  value: unknown,
  municipalityId: string,
  errandId: string
): InvestigationAccess {
  if (
    !isRecord(value) ||
    value.municipalityId !== municipalityId ||
    value.errandId !== errandId ||
    !Array.isArray(value.documents)
  )
    return invalidAccess();

  const documents = new Map<string, InvestigationDocumentAccess>();
  for (const entry of value.documents) {
    if (
      !isRecord(entry) ||
      typeof entry.key !== 'string' ||
      !entry.key.trim() ||
      documents.has(entry.key) ||
      (entry.access !== 'edit' && entry.access !== 'read' && entry.access !== 'hidden')
    )
      return invalidAccess();
    documents.set(entry.key, entry.access);
  }
  return { municipalityId, errandId, documents };
}

export const investigationDocumentAccess = (
  state: InvestigationAccessState,
  key: string
): InvestigationDocumentAccess => (state.status === 'ready' ? state.access.documents.get(key) ?? 'hidden' : 'hidden');

/** The generic JSON view must respect the same grants for documents this profile owns. */
export const isInvestigationParameterReadable = (
  profile: InvestigationProfile | null,
  state: InvestigationAccessState,
  key: string
): boolean =>
  !profile?.documents.some((document) => document.key === key) ||
  state.status === 'disabled' ||
  investigationDocumentAccess(state, key) !== 'hidden';
