import { CaseStatusController } from '@/controllers/casestatus.controller';
import type { CaseStatusResponse } from '@/data-contracts/casestatus/data-contracts';

import { mockReq, mockUser } from './helpers/http';
import { mockMunicipalityId } from './helpers/mock-data';

// The drake's own namespace is read when the configuration loads, so VOF's is set before anything imports it, and the
// test environment's put back afterwards for the files that follow in this worker.
const namespaces = vi.hoisted(() => {
  const previous = { support: process.env.SUPPORTMANAGEMENT_NAMESPACE, caseData: process.env.CASEDATA_NAMESPACE };
  process.env.SUPPORTMANAGEMENT_NAMESPACE = 'HEALTHCAREDEVIATIONVOF';
  delete process.env.CASEDATA_NAMESPACE;
  return previous;
});

afterAll(() => {
  process.env.SUPPORTMANAGEMENT_NAMESPACE = namespaces.support;
  if (namespaces.caseData === undefined) delete process.env.CASEDATA_NAMESPACE;
  else process.env.CASEDATA_NAMESPACE = namespaces.caseData;
});

/** Everything the brukare has across the municipality: VOF's own report, other drakes', and systems without one. */
const brukareCases: CaseStatusResponse[] = [
  { caseId: 'vof-report', namespace: 'HEALTHCAREDEVIATIONVOF', errandNumber: 'VOF-2026-0042' },
  { caseId: 'iaf-report', namespace: 'HEALTHCAREDEVIATIONIAF', errandNumber: 'IAF-2026-0007' },
  { caseId: 'contact-centre', namespace: 'CONTACTSUNDSVALL', errandNumber: 'KC-00000001' },
  { caseId: 'mex', namespace: 'SBK_MEX', errandNumber: 'MEX-2026-000001' },
  { caseId: 'open-e', system: 'OPEN_E_PLATFORM', errandNumber: 'OPENE-1' },
  { caseId: 'byggr', system: 'BYGGR', errandNumber: 'BYGG-2026-1' },
] as CaseStatusResponse[];

const makeController = () => {
  const controller = new CaseStatusController();
  const get = vi.fn(async (_config: { url: string }) => ({ data: brukareCases, message: 'success' }));
  (controller as unknown as { apiService: { get: typeof get } }).apiService = { get };
  return { controller, get };
};

describe('getStatusesUsingPartyId', () => {
  // Ä3: the related reports on a brukare are the drake's own. Another drake's, and a system's without a namespace,
  // never show.
  it("answers a VOF user without canViewOtherNamespaces with VOF's own errands alone", async () => {
    const { controller, get } = makeController();
    const req = mockReq(mockUser({ permissions: { canViewOtherNamespaces: false } } as never));

    const answer = await controller.getStatusesUsingPartyId(req, mockMunicipalityId, 'brukare-party-id');

    expect(get.mock.calls[0][0]).toMatchObject({ url: `${mockMunicipalityId}/party/brukare-party-id/statuses` });
    expect((answer.data as CaseStatusResponse[]).map(({ caseId }) => caseId)).toEqual(['vof-report']);
  });

  it('shows no errand that names no namespace, from OpenE or ByggR, in VOF', async () => {
    const { controller } = makeController();
    const req = mockReq(mockUser({ permissions: { canViewOtherNamespaces: false } } as never));

    const answer = await controller.getStatusesUsingPartyId(req, mockMunicipalityId, 'brukare-party-id');

    expect((answer.data as CaseStatusResponse[]).some(({ namespace }) => namespace === undefined)).toBe(false);
  });
});
