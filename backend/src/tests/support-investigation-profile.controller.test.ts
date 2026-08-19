import { getMetadataArgsStorage } from 'routing-controllers';

import { SupportInvestigationProfileController } from '@/controllers/supportmanagement/support-investigation-profile.controller';
import authMiddleware from '@/middlewares/auth.middleware';
import { SupportInvestigationPolicyService } from '@/services/support-investigation-policy.service';

import { mockReq } from './helpers/http';

describe('SupportInvestigationProfileController', () => {
  it('returns the effective runtime profile selected by the backend policy', async () => {
    const controller = new SupportInvestigationProfileController();
    const runtimeProfile = {
      application: 'FUTURE',
      documents: [],
      state: 'inactive' as const,
      registration: { mode: 'disabled' as const },
    };
    const policyService = { getRuntimeProfile: vi.fn(async () => runtimeProfile) } as unknown as SupportInvestigationPolicyService;
    (controller as unknown as { policyService: SupportInvestigationPolicyService }).policyService = policyService;
    const req = mockReq();

    await expect(controller.getInvestigationProfile(req)).resolves.toEqual(runtimeProfile);
    expect(policyService.getRuntimeProfile).toHaveBeenCalledWith(req.user);
  });

  it('exposes an auth-protected GET endpoint', () => {
    const metadata = getMetadataArgsStorage();
    const action = metadata.actions.find(
      candidate => candidate.target === SupportInvestigationProfileController && candidate.method === 'getInvestigationProfile',
    );
    const uses = metadata.uses.filter(
      candidate => candidate.target === SupportInvestigationProfileController && candidate.method === 'getInvestigationProfile',
    );

    expect(action).toMatchObject({ route: '/supportmanagement/investigation-profile', type: 'get' });
    expect(uses.some(use => use.middleware === authMiddleware && use.afterAction === false)).toBe(true);
  });
});
