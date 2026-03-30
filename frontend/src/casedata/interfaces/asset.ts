export type AssetStatus = 'ACTIVE' | 'EXPIRED' | 'BLOCKED';
export enum assetStatusLabels {
  ACTIVE = 'Aktivt',
  EXPIRED = 'Utgånget',
  BLOCKED = 'Blockerat',
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
}

export interface UpdateAsset {
  validTo?: string | null;
  status?: AssetStatus;
  statusReason?: string;
  additionalParameters?: { [key: string]: string };
  jsonParameters?: JsonParameter[];
}
