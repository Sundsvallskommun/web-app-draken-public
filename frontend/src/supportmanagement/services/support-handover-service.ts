import {
  HandoverErrand,
  HandoverErrandRequest,
  HandoverPreview,
  HandoverPreviewRequest,
  MetadataResponse,
  NamespaceConfig,
} from '@common/data-contracts/supportmanagement/data-contracts';
import { apiService } from '@common/services/api-service';
import { AxiosError } from 'axios';

/**
 * Error thrown by executeHandover/getHandoverPreview when the BFF responds with a 4xx. Carries the
 * upstream status and message so the UI can surface the error in context (at the right field where
 * possible).
 */
export class HandoverError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = 'HandoverError';
    this.status = status;
  }
}

const toHandoverError = (error: unknown): HandoverError => {
  const axiosError = error as AxiosError<{ message?: string }>;
  const status = axiosError?.response?.status;
  const message = axiosError?.response?.data?.message || 'Något gick fel när ärendet skulle lämnas över';
  return new HandoverError(message, status);
};

/**
 * Lists namespace configurations the errand can be handed over to. Filtering by write access is
 * enforced by the execute endpoint (4xx), so all configs are returned here.
 */
export const getNamespaceConfigs = (municipalityId: string): Promise<NamespaceConfig[]> => {
  return apiService
    .get<NamespaceConfig[]>(`supportnamespaceconfigs/${municipalityId}`)
    .then((res) => res.data ?? [])
    .catch(() => []);
};

/**
 * Fetches the metadata for the target namespace. Used for display names (two-level) and the label
 * tree (three-level classification). Best-effort: returns an empty object on failure.
 */
export const getNamespaceMetadata = (municipalityId: string, namespace: string): Promise<MetadataResponse> => {
  return apiService
    .get<MetadataResponse>(`supportnamespacemetadata/${municipalityId}/${namespace}`)
    .then((res) => res.data ?? {})
    .catch(() => ({}));
};

/**
 * Fetches a handover mapping suggestion for the given source errand and target namespace. Has no
 * side effects on the source errand.
 */
export const getHandoverPreview = (
  municipalityId: string,
  errandId: string,
  body: HandoverPreviewRequest
): Promise<HandoverPreview> => {
  return apiService
    .post<HandoverPreview, HandoverPreviewRequest>(
      `supporterrands/${municipalityId}/${errandId}/handover/preview`,
      body
    )
    .then((res) => res.data)
    .catch((error) => {
      throw toHandoverError(error);
    });
};

/**
 * Executes the handover, creating a new errand in the target namespace. The idempotency key must be
 * reused across retries so the user does not accidentally create duplicate errands. The optional
 * message is added as an internal conversation on the new errand by the BFF.
 */
export const executeHandover = (
  municipalityId: string,
  errandId: string,
  body: HandoverErrandRequest,
  idempotencyKey: string,
  message?: string
): Promise<HandoverErrand> => {
  const payload = { ...body, message };
  return apiService
    .post<HandoverErrand, HandoverErrandRequest & { message?: string }>(
      `supporterrands/${municipalityId}/${errandId}/handover`,
      payload,
      { headers: { 'Idempotency-Key': idempotencyKey } }
    )
    .then((res) => res.data)
    .catch((error) => {
      throw toHandoverError(error);
    });
};
