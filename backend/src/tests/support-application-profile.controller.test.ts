import { getMetadataArgsStorage } from 'routing-controllers';

import { SupportApplicationProfileController } from '@/controllers/supportmanagement/support-application-profile.controller';
import authMiddleware from '@/middlewares/auth.middleware';
import { SupportApplicationPolicyService } from '@/services/support-application-policy.service';

import { mockReq } from './helpers/http';

describe('SupportApplicationProfileController', () => {
  it('returns the effective runtime profile selected by the backend policy', async () => {
    const runtimeProfile = {
      application: 'FUTURE',
      documents: [],
      state: 'inactive' as const,
      registration: { mode: 'disabled' as const },
    };
    const policyService = { getRuntimeProfile: vi.fn(async () => runtimeProfile) } as unknown as SupportApplicationPolicyService;
    const controller = new SupportApplicationProfileController(policyService);
    const req = mockReq();

    await expect(controller.getSupportApplicationProfile(req)).resolves.toEqual(runtimeProfile);
    expect(policyService.getRuntimeProfile).toHaveBeenCalledWith(req.user);
  });

  it('exposes an auth-protected GET endpoint', () => {
    const metadata = getMetadataArgsStorage();
    const action = metadata.actions.find(
      candidate => candidate.target === SupportApplicationProfileController && candidate.method === 'getSupportApplicationProfile',
    );
    const uses = metadata.uses.filter(
      candidate => candidate.target === SupportApplicationProfileController && candidate.method === 'getSupportApplicationProfile',
    );

    expect(action).toMatchObject({ route: '/supportmanagement/application-profile', type: 'get' });
    expect(uses.some(use => use.middleware === authMiddleware && use.afterAction === false)).toBe(true);
  });
});
