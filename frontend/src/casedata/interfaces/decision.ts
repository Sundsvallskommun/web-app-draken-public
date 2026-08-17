import { Law } from '@common/data-contracts/case-data/data-contracts';

import { Attachment } from './attachment';
import { GenericExtraParameters } from './extra-parameters';
import { CreateStakeholderDto } from './stakeholder';

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

export enum DecisionOutcomeKey {
  'Bifall' = 'APPROVAL',
  'Avslag' = 'REJECTION',
  'Ärendet avskrivs' = 'CANCELLATION',
  'Ärendet avvisas' = 'DISMISSAL',
  'Okänt' = 'UNKNOWN_DECISION_OUTCOME',
}
