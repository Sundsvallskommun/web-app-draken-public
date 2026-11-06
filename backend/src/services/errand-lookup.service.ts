import { User } from '@interfaces/users.interface';
import { logger } from '@utils/logger';
import { apiURL } from '@utils/util';

import { CASEDATA_NAMESPACE, SUPPORTMANAGEMENT_NAMESPACE } from '@/config';
import { apiServiceName } from '@/config/api-config';
import { Errand as ErrandDTO } from '@/data-contracts/case-data/data-contracts';
import { mapWithConcurrency } from '@/utils/concurrency';

import ApiService from './api.service';

const ERRAND_LOOKUP_CONCURRENCY = 8;

/** The errand services an asset's source errand can live in. */
export type ErrandService = 'case-data' | 'supportmanagement';
const SERVICE_NAMES: Record<ErrandService, string> = {
  'case-data': apiServiceName('case-data'),
  supportmanagement: apiServiceName('supportmanagement'),
};
const DEFAULT_NAMESPACES: Record<ErrandService, string | undefined> = {
  'case-data': CASEDATA_NAMESPACE,
  supportmanagement: SUPPORTMANAGEMENT_NAMESPACE,
};

export type ErrandLookupRef = { id: string; namespace?: string; service?: ErrandService };

export const fetchErrandNumberById = async (
  municipalityId: string,
  errandId: string,
  user: User,
  namespace?: string,
  service: ErrandService = 'case-data',
): Promise<string | undefined> => {
  if (!errandId) return undefined;
  const effectiveNamespace = namespace ?? DEFAULT_NAMESPACES[service];
  const apiService = new ApiService();
  const baseURL = apiURL(SERVICE_NAMES[service]);
  const url = `${municipalityId}/${effectiveNamespace}/errands/${errandId}`;
  try {
    const res = await apiService.get<ErrandDTO>({ url, baseURL }, user);
    return res.data?.errandNumber ?? undefined;
  } catch (e) {
    logger.error(`Failed to fetch errandNumber for ${effectiveNamespace}/${errandId}: `, e);
    return undefined;
  }
};

export const fetchErrandNumbersByIds = async (municipalityId: string, refs: ErrandLookupRef[], user: User): Promise<Map<string, string>> => {
  const uniqueByKey = new Map<string, ErrandLookupRef>();
  for (const ref of refs) {
    if (!ref?.id) continue;
    const service = ref.service ?? 'case-data';
    const namespace = ref.namespace ?? DEFAULT_NAMESPACES[service];
    uniqueByKey.set(`${service}|${namespace}|${ref.id}`, { id: ref.id, namespace, service });
  }

  const entries = await mapWithConcurrency(
    Array.from(uniqueByKey.values()),
    ERRAND_LOOKUP_CONCURRENCY,
    async ref => [ref.id, await fetchErrandNumberById(municipalityId, ref.id, user, ref.namespace, ref.service)] as const,
  );
  return new Map(entries.filter((entry): entry is readonly [string, string] => !!entry[1]));
};
