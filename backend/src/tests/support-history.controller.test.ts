import { Response } from 'express';

import { createSupportInvestigationProfile } from '@/config/support-investigation-profile';
import { SupportHistoryController } from '@/controllers/supportmanagement/support-history.controller';
import { DifferenceResponse } from '@/data-contracts/supportmanagement/data-contracts';
import ApiService from '@/services/api.service';
import { SupportInvestigationDocumentService } from '@/services/support-investigation-document.service';
import { SupportInvestigationPolicyService } from '@/services/support-investigation-policy.service';

import { mockReq, mockRes } from './helpers/http';
import { mockMunicipalityId, mockSupportErrandId, mockSupportNamespace } from './helpers/mock-data';

const profile = createSupportInvestigationProfile({
  application: 'FUTURE',
  documents: [
    { key: 'future-investigation', schemaName: 'future-schema', tabLabel: 'Future', ownerLabel: 'Owner' },
    { key: 'future-review', schemaName: 'future-schema', tabLabel: 'Review', ownerLabel: 'Reviewer' },
  ],
});

const difference: DifferenceResponse = {
  operations: [
    { op: 'replace', path: '/jsonParameters/0/value/assessment', fromValue: 'secret-before', value: 'secret-after' },
    { op: 'replace', path: '/title', fromValue: 'Before', value: 'After' },
  ],
};

const makeController = (verifyReadableDocuments = vi.fn().mockResolvedValue({ existingDocumentKeys: profile.documents.map(({ key }) => key) })) => {
  const policy = { profile } as SupportInvestigationPolicyService;
  const documentService = { verifyReadableDocuments } as unknown as SupportInvestigationDocumentService;
  const controller = new SupportHistoryController(policy, documentService);
  const apiService = { get: vi.fn(async () => ({ data: difference })) };
  (controller as unknown as { apiService: ApiService }).apiService = apiService as unknown as ApiService;
  return { controller, apiService, verifyReadableDocuments };
};

describe('SupportHistoryController investigation document protection', () => {
  it('keeps revision JSON-parameter values when Support Management permits every profile document read', async () => {
    const { controller, verifyReadableDocuments } = makeController();
    const response = mockRes();
    const req = mockReq();

    await controller.fetchErrandRevisionsDiff(
      req,
      mockSupportErrandId,
      mockMunicipalityId,
      2,
      3,
      response as unknown as Response<DifferenceResponse>,
    );

    expect(response.body).toEqual(difference);
    expect(verifyReadableDocuments).toHaveBeenCalledWith({
      definitions: profile.documents,
      municipalityId: mockMunicipalityId,
      errandId: mockSupportErrandId,
      user: req.user,
    });
  });

  it('removes all JSON-parameter values when Support Management denies a configured document read', async () => {
    const denied = Object.assign(new Error('Forbidden'), { status: 403 });
    const { controller, apiService } = makeController(vi.fn().mockRejectedValue(denied));
    const response = mockRes();
    const req = mockReq();

    await controller.fetchErrandRevisionsDiff(
      req,
      mockSupportErrandId,
      mockMunicipalityId,
      2,
      3,
      response as unknown as Response<DifferenceResponse>,
    );

    expect(response.body).toEqual({ operations: [difference.operations?.[1]] });
    expect(apiService.get).toHaveBeenCalledWith(
      {
        url: expect.stringContaining(
          `/${mockMunicipalityId}/${mockSupportNamespace}/errands/${mockSupportErrandId}/revisions/difference?source=2&target=3`,
        ),
        propagateClientError: true,
      },
      req.user,
    );
  });

  it('propagates document verification failures that are not authorization decisions', async () => {
    const unavailable = Object.assign(new Error('Unavailable'), { status: 503 });
    const { controller } = makeController(vi.fn().mockRejectedValue(unavailable));

    await expect(
      controller.fetchErrandRevisionsDiff(
        mockReq(),
        mockSupportErrandId,
        mockMunicipalityId,
        2,
        3,
        mockRes() as unknown as Response<DifferenceResponse>,
      ),
    ).rejects.toBe(unavailable);
  });
});
