import { User } from '@interfaces/users.interface';
import { logger } from '@utils/logger';
import { apiURL } from '@utils/util';

import { CASEDATA_NAMESPACE } from '@/config';
import { apiServiceName } from '@/config/api-config';
import { Errand as ErrandDTO } from '@/data-contracts/case-data/data-contracts';

import ApiService from './api.service';

const CASEDATA_SERVICE = apiServiceName('case-data');
const ERRAND_LOOKUP_CONCURRENCY = 8;

const mapWithConcurrency = async <T, R>(items: T[], concurrency: number, mapper: (item: T) => Promise<R>): Promise<R[]> => {
  const results: R[] = [];
  let nextIndex = 0;

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (nextIndex < items.length) {
      const index = nextIndex++;
      results[index] = await mapper(items[index]);
    }
  });

  await Promise.all(workers);
  return results;
};

export const fetchErrandNumberById = async (municipalityId: string, errandId: string, user: User): Promise<string | undefined> => {
  if (!errandId) return undefined;
  const apiService = new ApiService();
  const baseURL = apiURL(CASEDATA_SERVICE);
  const url = `${municipalityId}/${CASEDATA_NAMESPACE}/errands/${errandId}`;
  try {
    const res = await apiService.get<ErrandDTO>({ url, baseURL }, user);
    return res.data?.errandNumber ?? undefined;
  } catch (e) {
    logger.error(`Failed to fetch errandNumber for ${errandId}: `, e);
    return undefined;
  }
};

export const fetchErrandNumbersByIds = async (municipalityId: string, errandIds: string[], user: User): Promise<Map<string, string>> => {
  const unique = Array.from(new Set(errandIds.filter(Boolean)));
  const entries = await mapWithConcurrency(
    unique,
    ERRAND_LOOKUP_CONCURRENCY,
    async id => [id, await fetchErrandNumberById(municipalityId, id, user)] as const,
  );
  return new Map(entries.filter((entry): entry is readonly [string, string] => !!entry[1]));
};
