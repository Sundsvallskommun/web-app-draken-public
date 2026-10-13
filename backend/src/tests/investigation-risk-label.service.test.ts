import type { Label } from '@/data-contracts/supportmanagement/data-contracts';
import { InvestigationRiskLabelService } from '@/services/investigation-risk-label.service';

import { mockUser } from './helpers/http';
import { mockMunicipalityId, mockSupportErrandId } from './helpers/mock-data';

const labelStructure: Label[] = [
  {
    id: 'risk-root',
    classification: 'RISK',
    resourceName: 'RISK',
    resourcePath: 'RISK',
    labels: [{ id: 'high-hsl', classification: 'RISK', resourceName: 'HIGH_HSL', resourcePath: 'RISK/HIGH_HSL', labels: [] }],
  },
];

const setup = (errandVersion: number, labels: { id: string }[] = [], versionStepsOfLabelWrite = 1) => {
  let currentVersion = errandVersion;
  const api = {
    get: vi.fn(async (config: { url: string }) =>
      config.url.endsWith('/metadata/labels')
        ? { data: { labelStructure } }
        : { data: { id: mockSupportErrandId, labels }, headers: { etag: `"${currentVersion}"` } },
    ),
    patch: vi.fn(async () => {
      currentVersion += versionStepsOfLabelWrite;
      return { data: {} };
    }),
  };
  const service = new InvestigationRiskLabelService(api as never, 'NAMESPACE');
  const apply = (present: boolean, expectedVersion: number) =>
    service.applyHighHslRiskLabel({ municipalityId: mockMunicipalityId, errandId: mockSupportErrandId, user: mockUser(), present, expectedVersion });
  return { api, apply };
};

describe('InvestigationRiskLabelService', () => {
  it('writes the label on top of the investigation write and answers the version it left', async () => {
    const { api, apply } = setup(8);

    await expect(apply(true, 8)).resolves.toBe(9);
    expect(api.patch).toHaveBeenCalledWith(
      expect.objectContaining({ data: { labels: [{ id: 'risk-root' }, { id: 'high-hsl' }] }, headers: { 'If-Match': '"8"' } }),
      expect.anything(),
    );
  });

  // Support Management decides how many version steps a label write takes. A version counted one step on would be
  // short of it, and the classification saved with the investigation would then be refused as somebody else's change.
  it('answers the version the errand is read back at, however many steps the label write took', async () => {
    const { api, apply } = setup(8, [], 2);

    await expect(apply(true, 8)).resolves.toBe(10);
    expect(api.patch).toHaveBeenCalledTimes(1);
  });

  // Somebody else wrote between the investigation and the label: the label waits for the next completed save.
  it('writes nothing when the errand has moved on since the investigation write', async () => {
    const { api, apply } = setup(9);

    await expect(apply(true, 8)).resolves.toBeUndefined();
    expect(api.patch).not.toHaveBeenCalled();
  });

  it('writes nothing when the errand already carries what the assessment asks for', async () => {
    const { api, apply } = setup(8, [{ id: 'risk-root' }, { id: 'high-hsl' }]);

    await expect(apply(true, 8)).resolves.toBeUndefined();
    expect(api.patch).not.toHaveBeenCalled();
  });
});
