import { apiService } from '@common/services/api-service';
import type { AxiosError } from 'axios';

import type { InvestigationDocumentKey, InvestigationFormData } from './investigation-document';

export interface SupportInvestigationDocument {
  key: InvestigationDocumentKey;
  value: InvestigationFormData;
  schemaId: string;
  version?: number;
}

export interface LoadedSupportInvestigationDocument {
  document: SupportInvestigationDocument;
  etag?: string;
}

export interface SaveSupportInvestigationDocumentRequest {
  schemaId: string;
  value: InvestigationFormData;
}

const documentUrl = (municipalityId: string, errandId: string, key: InvestigationDocumentKey): string =>
  `supporterrands/${municipalityId}/${errandId}/json-parameters/${encodeURIComponent(key)}`;

export async function getSupportInvestigationDocument(
  municipalityId: string,
  errandId: string,
  key: InvestigationDocumentKey
): Promise<LoadedSupportInvestigationDocument | undefined> {
  try {
    const response = await apiService.get<SupportInvestigationDocument>(documentUrl(municipalityId, errandId, key));
    return {
      document: response.data,
      etag: response.headers.etag,
    };
  } catch (error) {
    if ((error as AxiosError).response?.status === 404) return undefined;
    throw error;
  }
}

export async function saveSupportInvestigationDocument(
  municipalityId: string,
  errandId: string,
  key: InvestigationDocumentKey,
  data: SaveSupportInvestigationDocumentRequest,
  etag?: string
): Promise<LoadedSupportInvestigationDocument> {
  const response = await apiService.put<SupportInvestigationDocument, SaveSupportInvestigationDocumentRequest>(
    documentUrl(municipalityId, errandId, key),
    data,
    etag ? { headers: { 'If-Match': etag } } : undefined
  );

  return {
    document: response.data,
    etag: response.headers.etag,
  };
}

export function isSupportInvestigationConflict(error: unknown): boolean {
  const status = (error as AxiosError).response?.status;
  return status === 409 || status === 412;
}
