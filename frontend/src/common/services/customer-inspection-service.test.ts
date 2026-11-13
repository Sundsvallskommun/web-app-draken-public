import type { Asset } from '@common/interfaces/asset';
import { linkSupportErrands } from '@common/services/relations-service';
import { getSupportErrandById, initiateSupportErrand } from '@supportmanagement/services/support-errand-service';
import type { SupportMetadata } from '@supportmanagement/services/support-metadata-service';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { mockEnv } from '../../tests/mock-env';
import {
  activePermits,
  createInspectionErrand,
  latestActiveAsset,
  linkInspectionToPermit,
  permitName,
  permitOfInspection,
} from './customer-inspection-service';
import type { CustomerPlace } from './customer-service';

// Latest is 2.0; saved fixtures keep their own version.
vi.mock('@common/components/json/utils/schema-utils', () => ({
  getLatestRjsfSchema: vi.fn(async (municipalityId: string, name: string) => ({
    schemaId: `${municipalityId}_${name}_2.0`,
  })),
}));

vi.mock('@common/services/relations-service', () => ({ linkSupportErrands: vi.fn() }));
vi.mock('@supportmanagement/services/support-errand-service', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getSupportErrandById: vi.fn(),
  initiateSupportErrand: vi.fn(),
}));

const MUNICIPALITY_ID = '2281';
const TIMRA = '2262';
const PERMIT_ERRAND_ID = mockEnv.mockRestaurantNumberId;
const NEW_ERRAND_ID = mockEnv.mockAssignmentId;
const OWNER_ID = mockEnv.mockLicensedBusinessAddressId;
const premises = { name: mockEnv.mockPremisesName, restaurantNumber: mockEnv.mockRestaurantNumber };

const label = (classification: string, resourceName: string, resourcePath: string, labels: object[] = []) => ({
  id: resourcePath,
  classification,
  resourceName,
  resourcePath,
  labels,
});
const metadata = {
  namespace: 'AOT',
  labels: {
    // As the BFF answers it: the tree under the ROOT label, without it.
    labelStructure: [
      label('CATEGORY', 'INSPECTION', 'CATEGORYROOT/INSPECTION', [
        label('TYPE', 'INTERNAL_INSPECTION', 'CATEGORYROOT/INSPECTION/INTERNAL_INSPECTION'),
        label('TYPE', 'EXTERNAL_INSPECTION', 'CATEGORYROOT/INSPECTION/EXTERNAL_INSPECTION'),
      ]),
    ],
  },
} as unknown as SupportMetadata;

const asset = (fields: Partial<Asset>, value: object = { premises }) =>
  ({
    id: 'asset',
    sourceErrandId: PERMIT_ERRAND_ID,
    jsonParameters: [{ key: 'aot_alcohol_party_asset', schemaId: 'schema', value }],
    ...fields,
  } as Asset);

const owner = {
  id: 'stakeholder-id',
  role: 'PRIMARY',
  externalId: OWNER_ID,
  externalIdType: 'COMPANY',
  organizationName: mockEnv.mockCompanyName,
  organizationNumber: mockEnv.mockOrganizationNumber,
  contactChannels: [{ type: 'PHONE', value: mockEnv.mockPhoneNumber }],
  parameters: [{ key: 'organizationNumber', values: [mockEnv.mockOrganizationNumber], version: 2 }],
};
const pbi = {
  role: 'CONTACT',
  firstName: mockEnv.mockFirstName,
  lastName: mockEnv.mockLastName,
  personNumber: mockEnv.mockPersonNumber,
  parameters: [{ key: 'PBI', values: ['true'] }],
};
const otherContact = { role: 'CONTACT', firstName: mockEnv.mockFirstName, parameters: [] };

