import { User } from '@interfaces/users.interface';
import { logger } from '@utils/logger';
import { apiURL } from '@utils/util';

import { CASEDATA_NAMESPACE } from '@/config';
import { apiServiceName } from '@/config/api-config';
import { Errand as ErrandDTO } from '@/data-contracts/case-data/data-contracts';
import { mapWithConcurrency } from '@/utils/concurrency';

import ApiService from './api.service';

const CASEDATA_SERVICE = apiServiceName('case-data');
const ERRAND_LOOKUP_CONCURRENCY = 8;

export type ErrandLookupRef = { id: string; namespace?: string };

export const fetchErrandNumberById = async (
  municipalityId: string,
  errandId: string,
  user: User,
  namespace?: string,
): Promise<string | undefined> => {
  if (!errandId) return undefined;
  const effectiveNamespace = namespace ?? CASEDATA_NAMESPACE;
  const apiService = new ApiService();
  const baseURL = apiURL(CASEDATA_SERVICE);
  const url = `${municipalityId}/${effectiveNamespace}/errands/${errandId}`;
  try {
    const res = await apiService.get<ErrandDTO>({ url, baseURL }, user);
    return res.data?.errandNumber ?? undefined;
  } catch (e) {
    logger.error(`Failed to fetch errandNumber for ${effectiveNamespace}/${errandId}: `, e);
    return undefined;
  }
};

export const fetchErrandNumbersByIds = async (
  municipalityId: string,
  refs: ErrandLookupRef[],
  user: User,
): Promise<Map<string, string>> => {
  const uniqueByKey = new Map<string, ErrandLookupRef>();
  for (const ref of refs) {
    if (!ref?.id) continue;
    const namespace = ref.namespace ?? CASEDATA_NAMESPACE;
    uniqueByKey.set(`${namespace}|${ref.id}`, { id: ref.id, namespace });
  }

  const entries = await mapWithConcurrency(
    Array.from(uniqueByKey.values()),
    ERRAND_LOOKUP_CONCURRENCY,
    async ref => [ref.id, await fetchErrandNumberById(municipalityId, ref.id, user, ref.namespace)] as const,
  );
  return new Map(entries.filter((entry): entry is readonly [string, string] => !!entry[1]));
};
