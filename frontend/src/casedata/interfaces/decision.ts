import { Law } from '@common/data-contracts/case-data/data-contracts';

import { Attachment } from './attachment';
import { GenericExtraParameters } from './extra-parameters';
import { CreateStakeholderDto } from './stakeholder';

export interface Utredning {
  id?: string;
  created?: string;
  updated?: string;
  extraParameters?: GenericExtraParameters;
  decisionType: DecisionType;
  decisionOutcome: DecisionOutcome;
  description: string;
  law: Law[];
  attachments?: Attachment[];
}

export interface Decision {
  id?: number;
  created?: string;
  updated?: string;
  extraParameters?: GenericExtraParameters;
  decisionType: DecisionType;
  decisionOutcome: DecisionOutcome;
  description: string;
  law: Law[];
  decidedBy?: CreateStakeholderDto;
  decidedAt?: string;
  validFrom: string;
  validTo: string;
  attachments?: Attachment[];
}

export type DecisionType = 'PROPOSED' | 'RECOMMENDED' | 'FINAL' | 'UNKNOWN_DECISION_TYPE';

export enum DecisionOutcomes {
  Approval = 'APPROVAL',
  Rejection = 'REJECTION',
  Cancellation = 'CANCELLATION',
  Dismissal = 'DISMISSAL',
  Unknown = 'UNKNOWN_DECISION_OUTCOME',
}

export type DecisionOutcome = `${DecisionOutcomes}`;

export enum DecisionOutcomeLabel {
  'APPROVAL' = 'Bifall',
  'REJECTION' = 'Avslag',
  'CANCELLATION' = 'Ärendet avskrivs',
  'DISMISSAL' = 'Ärendet avvisas',
  'UNKNOWN_DECISION_OUTCOME' = 'Okänt',
}

export enum DecisionOutcomeKey {
  'Bifall' = 'APPROVAL',
  'Avslag' = 'REJECTION',
  'Ärendet avskrivs' = 'CANCELLATION',
  'Ärendet avvisas' = 'DISMISSAL',
  'Okänt' = 'UNKNOWN_DECISION_OUTCOME',
}

// Mirrors DecisionChannelResult in backend/src/dtos/message.dto.ts - keep the two in sync.
export type DecisionChannel = 'MINA_SIDOR' | 'KATLA' | 'DIGITAL_MAIL' | 'EMAIL' | 'WEBMESSAGE';
export type DecisionSendStatus = 'sent' | 'failed' | 'skipped';

export interface DecisionChannelResult {
  channel: DecisionChannel;
  status: DecisionSendStatus;
  data: { messageId?: string; reason?: string };
  message: string;
}

export const decisionChannelLabels: Record<DecisionChannel, string> = {
  MINA_SIDOR: 'Mina sidor',
  KATLA: 'Katla',
  DIGITAL_MAIL: 'digital post',
  EMAIL: 'e-post',
  WEBMESSAGE: 'webbmeddelande',
};
