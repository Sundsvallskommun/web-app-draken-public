import { User } from '@interfaces/users.interface';
import { logger } from '@utils/logger';
import { apiURL } from '@utils/util';

import { CASEDATA_NAMESPACE } from '@/config';
import { apiServiceName } from '@/config/api-config';
import { Relation, RelationPagedResponse, ResourceIdentifier } from '@/data-contracts/relations/data-contracts';
import { mapWithConcurrency } from '@/utils/concurrency';

import ApiService from './api.service';

const RELATIONS_SERVICE = apiServiceName('relations');
const RELATIONS_PAGE_LIMIT = 200;
const RELATION_LOOKUP_CONCURRENCY = 8;
const LINK_RELATION_TYPE = 'LINK';

const CASE_SOURCE = { type: 'case', service: 'case-data' } as const;
const ASSET_TARGET = { type: 'asset', service: 'partyassets' } as const;

const isCaseSource = (relation: Relation): boolean => relation.source?.service === CASE_SOURCE.service && relation.source?.type === CASE_SOURCE.type;

const isAssetTarget = (relation: Relation): boolean =>
  relation.target?.service === ASSET_TARGET.service && relation.target?.type === ASSET_TARGET.type;

const isErrandAssetLink = (relation: Relation): boolean => relation.type === LINK_RELATION_TYPE && isCaseSource(relation) && isAssetTarget(relation);

const buildErrandSource = (errandId: string): ResourceIdentifier => ({
  ...CASE_SOURCE,
  resourceId: errandId,
  namespace: CASEDATA_NAMESPACE,
});

const buildAssetTarget = (assetId: string): ResourceIdentifier => ({
  ...ASSET_TARGET,
  resourceId: assetId,
});

const buildFilterClause = (field: 'source.resourceId' | 'target.resourceId', value: string): string =>
  `filter=${field}%3A%27${encodeURIComponent(value)}%27`;

const listRelationsBy = async (
  municipalityId: string,
  field: 'source.resourceId' | 'target.resourceId',
  value: string,
  user: User,
): Promise<Relation[]> => {
  if (!value) return [];
  const apiService = new ApiService();
  const baseURL = apiURL(RELATIONS_SERVICE);
  const relations: Relation[] = [];
  let currentPage = 1;
  let totalPages = 1;

  try {
    while (currentPage <= totalPages) {
      const url = `${municipalityId}/relations?${buildFilterClause(field, value)}&page=${currentPage}&limit=${RELATIONS_PAGE_LIMIT}`;
      const res = await apiService.get<RelationPagedResponse>({ url, baseURL }, user);
      relations.push(...(res.data?.relations ?? []));
      totalPages = res.data?._meta?.totalPages ?? 1;
      currentPage++;
    }
    return relations;
  } catch (e) {
    logger.error(`Error fetching relations by ${field}=${value}: `, e);
    throw e;
  }
};

export const createErrandAssetRelation = async (municipalityId: string, errandId: string, assetId: string, user: User): Promise<Relation | null> => {
  if (!errandId || !assetId) return null;
  const apiService = new ApiService();
  const baseURL = apiURL(RELATIONS_SERVICE);
  const url = `${municipalityId}/relations`;
  const body: Relation = {
    type: LINK_RELATION_TYPE,
    source: buildErrandSource(errandId),
    target: buildAssetTarget(assetId),
  };
  try {
    const res = await apiService.post<Relation, Relation>({ url, baseURL, data: body }, user);
    return res.data ?? null;
  } catch (e) {
    logger.error(`Failed to create errand→asset relation (errand=${errandId}, asset=${assetId}): `, e);
    throw e;
  }
};

export const findAssetIdsForErrand = async (municipalityId: string, errandId: string, user: User): Promise<Set<string>> => {
  const relations = await listRelationsBy(municipalityId, 'source.resourceId', errandId, user);
  return new Set(relations.filter(isErrandAssetLink).map(r => r.target.resourceId));
};

export type SourceErrandRef = { id: string; namespace?: string };

export const findSourceErrandIdForAsset = async (municipalityId: string, assetId: string, user: User): Promise<SourceErrandRef | undefined> => {
  const relations = await listRelationsBy(municipalityId, 'target.resourceId', assetId, user);
  const link = relations.find(isErrandAssetLink);
  if (!link?.source.resourceId) return undefined;
  return { id: link.source.resourceId, namespace: link.source.namespace ?? CASEDATA_NAMESPACE };
};

export const findSourceErrandsForAssets = async (municipalityId: string, assetIds: string[], user: User): Promise<Map<string, SourceErrandRef>> => {
  const unique = Array.from(new Set(assetIds.filter(Boolean)));
  const entries = await mapWithConcurrency(
    unique,
    RELATION_LOOKUP_CONCURRENCY,
    async id => [id, await findSourceErrandIdForAsset(municipalityId, id, user)] as const,
  );
  return new Map(entries.filter((entry): entry is readonly [string, SourceErrandRef] => !!entry[1]?.id));
};

export const deleteErrandAssetRelationsForAsset = async (municipalityId: string, assetId: string, user: User): Promise<void> => {
  if (!assetId) return;
  const relations = await listRelationsBy(municipalityId, 'target.resourceId', assetId, user);
  const ids = relations
    .filter(isErrandAssetLink)
    .map(r => r.id)
    .filter((id): id is string => !!id);
  if (ids.length === 0) return;

  const apiService = new ApiService();
  const baseURL = apiURL(RELATIONS_SERVICE);
  const results = await Promise.allSettled(
    ids.map(async id => {
      await apiService.delete({ url: `${municipalityId}/relations/${id}`, baseURL }, user);
      return id;
    }),
  );
  const failures = results
    .map((result, index) => ({ result, id: ids[index] }))
    .filter((entry): entry is { result: PromiseRejectedResult; id: string } => entry.result.status === 'rejected');
  if (failures.length > 0) {
    failures.forEach(failure => {
      logger.error(`Failed to delete relation ${failure.id}: `, failure.result.reason);
    });
    throw failures[0].result.reason;
  }
};
