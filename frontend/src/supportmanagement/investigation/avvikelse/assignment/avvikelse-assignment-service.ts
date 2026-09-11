import { apiService } from '@common/services/api-service';
import type { AxiosError } from 'axios';

/** The named handovers the backend implements. The client names the step and never composes it. */
export type InvestigationHandoverStep = 'assign-lex' | 'return-to-manager';

export interface UnitManagerCandidate {
  adAccount: string;
  displayName: string;
  /** The AccessMapper role this person holds for the place, e.g. `UNIT_MANAGER`. */
  roleKey: string;
}

/** One heading in the picker. The labels come from the backend so they are defined in one place. */
export interface ManagerRoleOption {
  key: string;
  label: string;
}

export interface UnitManagerResponse {
  /** The managers for the place, most specific access first. */
  candidates: UnitManagerCandidate[];
  roles: ManagerRoleOption[];
  locationResourcePath: string;
  /** The place's name. Show this, never the resource path - that is an identity, not a label. */
  locationDisplayName: string;
}

/**
 * Resolves who the errand goes back to, so the choice can be shown before it is made. The backend
 * resolves it again when the handover is applied; this is a preview, never the decision itself.
 */
export const getUnitManager = (municipalityId: string, errandId: string): Promise<UnitManagerResponse> =>
  apiService
    .get<UnitManagerResponse>(`supporterrands/${municipalityId}/${errandId}/unit-manager`)
    .then((res) => res.data);

/**
 * Applies one handover step.
 *
 * Answers 204 and returns nothing to read back: a step that moves access has usually just taken the
 * errand away from the caller, so there is no errand left for them to fetch. The caller navigates
 * away instead of refreshing.
 */
export const applyInvestigationHandover = async (
  municipalityId: string,
  errandId: string,
  step: InvestigationHandoverStep,
  expectedVersion: number,
  assignedUserId?: string
): Promise<void> => {
  const body = { expectedVersion, ...(assignedUserId ? { assignedUserId } : {}) };
  await apiService.post<void, typeof body>(
    `supporterrands/${municipalityId}/${errandId}/investigation-handover/${step}`,
    body
  );
};

const conflictMessages: Record<string, string> = {
  409: 'Ärendet har ändrats sedan det laddades, eller saknar den information som behövs. Ladda om ärendet och försök igen.',
  412: 'Ärendet har ändrats av någon annan. Ladda om ärendet och försök igen.',
  403: 'Du saknar behörighet att utföra det här steget.',
};

/** Turns a failed handover into something a handler can act on, keeping the backend's own reason when it has one. */
export const investigationHandoverErrorMessage = (error: unknown, fallback: string): string => {
  const response = (error as AxiosError<{ message?: string }>)?.response;
  const apiMessage = response?.data?.message;
  if (apiMessage) return apiMessage;

  const statusMessage = response?.status ? conflictMessages[String(response.status)] : undefined;
  if (statusMessage) return statusMessage;

  if (error instanceof Error && error.message) return error.message;
  return fallback;
};
