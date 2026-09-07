import { Controller, Get, Req, UseBefore } from 'routing-controllers';
import { OpenAPI, ResponseSchema } from 'routing-controllers-openapi';

import { SupportApplicationRuntimeProfileDto } from '@/dtos/support-application-profile.dto';
import { RequestWithUser } from '@/interfaces/auth.interface';
import authMiddleware from '@/middlewares/auth.middleware';
import { SupportApplicationPolicyService } from '@/services/support-application-policy.service';

@Controller()
export class SupportApplicationProfileController {
  constructor(private readonly policyService = new SupportApplicationPolicyService()) {}

  @Get('/supportmanagement/application-profile')
  @OpenAPI({ summary: 'Get the investigation profile for the current application' })
  @ResponseSchema(SupportApplicationRuntimeProfileDto)
  @UseBefore(authMiddleware)
  async getSupportApplicationProfile(@Req() req: RequestWithUser): Promise<SupportApplicationRuntimeProfileDto> {
    return await this.policyService.getRuntimeProfile(req.user);
  }
}
