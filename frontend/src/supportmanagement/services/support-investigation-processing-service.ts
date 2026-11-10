import type { CParameter } from 'src/data-contracts/backend/data-contracts';

import { getErrandParameterValue } from './support-errand-service';

// Set by the backend, never by the handler
const APPLICATION_COMPLETE_AT = 'APPLICATION_COMPLETE_AT';

export const supportApplicationCompleteAt = (parameters: CParameter[] | undefined): string =>
  getErrandParameterValue(parameters, APPLICATION_COMPLETE_AT);
