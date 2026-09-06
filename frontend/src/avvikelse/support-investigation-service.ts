import { apiService } from '@common/services/api-service';
import type { AxiosError } from 'axios';

import type { InvestigationDocumentKey, InvestigationFormData } from './investigation-document';
import {
  type LoadedSupportInvestigationDocument,
  parseParentErrandVersion,
  parseSupportInvestigationDocument,
  type SavedSupportInvestigationDocument,
  type SupportInvestigationDocument,
} from './support-investigation-contract';

export type {
  LoadedSupportInvestigationDocument,
  SavedSupportInvestigationDocument,
  SupportInvestigationDocument,
} from './support-investigation-contract';

export interface SaveSupportInvestigationDocumentRequest {
  schemaId: string;
  value: InvestigationFormData;
}

const documentUrl = (municipalityId: string, errandId: string, key: InvestigationDocumentKey): string =>
  `supporterrands/${municipalityId}/${errandId}/json-parameters/${encodeURIComponent(key)}`;

const responseStatus = (error: unknown): number | undefined => {
  if (typeof error !== 'object' || error === null) return undefined;
  return (error as AxiosError).response?.status;
};

export async function getSupportInvestigationDocument(
  municipalityId: string,
  errandId: string,
  key: InvestigationDocumentKey
): Promise<LoadedSupportInvestigationDocument | undefined> {
  try {
    const response = await apiService.get<SupportInvestigationDocument>(documentUrl(municipalityId, errandId, key));
    return parseSupportInvestigationDocument(response.data, key, response.headers.etag);
  } catch (error) {
    if (responseStatus(error) === 404) return undefined;
    throw error;
  }
}

export async function saveSupportInvestigationDocument(
  municipalityId: string,
  errandId: string,
  key: InvestigationDocumentKey,
  data: SaveSupportInvestigationDocumentRequest,
  expectedParentErrandVersion: number,
  etag?: string
): Promise<SavedSupportInvestigationDocument> {
  const response = await apiService.put<SupportInvestigationDocument, SaveSupportInvestigationDocumentRequest>(
    documentUrl(municipalityId, errandId, key),
    data,
    {
      headers: {
        ...(etag ? { 'If-Match': etag } : { 'If-None-Match': '*' }),
        'X-Errand-Version': String(expectedParentErrandVersion),
      },
    }
  );

  const expectedStatus = etag ? 200 : 201;
  if (response.status !== expectedStatus) {
    throw new Error(`Utredningsdokumentet returnerade oväntad status ${response.status}.`);
  }

  return {
    ...parseSupportInvestigationDocument(response.data, key, response.headers.etag),
    parentErrandVersion: parseParentErrandVersion(response.headers['x-errand-version']),
  };
}

export function isSupportInvestigationConflict(error: unknown): boolean {
  const status = responseStatus(error);
  return status === 409 || status === 412 || status === 428;
}

export function isSupportInvestigationAccessDenied(error: unknown): boolean {
  const status = responseStatus(error);
  return status === 401 || status === 403;
}
