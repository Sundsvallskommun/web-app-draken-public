export type AssetStatus = 'ACTIVE' | 'EXPIRED' | 'BLOCKED';
export enum assetStatusLabels {
  ACTIVE = 'Aktivt',
  EXPIRED = 'Utgånget',
  BLOCKED = 'Blockerat',
}

export enum assetTypeLabels {
  PARKINGPERMIT = 'P-tillstånd',
}
export interface Asset {
  id: string;
  assetId: string;
  origin: string;
  partyId: string;
  caseReferenceIds: string[];
  type: string;
  issued: string;
  validTo: string;
  status: AssetStatus;
  statusReason: string;
  description: string;
  additionalParameters: { [key: string]: string };
}

export interface UpdateAsset {
  caseReferenceIds: string[];
  validTo: string;
  status: AssetStatus;
  statusReason: string;
  additionalParameters: { [key: string]: string };
}
