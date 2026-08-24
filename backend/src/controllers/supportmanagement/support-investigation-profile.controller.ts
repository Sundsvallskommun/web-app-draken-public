import { Controller, Get, Req, UseBefore } from 'routing-controllers';
import { OpenAPI, ResponseSchema } from 'routing-controllers-openapi';

import { SupportInvestigationRuntimeProfileDto } from '@/dtos/support-investigation-profile.dto';
import { RequestWithUser } from '@/interfaces/auth.interface';
import authMiddleware from '@/middlewares/auth.middleware';
import { SupportInvestigationPolicyService } from '@/services/support-investigation-policy.service';

@Controller()
export class SupportInvestigationProfileController {
  constructor(private readonly policyService = new SupportInvestigationPolicyService()) {}

  @Get('/supportmanagement/investigation-profile')
  @OpenAPI({ summary: 'Get the investigation profile for the current application' })
  @ResponseSchema(SupportInvestigationRuntimeProfileDto)
  @UseBefore(authMiddleware)
  async getInvestigationProfile(@Req() req: RequestWithUser): Promise<SupportInvestigationRuntimeProfileDto> {
    return await this.policyService.getRuntimeProfile(req.user);
  }
}
