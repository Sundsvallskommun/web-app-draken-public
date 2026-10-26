import type { CParameter } from 'src/data-contracts/backend/data-contracts';

import { getErrandParameterValue, upsertErrandParameter } from './support-errand-service';

const APPLICATION_COMPLETE_AT = { key: 'APPLICATION_COMPLETE_AT', displayName: 'Ansökan komplett' };

export const supportApplicationCompleteAt = (parameters: CParameter[] | undefined): string =>
  getErrandParameterValue(parameters, APPLICATION_COMPLETE_AT.key);

export const withSupportApplicationCompleteAt = (parameters: CParameter[] | undefined, value: string): CParameter[] =>
  upsertErrandParameter(parameters, APPLICATION_COMPLETE_AT.key, value, APPLICATION_COMPLETE_AT.displayName);