describe('activePermits', () => {
  test('keeps the active assets, the one that took effect last first', () => {
    const older = asset({ id: 'older', status: 'ACTIVE' }, { decision: { validFrom: '2024-01-01' } });
    const latest = asset({ id: 'latest', status: 'ACTIVE' }, { decision: { validFrom: '2025-01-01' } });
    const expired = asset({ id: 'expired', status: 'EXPIRED' }, { decision: { validFrom: '2026-01-01' } });

    expect(activePermits({ assets: [older, expired, latest] } as CustomerPlace).map((a) => a.id)).toEqual([
      'latest',
      'older',
    ]);
  });
});

describe('latestActiveAsset', () => {
  test('takes the active asset that took effect last', () => {
    const older = asset({ id: 'older', status: 'ACTIVE' }, { decision: { validFrom: '2024-01-01' } });
    const latest = asset({ id: 'latest', status: 'ACTIVE' }, { decision: { validFrom: '2025-01-01' } });
    const expired = asset({ id: 'expired', status: 'EXPIRED' }, { decision: { validFrom: '2026-01-01' } });

    expect(latestActiveAsset({ assets: [older, expired, latest] } as CustomerPlace)).toBe(latest);
  });
});

describe('permitOfInspection', () => {
  test('takes the permit whose errand the tillsyn is linked to', () => {
    const other = asset({ id: 'other', sourceErrandId: 'other-permit-errand' });
    const linked = asset({ id: 'linked' });

    expect(permitOfInspection([other, linked], ['unrelated', PERMIT_ERRAND_ID])?.id).toBe('linked');
    expect(permitOfInspection([other, linked], [])).toBeUndefined();
  });

  test('passes over a permit that names no errand', () => {
    expect(permitOfInspection([asset({ sourceErrandId: undefined })], [])).toBeUndefined();
  });
});

describe('permitName', () => {
  test('takes the title, else the type', () => {
    expect(permitName(asset({ title: 'Stadigvarande servering', type: 'AlcoholServing' }))).toBe(
      'Stadigvarande servering'
    );
    expect(permitName(asset({ title: undefined, type: 'AlcoholServing' }))).toBe('AlcoholServing');
    expect(permitName(asset({ title: undefined, type: undefined }))).toBe('');
  });
});

describe('linkInspectionToPermit', () => {
  test('links the tillsyn to the errand the permit came from', async () => {
    vi.mocked(linkSupportErrands).mockResolvedValue({} as never);

    await expect(linkInspectionToPermit(MUNICIPALITY_ID, 'inspection-id', asset({}), 'AOT')).resolves.toBe(true);
    expect(linkSupportErrands).toHaveBeenCalledWith(MUNICIPALITY_ID, 'inspection-id', PERMIT_ERRAND_ID, 'AOT');
  });

  test('says no when the permit names no errand, without asking Relations', async () => {
    vi.mocked(linkSupportErrands).mockReset();

    await expect(
      linkInspectionToPermit(MUNICIPALITY_ID, 'inspection-id', asset({ sourceErrandId: undefined }), 'AOT')
    ).resolves.toBe(false);
    expect(linkSupportErrands).not.toHaveBeenCalled();
  });

  test('says no when Relations refuses', async () => {
    vi.mocked(linkSupportErrands).mockRejectedValue(new Error('relations down'));

    await expect(linkInspectionToPermit(MUNICIPALITY_ID, 'inspection-id', asset({}), 'AOT')).resolves.toBe(false);
  });
});

