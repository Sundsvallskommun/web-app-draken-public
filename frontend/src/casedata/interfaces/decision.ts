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

export interface Law {
  heading: string;
  sfs: string;
  chapter: string;
  article: string;
}

export type DecisionType = 'PROPOSED' | 'RECOMMENDED' | 'FINAL' | 'UNKNOWN_DECISION_TYPE';

export type DecisionOutcome = 'APPROVAL' | 'REJECTION' | 'CANCELLATION' | 'DISMISSAL' | 'UNKNOWN_DECISION_OUTCOME';

export enum DecisionOutcomeLabel {
  'APPROVAL' = 'Bifall',
  'REJECTION' = 'Avslag',
  'CANCELLATION' = '',
  'DISMISSAL' = 'Ärendet avskrivs',
  'UNKNOWN_DECISION_OUTCOME' = 'Okänt',
}

export enum DecisionOutcomeKey {
  'Bifall' = 'APPROVAL',
  'Avslag' = 'REJECTION',
  'Ärendet avskrivs' = 'DISMISSAL',
  'Okänt' = 'UNKNOWN_DECISION_OUTCOME',
}
