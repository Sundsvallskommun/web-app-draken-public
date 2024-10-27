export interface Appeal {
  id?: number;
  version?: number;
  created?: string;
  updated?: string;
  description?: string;
  registeredAt?: string;
  appealConcernCommunicatedAt?: string;
  status?: string;
  timelinessReview?: string;
  decisionId?: number;
}

export interface RegisterAppeal {
  description?: string;
  registeredAt?: string;
  appealConcernCommunicatedAt?: string;
  status?: string;
  timelinessReview?: string;
  decisionId?: number;
}

export enum TimelinessReview {
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum TimelinessReviewLabel {
  APPROVED = 'Godkänn',
  REJECTED = 'Avslå',
}

export enum AppealStatus {
  NEW = 'NEW',
  REJECTED = 'REJECTED',
  SENT_TO_COURT = 'SENT_TO_COURT',
  COMPLETED = 'COMPLETED',
}

export enum AppealStatusLabels {
  NEW = 'Registrerad',
  REJECTED = 'Överklagan nekad',
  SENT_TO_COURT = 'Skickad till rättsinstans',
  COMPLETED = 'Överklagan beviljad',
}
