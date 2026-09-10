import type { Measure, MeasureType, Role } from '@common/data-contracts/supportmanagement/data-contracts';
import { apiService } from '@common/services/api-service';

import type { MeasureDecisionInput } from './measure-decision';

export interface MeasuresSnapshot {
  measures: Measure[];
  errandVersion: number;
  metadata: { measureTypes: MeasureType[]; roles: Role[] };
  creationRoles: Role[];
  registration: {
    status: 'ready' | 'unconfigured' | 'invalid';
    roleTypes: { roleName: string; measureTypeIds: string[]; decides: boolean }[];
  };
}

export type MeasureChanges = Pick<
  Measure,
  'measureTypeId' | 'responsibleUser' | 'goal' | 'description' | 'plannedStart' | 'plannedComplete' | 'executed'
>;

export type NewMeasure = MeasureChanges &
  Required<Pick<Measure, 'measureTypeId' | 'addedByRole' | 'goal' | 'description'>>;

const measuresUrl = (municipalityId: string, errandId: string) =>
  `supporterrands/${encodeURIComponent(municipalityId)}/${encodeURIComponent(errandId)}/measures`;

export async function getSupportMeasures(municipalityId: string, errandId: string): Promise<MeasuresSnapshot> {
  const response = await apiService.get<MeasuresSnapshot>(measuresUrl(municipalityId, errandId));
  return response.data;
}

export async function createSupportMeasure(municipalityId: string, errandId: string, data: NewMeasure): Promise<void> {
  await apiService.post<void, NewMeasure>(measuresUrl(municipalityId, errandId), data);
}

export async function updateSupportMeasure(
  municipalityId: string,
  errandId: string,
  measureId: string,
  version: Measure['version'],
  data: MeasureChanges
): Promise<void> {
  await apiService.patch<void, MeasureChanges>(
    `${measuresUrl(municipalityId, errandId)}/${encodeURIComponent(measureId)}`,
    data,
    { headers: { 'If-Match': measureETag(version) } }
  );
}

export async function decideSupportMeasure(
  municipalityId: string,
  errandId: string,
  measureId: string,
  version: Measure['version'],
  decision: MeasureDecisionInput
): Promise<void> {
  await apiService.patch<void, MeasureDecisionInput>(
    `${measuresUrl(municipalityId, errandId)}/${encodeURIComponent(measureId)}/decision`,
    decision,
    { headers: { 'If-Match': measureETag(version) } }
  );
}

function measureETag(version: Measure['version']): string {
  if (version === undefined || !Number.isSafeInteger(version) || version < 0) {
    throw new Error('A valid measure version is required before writing');
  }
  return `"${version}"`;
}
