import { User } from '@/interfaces/users.interface';
import { deleteErrandAssetRelationsForAsset, findAssetIdsForErrand, findSourceErrandsForAssets } from '@/services/asset-relations.service';

import {
  mockAdUsername,
  mockAssetId,
  mockCasedataErrandId,
  mockDepartment,
  mockMunicipalityId,
  mockRelationId,
  mockSecondaryAssetId,
  mockSupportErrandId,
  mockSupportNamespace,
} from './helpers/mock-data';

const { get, del } = vi.hoisted(() => ({ get: vi.fn(), del: vi.fn() }));

vi.mock('@/services/api.service', () => ({
  default: class {
    get = get;
    delete = del;
  },
  ApiResponse: class {},
}));

const user = { username: mockAdUsername } as User;
const caseDataId = String(mockCasedataErrandId);

const link = (source: { service: string; resourceId: string; namespace?: string }, assetId = mockAssetId, id = mockRelationId) => ({
  id,
  type: 'LINK',
  source: { type: 'case', ...source },
  target: { type: 'asset', service: 'partyassets', resourceId: assetId },
});
const caseDataLink = link({ service: 'case-data', resourceId: caseDataId, namespace: mockDepartment }, mockAssetId, 'case-data-link');
const supportLink = link(
  { service: 'supportmanagement', resourceId: mockSupportErrandId, namespace: mockSupportNamespace },
  mockAssetId,
  'support-link',
);

const givenRelations = (byFilterValue: Record<string, object[]>) =>
  get.mockImplementation(async ({ url }: { url: string }) => {
    const value = Object.keys(byFilterValue).find(key => url.includes(encodeURIComponent(key)));
    return { data: { relations: value ? byFilterValue[value] : [], _meta: { totalPages: 1 } } };
  });

beforeEach(() => {
  get.mockReset();
  del.mockReset();
});

describe('findSourceErrandsForAssets', () => {
  it('finds the source errand in either errand service', async () => {
    givenRelations({
      [mockAssetId]: [supportLink],
      [mockSecondaryAssetId]: [link({ service: 'CASE_DATA', resourceId: caseDataId }, mockSecondaryAssetId)],
    });

    const sources = await findSourceErrandsForAssets(mockMunicipalityId, [mockAssetId, mockSecondaryAssetId], user);

    expect(sources.get(mockAssetId)).toEqual({ id: mockSupportErrandId, service: 'supportmanagement', namespace: mockSupportNamespace });
    expect(sources.get(mockSecondaryAssetId)).toMatchObject({ id: caseDataId, service: 'case-data' });
  });

  it('defaults the namespace when the relation has none', async () => {
    givenRelations({ [mockAssetId]: [link({ service: 'supportmanagement', resourceId: mockSupportErrandId })] });

    const sources = await findSourceErrandsForAssets(mockMunicipalityId, [mockAssetId], user);

    expect(sources.get(mockAssetId)?.namespace).toBe(mockSupportNamespace);
  });

  it('leaves out assets without an errand link', async () => {
    givenRelations({ [mockAssetId]: [{ ...supportLink, type: 'REFERRED_FROM' }] });

    const sources = await findSourceErrandsForAssets(mockMunicipalityId, [mockAssetId], user);

    expect(sources.size).toBe(0);
  });
});

describe('the case-data-only flows', () => {
  it("narrows an errand's assets on case-data links only", async () => {
    givenRelations({
      [caseDataId]: [caseDataLink, link({ service: 'supportmanagement', resourceId: caseDataId }, mockSecondaryAssetId)],
    });

    const ids = await findAssetIdsForErrand(mockMunicipalityId, caseDataId, user);

    expect(Array.from(ids)).toEqual([mockAssetId]);
  });

  it('deletes only the case-data links of an asset', async () => {
    givenRelations({ [mockAssetId]: [caseDataLink, supportLink] });
    del.mockResolvedValue({});

    await deleteErrandAssetRelationsForAsset(mockMunicipalityId, mockAssetId, user);

    expect(del).toHaveBeenCalledTimes(1);
    expect(del.mock.calls[0][0].url).toBe(`${mockMunicipalityId}/relations/case-data-link`);
  });
});