describe('createInspectionErrand', () => {
  beforeEach(() => {
    vi.mocked(getSupportErrandById)
      .mockReset()
      .mockResolvedValue({
        errand: {
          stakeholders: [owner, pbi, otherContact],
          parameters: [{ key: 'premisesMunicipalityId', displayName: 'Kommun', values: [TIMRA] }],
        },
      } as never);
    vi.mocked(initiateSupportErrand).mockReset().mockResolvedValue({
      id: NEW_ERRAND_ID,
      errandNumber: mockEnv.mockErrandNumber,
    });
    vi.mocked(linkSupportErrands)
      .mockReset()
      .mockResolvedValue({} as never);
  });

  test('creates the tillsyn errand from the asset and the permit errand, and links the two', async () => {
    const created = await createInspectionErrand(MUNICIPALITY_ID, metadata, asset({}), 'INTERNAL_INSPECTION');

    expect(created).toEqual({ errandNumber: mockEnv.mockErrandNumber, linked: true });
    expect(getSupportErrandById).toHaveBeenCalledWith(PERMIT_ERRAND_ID, MUNICIPALITY_ID);
    const [, prefill] = vi.mocked(initiateSupportErrand).mock.calls[0];
    expect(prefill?.labels?.map((l) => l.resourcePath)).toEqual([
      'CATEGORYROOT/INSPECTION',
      'CATEGORYROOT/INSPECTION/INTERNAL_INSPECTION',
    ]);
    expect(prefill?.labels?.every((l) => l.labels === undefined)).toBe(true);
    expect(prefill?.stakeholders).toEqual([
      expect.objectContaining({ role: 'PRIMARY', externalId: OWNER_ID, contactChannels: owner.contactChannels }),
      expect.objectContaining({ role: 'CONTACT', firstName: mockEnv.mockFirstName, lastName: mockEnv.mockLastName }),
    ]);
    expect(prefill?.stakeholders?.[0]).not.toHaveProperty('id');
    expect(prefill?.stakeholders?.[0]).not.toHaveProperty('organizationNumber');
    expect(prefill?.stakeholders?.[0].parameters).toEqual([
      { key: 'organizationNumber', values: [mockEnv.mockOrganizationNumber] },
    ]);
    expect(prefill?.stakeholders?.[1]).not.toHaveProperty('personNumber');
    expect(prefill?.jsonParameters).toEqual([
      {
        key: 'aot_inspection_internal_inspection',
        schemaId: '2281_aot_inspection_internal_inspection_2.0',
        value: { premises },
      },
    ]);
    expect(prefill?.parameters).toEqual([{ key: 'premisesMunicipalityId', displayName: 'Kommun', values: [TIMRA] }]);
    expect(linkSupportErrands).toHaveBeenCalledWith(MUNICIPALITY_ID, NEW_ERRAND_ID, PERMIT_ERRAND_ID, 'AOT');
  });

  test('sends no municipality when the permit errand names none', async () => {
    vi.mocked(getSupportErrandById).mockResolvedValue({ errand: { stakeholders: [owner] } } as never);

    await createInspectionErrand(MUNICIPALITY_ID, metadata, asset({}), 'INTERNAL_INSPECTION');

    const [, prefill] = vi.mocked(initiateSupportErrand).mock.calls[0];
    expect(prefill?.parameters).toEqual([]);
  });

  test('files a tobacco point of sale as pointOfSale', async () => {
    const pointOfSale = { name: mockEnv.mockPremisesName, propertyDesignation: 'Testfastigheten 1:1' };

    await createInspectionErrand(MUNICIPALITY_ID, metadata, asset({}, { pointOfSale }), 'EXTERNAL_INSPECTION');

    const [, prefill] = vi.mocked(initiateSupportErrand).mock.calls[0];
    expect(prefill?.jsonParameters?.[0]).toMatchObject({
      key: 'aot_inspection_external_inspection',
      value: { pointOfSale },
    });
  });

  test('keeps the errand and reports it when the link cannot be made', async () => {
    vi.mocked(linkSupportErrands).mockRejectedValue(new Error('relations down'));

    await expect(createInspectionErrand(MUNICIPALITY_ID, metadata, asset({}), 'INTERNAL_INSPECTION')).resolves.toEqual({
      errandNumber: mockEnv.mockErrandNumber,
      linked: false,
    });
  });

  test('creates nothing when Relations has no permit errand for the asset', async () => {
    await expect(
      createInspectionErrand(MUNICIPALITY_ID, metadata, asset({ sourceErrandId: undefined }), 'INTERNAL_INSPECTION')
    ).rejects.toThrow();
    expect(initiateSupportErrand).not.toHaveBeenCalled();
  });
});
