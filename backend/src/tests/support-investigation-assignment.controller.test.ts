import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import {
  InvestigationHandoverDto,
  SupportInvestigationAssignmentController,
} from '@/controllers/supportmanagement/support-investigation-assignment.controller';
import { Label } from '@/data-contracts/supportmanagement/data-contracts';

import { mockReq, mockRes } from './helpers/http';
import { mockMunicipalityId, mockSupportErrandId, mockSupportNamespace } from './helpers/mock-data';

const MUNICIPALITY_ID = mockMunicipalityId;
const NAMESPACE = mockSupportNamespace;
const errandUrl = `${MUNICIPALITY_ID}/${NAMESPACE}/errands/${mockSupportErrandId}`;
const metadataUrl = `${MUNICIPALITY_ID}/${NAMESPACE}/metadata`;

const label = (id: string, classification: string, resourcePath: string, displayName: string, labels?: Label[]): Label => ({
  id,
  classification,
  resourcePath,
  resourceName: resourcePath.split('/').at(-1) ?? resourcePath,
  displayName,
  ...(labels ? { labels } : {}),
});

const labelStructure: Label[] = [
  label('location-root', 'LOCATION_ROOT', 'LOCATION', 'Platsstruktur', [
    label('north', 'DEPARTMENT', 'LOCATION/NORTH', 'Norr', [label('north-unit', 'LOCATION', 'LOCATION/NORTH/NORTH_UNIT', 'Norra enheten')]),
    label('south', 'DEPARTMENT', 'LOCATION/SOUTH', 'Söder', [label('south-unit', 'LOCATION', 'LOCATION/SOUTH/SOUTH_UNIT', 'Södra enheten')]),
  ]),
  label('access-root', 'ACCESS_ROOT', 'ACCESS', 'Åtkomst', [label('access-lex', 'ACCESS', 'ACCESS/LEX', 'LEX')]),
  label('category-root', 'CATEGORY_ROOT', 'CATEGORY', 'Kategori', [label('category-hsl', 'CATEGORY', 'CATEGORY/HSL', 'HSL')]),
];

const katlaReport = { key: 'katla-report', schemaId: 'katla_1.0', value: { facility: { orgName: 'Norra enheten', parentOrgName: 'Norr' } } };

interface Stubs {
  get: ReturnType<typeof vi.fn>;
  patch: ReturnType<typeof vi.fn>;
  findLocationAccessCandidates: ReturnType<typeof vi.fn>;
  assertCanWriteDocument: ReturnType<typeof vi.fn>;
}

/** Errand labels arrive as bare ids; the metadata tree is what names them. */
type ErrandLabel = Pick<Label, 'id'>;

const makeController = ({
  errandLabels = [{ id: 'category-hsl' }, { id: 'north' }, { id: 'north-unit' }],
}: { errandLabels?: ErrandLabel[] } = {}) => {
  const controller = new SupportInvestigationAssignmentController();
  const stubs: Stubs = {
    get: vi.fn(async (config: { url?: string }) => {
      if (config.url === errandUrl) {
        return {
          data: { id: mockSupportErrandId, status: 'ONGOING', version: 7, labels: errandLabels, jsonParameters: [katlaReport] },
          headers: { etag: '"7"' },
          message: 'success',
        };
      }
      if (config.url === metadataUrl) return { data: { labels: { labelStructure }, statuses: [] }, message: 'success' };
      if (config.url?.includes('/access/ad/south.manager')) {
        return { data: [{ accessByType: [{ type: 'role', access: [{ pattern: 'UNIT_MANAGER' }] }] }], message: 'success' };
      }
      if (config.url?.includes('/access/ad/')) return { data: [], message: 'success' };
      throw new Error(`Unexpected GET ${config.url}`);
    }),
    patch: vi.fn(async () => ({ data: {}, message: 'success' })),
    findLocationAccessCandidates: vi.fn(async () => ['south.manager', 'south.nurse']),
    assertCanWriteDocument: vi.fn(async () => undefined),
  };

  const internals = controller as unknown as Record<string, unknown>;
  internals.apiService = { get: stubs.get, patch: stubs.patch };
  internals.accessMapperService = { findLocationAccessCandidates: stubs.findLocationAccessCandidates };
  internals.handlerDirectory = {
    roles: undefined,
    lookupDisplayNames: vi.fn(async () => new Map([['south.manager', 'Sonja Söder']])),
    assertHandlerHoldsRole: vi.fn(),
    listHandlers: vi.fn(async () => []),
  };
  internals.investigationPolicyService = {
    iafVofClassificationPolicy: {},
    profile: { documents: [{ key: 'utredning-enhetschef', schemaName: 'utredning-enhetschef' }] },
    getClassificationOwner: vi.fn(async () => 'investigation'),
  };
  internals.investigationAccessService = { assertCanWriteDocument: stubs.assertCanWriteDocument };

  return { controller, stubs };
};

