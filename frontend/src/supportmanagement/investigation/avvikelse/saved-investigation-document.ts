import type { SupportErrand } from '@supportmanagement/services/support-errand-service';

import type { InvestigationProfile, InvestigationProfileDocument } from '../investigation-profile';
import type { InvestigationFormData } from './investigation-document';

/** The profile's document for one of the fixed avvikelse schema roles, such as `utredning-enhetschef`. */
export const findInvestigationDocumentBySchemaName = (
  profile: InvestigationProfile | null | undefined,
  schemaName: string
): InvestigationProfileDocument | undefined =>
  profile?.documents.find((document) => document.schemaName === schemaName);

/**
 * A document as it is saved on the errand. Only the saved document counts as an assessment: an answer
 * still in an open form is not one, so the form is never consulted here.
 */
export const readSavedInvestigationDocument = (
  errand: SupportErrand | undefined,
  key: string | undefined
): InvestigationFormData | undefined => {
  const saved: unknown = key ? errand?.jsonParameters?.find((parameter) => parameter.key === key)?.value : undefined;
  return typeof saved === 'object' && saved !== null && !Array.isArray(saved)
    ? (saved as InvestigationFormData)
    : undefined;
};
