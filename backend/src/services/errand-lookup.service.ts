import { User } from '@interfaces/users.interface';
import { logger } from '@utils/logger';
import { apiURL } from '@utils/util';

import { CASEDATA_NAMESPACE, SUPPORTMANAGEMENT_NAMESPACE } from '@/config';
import { apiServiceName } from '@/config/api-config';
import { mapWithConcurrency } from '@/utils/concurrency';

import ApiService from './api.service';

const ERRAND_LOOKUP_CONCURRENCY = 8;

/** The errand services the drakes keep errands in. */
export type ErrandService = 'case-data' | 'supportmanagement';

/** An errand in one of the errand services. Without a namespace, this drake's namespace in that service is meant. */
export type ErrandRef = { id: string; service: ErrandService; namespace?: string };

const SERVICE_NAMES: Record<ErrandService, string> = {
  'case-data': apiServiceName('case-data'),
  supportmanagement: apiServiceName('supportmanagement'),
};

const DEFAULT_NAMESPACES: Record<ErrandService, string | undefined> = {
  'case-data': CASEDATA_NAMESPACE,
  supportmanagement: SUPPORTMANAGEMENT_NAMESPACE,
};

/** Relations spells the services in several ways ('support-management', 'SUPPORT_MANAGEMENT', 'casedata', …). */
export const normalizeService = (service: string | undefined): ErrandService | undefined => {
  const normalized = (service ?? '').toLowerCase().replace(/[-_]/g, '');
  if (normalized === 'supportmanagement') return 'supportmanagement';
  if (normalized === 'casedata') return 'case-data';
  return undefined;
};

export const withDefaultNamespace = (ref: ErrandRef): ErrandRef => ({ ...ref, namespace: ref.namespace ?? DEFAULT_NAMESPACES[ref.service] });

/** The errand's number, or undefined when the errand cannot be read. */
export const fetchErrandNumber = async (municipalityId: string, ref: ErrandRef, user: User): Promise<string | undefined> => {
  if (!ref.id) return undefined;
  const { namespace } = withDefaultNamespace(ref);
  const url = `${municipalityId}/${namespace}/errands/${ref.id}`;
  try {
    const res = await new ApiService().get<{ errandNumber?: string }>({ url, baseURL: apiURL(SERVICE_NAMES[ref.service]) }, user);
    return res.data?.errandNumber ?? undefined;
  } catch (e) {
    logger.error(`Failed to fetch errandNumber for ${ref.service}/${namespace}/${ref.id}: `, e);
    return undefined;
  }
};

/** Errand numbers by errand id; errands that cannot be read are left out. */
export const fetchErrandNumbers = async (municipalityId: string, refs: ErrandRef[], user: User): Promise<Map<string, string>> => {
  const unique = Array.from(new Map(refs.filter(ref => ref.id).map(ref => [ref.id, ref])).values());
  const entries = await mapWithConcurrency(
    unique,
    ERRAND_LOOKUP_CONCURRENCY,
    async ref => [ref.id, await fetchErrandNumber(municipalityId, ref, user)] as const,
  );
  return new Map(entries.filter((entry): entry is readonly [string, string] => !!entry[1]));
};
