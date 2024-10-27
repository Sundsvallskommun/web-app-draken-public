import { Decision } from './decision.interface';

export type AssetStatus = 'ACTIVE' | 'EXPIRED' | 'BLOCKED';

export interface ParkingPermit {
  artefactPermitNumber: string;
  artefactPermitStatus: string;
  errandId: number;
  errandDecision: Decision;
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
