import { getCustomerAssets } from '@common/services/customer-service';
import { getResolvedRelations } from '@common/services/relations-service';
import { beforeEach, expect, test, vi } from 'vitest';

import { getSupportActionErrandOrigin, inspectionErrandIdOf, originIsEmpty } from './support-action-errand-service';
import { getSupportErrandById, type SupportErrand } from './support-errand-service';
import { getSupportInvestigation } from './support-investigation-service';

vi.mock('@common/services/relations-service', () => ({ getResolvedRelations: vi.fn(), linkSupportErrands: vi.fn() }));
vi.mock('@common/services/customer-service', () => ({ getCustomerAssets: vi.fn() }));
vi.mock('./support-errand-service', () => ({ getSupportErrandById: vi.fn() }));
vi.mock('./support-investigation-service', () => ({ getSupportInvestigation: vi.fn() }));

const MUNICIPALITY_ID = '2281';
const INSPECTION_ERRAND_ID = 'ec4be6a8-8e2e-4a1f-9f6a-0b1c2d3e4f50';
const PERMIT_ERRAND_ID = 'f1a2b3c4-5d6e-4f70-8a9b-0c1d2e3f4a5b';
const TIPS_ERRAND_ID = 'a9b8c7d6-5e4f-4a3b-9c8d-7e6f5a4b3c2d';
const PERMIT_HOLDER_PARTY_ID = 'c3a1f0de-2b44-4c7e-9a10-5f8d6b2e1c93';

/** The permit as the register keeps it, which is what says that the linked errand is the one that issued it. */
const permitAsset = { id: 'asset-1', status: 'ACTIVE', sourceErrandId: PERMIT_ERRAND_ID };

const protocolWith = (answers: Record<string, string>) => ({
  type: 'external_inspection',
  jsonParameters: [{ key: 'aot_external_inspection_protocol', value: answers }],
});

const theInspectionIs = (errandNumber: string | undefined) =>
  vi.mocked(getSupportErrandById).mockResolvedValue({
    errand: { errandNumber, customer: [{ role: 'PRIMARY', externalId: PERMIT_HOLDER_PARTY_ID }] } as SupportErrand,
  });

beforeEach(() => {
  vi.mocked(getCustomerAssets).mockResolvedValue([]);
});

test('the inspection is the one pw-alkt tagged the action errand with', () => {
  expect(inspectionErrandIdOf({ externalTags: [{ key: 'inspectionErrandId', value: INSPECTION_ERRAND_ID }] })).toBe(
    INSPECTION_ERRAND_ID
  );
  expect(inspectionErrandIdOf({ externalTags: [{ key: 'caseId', value: '7' }] })).toBeUndefined();
  expect(inspectionErrandIdOf({})).toBeUndefined();
  expect(inspectionErrandIdOf(undefined)).toBeUndefined();
});

test('the origin names the inspection, its date and summary, and the permit two hops away', async () => {
  theInspectionIs('AOT-26110233');
  vi.mocked(getSupportInvestigation).mockResolvedValue(
    protocolWith({ inspectionDate: '2026-11-04', summary: 'actionRequired' }) as never
  );
  vi.mocked(getCustomerAssets).mockResolvedValue([permitAsset] as never);
  vi.mocked(getResolvedRelations).mockResolvedValue({
    relations: [{ target: { resourceId: PERMIT_ERRAND_ID } }],
    caseStatuses: [
      { caseId: PERMIT_ERRAND_ID, caseType: 'Stadigvarande servering', errandNumber: 'AOT-26100111' },
      { caseId: 'another-errand', caseType: 'Tillsyn', errandNumber: 'AOT-26100999' },
    ],
  } as never);

  await expect(getSupportActionErrandOrigin(MUNICIPALITY_ID, INSPECTION_ERRAND_ID)).resolves.toEqual({
    inspectionErrandNumber: 'AOT-26110233',
    inspectionDate: '2026-11-04',
    summary: 'Godkänd, men åtgärd krävs',
    permitType: 'Stadigvarande servering',
    permitErrandNumber: 'AOT-26100111',
  });
});

test('an inspection with no relation to a permit gives what it has and leaves the permit out', async () => {
  theInspectionIs('AOT-26110233');
  vi.mocked(getSupportInvestigation).mockResolvedValue(protocolWith({ summary: 'approved' }) as never);
  vi.mocked(getResolvedRelations).mockResolvedValue({ relations: [], caseStatuses: [] } as never);

  await expect(getSupportActionErrandOrigin(MUNICIPALITY_ID, INSPECTION_ERRAND_ID)).resolves.toEqual({
    inspectionErrandNumber: 'AOT-26110233',
    inspectionDate: undefined,
    summary: 'Godkänd',
    permitType: undefined,
    permitErrandNumber: undefined,
  });
});

test('a summary the protocol no longer offers is shown as it was saved', async () => {
  theInspectionIs('AOT-26110233');
  vi.mocked(getSupportInvestigation).mockResolvedValue(protocolWith({ summary: 'withdrawn' }) as never);
  vi.mocked(getResolvedRelations).mockResolvedValue({ relations: [], caseStatuses: [] } as never);

  await expect(getSupportActionErrandOrigin(MUNICIPALITY_ID, INSPECTION_ERRAND_ID)).resolves.toMatchObject({
    summary: 'withdrawn',
  });
});

test('an inspection that cannot be read costs the rows rather than an error', async () => {
  theInspectionIs(undefined);
  vi.mocked(getSupportInvestigation).mockRejectedValue(new Error('the inspection is gone'));
  vi.mocked(getResolvedRelations).mockRejectedValue(new Error('the relations could not be read'));

  const origin = await getSupportActionErrandOrigin(MUNICIPALITY_ID, INSPECTION_ERRAND_ID);

  expect(originIsEmpty(origin)).toBe(true);
});

test('an errand linked to the inspection that holds no permit is not taken for the permit', async () => {
  theInspectionIs('AOT-26110233');
  vi.mocked(getSupportInvestigation).mockResolvedValue(protocolWith({ summary: 'actionRequired' }) as never);
  vi.mocked(getCustomerAssets).mockResolvedValue([permitAsset] as never);
  vi.mocked(getResolvedRelations).mockResolvedValue({
    relations: [{ target: { resourceId: TIPS_ERRAND_ID } }],
    caseStatuses: [{ caseId: TIPS_ERRAND_ID, caseType: 'Tips', errandNumber: 'AOT-26100777' }],
  } as never);

  await expect(getSupportActionErrandOrigin(MUNICIPALITY_ID, INSPECTION_ERRAND_ID)).resolves.toMatchObject({
    inspectionErrandNumber: 'AOT-26110233',
    permitType: undefined,
    permitErrandNumber: undefined,
  });
});
