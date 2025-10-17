export type AssetStatusDto = 'ACTIVE' | 'INACTIVE' | 'REVOKED' | 'EXPIRED' | string;

export interface CreateAssetDto {
  assetId: string;
  origin: string;
  partyId: string;
  caseReferenceIds?: string[];
  type: string;
  issued?: string | null;
  validTo?: string | null;
  status?: AssetStatusDto;
  statusReason?: string;
  description?: string;
  additionalParameters?: Record<string, unknown>;
  jsonParameters?: Array<{ key: string; value: string; schemaId?: string }>;
  created?: string;
  modified?: string;
}

export interface PatchAssetDto {
  caseReferenceIds?: string[];
  validTo?: string | null;
  status?: AssetStatusDto;
  statusReason?: string;
  additionalParameters?: Record<string, unknown>;
  jsonParameters?: Array<{ key: string; value: string; schemaId?: string }>;
}
