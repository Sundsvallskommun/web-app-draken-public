/**
 * The statuses the permit register keeps. REVOKED is the municipality taking the permit, which is not the same
 * thing as EXPIRED, where it ran its time out; the next inspection has to be able to tell them apart.
 */
export type AssetStatus = 'DRAFT' | 'ACTIVE' | 'EXPIRED' | 'BLOCKED' | 'TEMPORARY' | 'REPLACED' | 'REVOKED';

export enum assetStatusLabels {
  DRAFT = 'Utkast',
  ACTIVE = 'Aktivt',
  EXPIRED = 'Utgånget',
  BLOCKED = 'Blockerat',
  TEMPORARY = 'Tillfälligt',
  REPLACED = 'Ersatt',
  REVOKED = 'Återkallat',
}

interface JsonParameter {
  key: string;
  value: string;
  schemaId: string;
}

export enum assetTypeLabels {
  PARKINGPERMIT = 'P-tillstånd',
}
export interface Asset {
  id: string;
  assetId?: string;
  origin?: string;
  partyId?: string;
  type?: string;
  title?: string;
  issued?: string;
  validTo?: string | null;
  status?: AssetStatus;
  statusReason?: string;
  description?: string;
  additionalParameters?: { [key: string]: string };
  jsonParameters?: JsonParameter[];
  sourceErrandId?: string;
  sourceErrandNumber?: string;
  sourceErrandNamespace?: string;
}

export interface AssetUpdateRequest {
  status?: AssetStatus;
  statusReason?: string;
}

export interface DraftAssetUpdateRequest {
  issued?: string;
  validTo?: string | null;
  indefinitely?: boolean;
  status?: AssetStatus;
  statusReason?: string;
  additionalParameters?: Record<string, string>;
  jsonParameters?: JsonParameter[];
}
