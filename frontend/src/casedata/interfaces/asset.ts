export type AssetStatus = 'DRAFT' | 'ACTIVE' | 'EXPIRED' | 'BLOCKED' | 'TEMPORARY';
export enum assetStatusLabels {
  DRAFT = 'Utkast',
  ACTIVE = 'Aktivt',
  EXPIRED = 'Utgånget',
  BLOCKED = 'Blockerat',
  TEMPORARY = 'Tillfälligt',
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
  issued?: string;
  validTo?: string | null;
  status?: AssetStatus;
  statusReason?: string;
  description?: string;
  additionalParameters?: { [key: string]: string };
  jsonParameters?: JsonParameter[];
  sourceErrandId?: string;
  sourceErrandNumber?: string;
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