describe('InvestigationHandoverDto', () => {
  it('accepts the target place as an optional label id', async () => {
    const valid = plainToInstance(InvestigationHandoverDto, { expectedVersion: 7, assignedUserId: 'south.manager', locationLabelId: 'south-unit' });
    const invalid = plainToInstance(InvestigationHandoverDto, { expectedVersion: 7, locationLabelId: '' });

    await expect(validate(valid, { whitelist: true, forbidNonWhitelisted: true })).resolves.toEqual([]);
    expect(JSON.stringify(await validate(invalid, { whitelist: true, forbidNonWhitelisted: true }))).toMatch(/locationLabelId/);
  });
});

describe('move-location', () => {
  it('rewrites the location chain and assigns a manager of the target place in one conditional PATCH', async () => {
    const { controller, stubs } = makeController();
    const res = mockRes();

    await controller.applyHandover(
      mockReq(),
      MUNICIPALITY_ID,
      mockSupportErrandId,
      'move-location',
      { expectedVersion: 7, assignedUserId: 'south.manager', locationLabelId: 'south-unit' },
      res,
    );

    expect(res.statusCode).toBe(204);
    expect(stubs.assertCanWriteDocument).toHaveBeenCalledWith(expect.anything(), MUNICIPALITY_ID, mockSupportErrandId, 'utredning-enhetschef');
    expect(stubs.findLocationAccessCandidates).toHaveBeenCalledWith(expect.anything(), MUNICIPALITY_ID, NAMESPACE, 'LOCATION/SOUTH/SOUTH_UNIT');
    expect(stubs.patch).toHaveBeenCalledTimes(1);
    const [config] = stubs.patch.mock.calls[0] as [{ url: string; data: unknown; headers: Record<string, string> }];
    expect(config.url).toBe(errandUrl);
    expect(config.headers).toEqual({ 'If-Match': '"7"' });
    expect(config.data).toEqual({
      assignedUserId: 'south.manager',
      labels: [{ id: 'category-hsl' }, { id: 'south' }, { id: 'south-unit' }],
    });
    // The reported place stays exactly as it arrived: the move never touches the JSON parameters.
    expect(config.data).not.toHaveProperty('jsonParameters');
  });

  it('requires a target place and refuses an assignee who is not a manager there', async () => {
    const { controller, stubs } = makeController();

    await expect(
      controller.applyHandover(
        mockReq(),
        MUNICIPALITY_ID,
        mockSupportErrandId,
        'move-location',
        { expectedVersion: 7, assignedUserId: 'x' },
        mockRes(),
      ),
    ).rejects.toMatchObject({ status: 400, message: expect.stringContaining('target place') });

    await expect(
      controller.applyHandover(
        mockReq(),
        MUNICIPALITY_ID,
        mockSupportErrandId,
        'move-location',
        { expectedVersion: 7, assignedUserId: 'south.nurse', locationLabelId: 'south-unit' },
        mockRes(),
      ),
    ).rejects.toMatchObject({ status: 400, message: expect.stringContaining('not a manager') });

    expect(stubs.patch).not.toHaveBeenCalled();
  });

  it('refuses to move an errand that is with the LEX roles', async () => {
    const { controller, stubs } = makeController({ errandLabels: [{ id: 'north' }, { id: 'north-unit' }, { id: 'access-lex' }] });

    await expect(
      controller.applyHandover(
        mockReq(),
        MUNICIPALITY_ID,
        mockSupportErrandId,
        'move-location',
        { expectedVersion: 7, assignedUserId: 'south.manager', locationLabelId: 'south-unit' },
        mockRes(),
      ),
    ).rejects.toMatchObject({ status: 409, message: expect.stringContaining('LEX') });
    expect(stubs.patch).not.toHaveBeenCalled();
  });

  it('rejects a stale errand version before resolving anybody', async () => {
    const { controller, stubs } = makeController();

    await expect(
      controller.applyHandover(
        mockReq(),
        MUNICIPALITY_ID,
        mockSupportErrandId,
        'move-location',
        { expectedVersion: 6, assignedUserId: 'south.manager', locationLabelId: 'south-unit' },
        mockRes(),
      ),
    ).rejects.toMatchObject({ status: 412 });
    expect(stubs.findLocationAccessCandidates).not.toHaveBeenCalled();
    expect(stubs.patch).not.toHaveBeenCalled();
  });

  it('previews the managers of the target place, grouped by their AccessMapper role', async () => {
    const { controller, stubs } = makeController();

    const response = await controller.getLocationManagers(mockReq(), MUNICIPALITY_ID, mockSupportErrandId, 'south-unit');

    expect(response).toEqual({
      candidates: [{ adAccount: 'south.manager', displayName: 'Sonja Söder', roleKey: 'UNIT_MANAGER' }],
      roles: [
        { key: 'UNIT_MANAGER', label: 'Enhetschef' },
        { key: 'HEAD_OF_OPERATION', label: 'Verksamhetschef' },
      ],
      locationResourcePath: 'LOCATION/SOUTH/SOUTH_UNIT',
      locationDisplayName: 'Södra enheten',
    });
    expect(stubs.patch).not.toHaveBeenCalled();
  });

  it('refuses a preview for a level with sub-places', async () => {
    const { controller } = makeController();

    await expect(controller.getLocationManagers(mockReq(), MUNICIPALITY_ID, mockSupportErrandId, 'south')).rejects.toMatchObject({
      status: 400,
      message: expect.stringContaining('sub-places'),
    });
  });
});
