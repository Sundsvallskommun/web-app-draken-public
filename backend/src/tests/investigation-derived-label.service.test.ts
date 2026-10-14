import type { Label } from '@/data-contracts/supportmanagement/data-contracts';
import { InvestigationDerivedLabelService } from '@/services/investigation-derived-label.service';

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
  {
    id: 'analysis-root',
    classification: 'ANALYSIS',
    resourceName: 'ANALYSIS',
    resourcePath: 'ANALYSIS',
    labels: [{ id: 'hsl-started', classification: 'ANALYSIS', resourceName: 'HSL_STARTED', resourcePath: 'ANALYSIS/HSL_STARTED', labels: [] }],
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
  const service = new InvestigationDerivedLabelService(api as never, 'NAMESPACE');
  const apply = (present: boolean, expectedVersion: number, resourcePath = 'RISK/HIGH_HSL', notifySubscribers = false) =>
    service.applyDerivedLabel({
      municipalityId: mockMunicipalityId,
      errandId: mockSupportErrandId,
      user: mockUser(),
      resourcePath,
      present,
      notifySubscribers,
      expectedVersion,
    });
  return { api, apply };
};

describe('InvestigationDerivedLabelService', () => {
  it('writes the label on top of the investigation write and answers the version it left', async () => {
    const { api, apply } = setup(8);

    await expect(apply(true, 8)).resolves.toBe(9);
    expect(api.patch).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { labels: [{ id: 'risk-root' }, { id: 'high-hsl' }] },
        headers: { 'If-Match': '"8"' },
        notifySubscribers: false,
      }),
      expect.anything(),
    );
  });

  // A label that records a handler's own decision tells the errand's subscribers: a subscription profile may be what
  // passes it on - the head of operations is e-mailed when MAS/MAR starts an HSL event analysis.
  it('notifies as usual where the label records a decision of the handler', async () => {
    const { api, apply } = setup(8);

    await expect(apply(true, 8, 'ANALYSIS/HSL_STARTED', true)).resolves.toBe(9);
    const [config] = api.patch.mock.calls[0] as unknown as [Record<string, unknown>];
    expect(config.data).toEqual({ labels: [{ id: 'analysis-root' }, { id: 'hsl-started' }] });
    expect(config).not.toHaveProperty('notifySubscribers');
  });

  it('takes a label off when the decision is undone', async () => {
    const { api, apply } = setup(8, [{ id: 'analysis-root' }, { id: 'hsl-started' }]);

    await expect(apply(false, 8, 'ANALYSIS/HSL_STARTED', true)).resolves.toBe(9);
    const [config] = api.patch.mock.calls[0] as unknown as [{ data: { labels: { id: string }[] } }];
    expect(config.data.labels).toEqual([]);
  });

  // Support Management decides how many version steps a label write takes. A version counted one step on would be
  // short of it, and the classification saved with the investigation would then be refused as somebody else's change.
  it('answers the version the errand is read back at, however many steps the label write took', async () => {
    const { api, apply } = setup(8, [], 2);

    await expect(apply(true, 8)).resolves.toBe(10);
    expect(api.patch).toHaveBeenCalledTimes(1);
  });

  // Somebody else wrote between the investigation and the label: the label waits for the next save.
  it('writes nothing when the errand has moved on since the investigation write', async () => {
    const { api, apply } = setup(9);

    await expect(apply(true, 8)).resolves.toBeUndefined();
    expect(api.patch).not.toHaveBeenCalled();
  });

  it('writes nothing when the errand already carries what the document asks for', async () => {
    const { api, apply } = setup(8, [{ id: 'risk-root' }, { id: 'high-hsl' }]);

    await expect(apply(true, 8)).resolves.toBeUndefined();
    expect(api.patch).not.toHaveBeenCalled();
  });

  it('writes nothing for a label the namespace has not configured', async () => {
    const { api, apply } = setup(8);

    await expect(apply(true, 8, 'ANALYSIS/NOT_CONFIGURED', true)).resolves.toBeUndefined();
    expect(api.patch).not.toHaveBeenCalled();
  });
});
