import { ApiPagingData } from '@supportmanagement/interfaces/errand';
import { ParsedSupportRevisionDifference } from './supportRevisionDiff';

export const typeMap = {
  CREATE: 'Skapa',
  UPDATE: 'Uppdatera',
  DELETE: 'Ta bort',
  UNKNOWN: 'Okänd',
};

export interface SupportEvent {
  type: keyof typeof typeMap;
  message: string;
  owner: string;
  created: string;
  historyReference: string;
  sourceType: string;
  metadata: {
    key: string;
    value: string;
  }[];
}

export interface SupportEvents {
  content: SupportEvent[];
  pageable: ApiPagingData;
}

export interface ParsedSupportEvent extends SupportEvent {
  parsed: {
    event: string;
    datetime: string;
    version: string;
    executedBy: string;
    // diffList?: ParsedSupportRevisionDifference[];
  };
}
