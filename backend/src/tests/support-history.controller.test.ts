import { Response } from 'express';

import { createSupportInvestigationProfile } from '@/config/support-investigation-profile';
import { SupportHistoryController } from '@/controllers/supportmanagement/support-history.controller';
import { DifferenceResponse } from '@/data-contracts/supportmanagement/data-contracts';
import ApiService from '@/services/api.service';
import { FeatureFlagService } from '@/services/feature-flag.service';
import { SupportInvestigationAccessService } from '@/services/support-investigation-access.service';
import { SupportInvestigationPolicyService } from '@/services/support-investigation-policy.service';

import { mockReq, mockRes, mockUser } from './helpers/http';
import { mockMunicipalityId, mockSupportErrandId, mockSupportNamespace } from './helpers/mock-data';

const profile = createSupportInvestigationProfile({
  application: 'FUTURE',
  documents: [
    { key: 'future-investigation', schemaName: 'future-schema', tabLabel: 'Future', ownerLabel: 'Owner' },
    { key: 'future-review', schemaName: 'future-schema', tabLabel: 'Review', ownerLabel: 'Reviewer' },
  ],
});

const accessConfiguration = JSON.stringify({
  'future-investigation': { readGroups: ['investigator'], writeGroups: ['investigator'] },
  'future-review': { readGroups: ['investigator'], writeGroups: ['investigator'] },
});

const difference: DifferenceResponse = {
  operations: [
    { op: 'replace', path: '/jsonParameters/0/value/assessment', fromValue: 'secret-before', value: 'secret-after' },
    { op: 'replace', path: '/title', fromValue: 'Before', value: 'After' },
  ],
};

const makeController = () => {
  const access = new SupportInvestigationAccessService(profile, accessConfiguration);
  const featureFlags = {} as FeatureFlagService;
  const policy = new SupportInvestigationPolicyService(featureFlags, profile, 'future-namespace', access);
  const controller = new SupportHistoryController(policy);
  const apiService = { get: vi.fn(async () => ({ data: difference })) };
  (controller as unknown as { apiService: ApiService }).apiService = apiService as unknown as ApiService;
  return { controller, apiService };
};

describe('SupportHistoryController investigation document protection', () => {
  it('keeps revision JSON-parameter values for a user with read access to every profile document', async () => {
    const { controller } = makeController();
    const response = mockRes();

    await controller.fetchErrandRevisionsDiff(
      mockReq(mockUser({ groups: ['INVESTIGATOR'] })),
      mockSupportErrandId,
      mockMunicipalityId,
      2,
      3,
      response as unknown as Response<DifferenceResponse>,
    );

    expect(response.body).toEqual(difference);
  });

  it('removes nested values for custom future profile documents without hiding unrelated errand history', async () => {
    const { controller, apiService } = makeController();
    const response = mockRes();
    const req = mockReq(mockUser({ groups: ['other'] }));

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
      },
      req.user,
    );
  });
});
