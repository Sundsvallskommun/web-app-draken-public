import { Response } from 'express';
import { Controller, Get, Param, Req, Res, UseBefore } from 'routing-controllers';
import { OpenAPI, ResponseSchema } from 'routing-controllers-openapi';

import { SupportInvestigationErrandAccessDto, SupportInvestigationRuntimeProfileDto } from '@/dtos/support-investigation-profile.dto';
import { HttpException } from '@/exceptions/HttpException';
import { RequestWithUser } from '@/interfaces/auth.interface';
import authMiddleware from '@/middlewares/auth.middleware';
import { SupportInvestigationAccessService } from '@/services/support-investigation-access.service';
import { SupportInvestigationPolicyService } from '@/services/support-investigation-policy.service';

@Controller()
export class SupportInvestigationProfileController {
  constructor(
    private readonly policyService = new SupportInvestigationPolicyService(),
    private readonly accessService = new SupportInvestigationAccessService(),
  ) {}

  @Get('/supportmanagement/investigation-profile')
  @OpenAPI({ summary: 'Get the investigation profile for the current application' })
  @ResponseSchema(SupportInvestigationRuntimeProfileDto)
  @UseBefore(authMiddleware)
  async getInvestigationProfile(@Req() req: RequestWithUser): Promise<SupportInvestigationRuntimeProfileDto> {
    return await this.policyService.getRuntimeProfile(req.user);
  }

  @Get('/supporterrands/:municipalityId/:errandId/investigation-access')
  @OpenAPI({ summary: 'Get effective investigation document access for the current user and errand' })
  @ResponseSchema(SupportInvestigationErrandAccessDto)
  @UseBefore(authMiddleware)
  async getInvestigationAccess(
    @Req() req: RequestWithUser,
    @Param('municipalityId') municipalityId: string,
    @Param('errandId') errandId: string,
    @Res() response: Response,
  ): Promise<SupportInvestigationErrandAccessDto> {
    response.setHeader('Cache-Control', 'no-store');
    if ((await this.policyService.getState(req.user)) === 'unavailable') {
      throw new HttpException(503, 'Investigation access policy is temporarily unavailable');
    }
    const keys = this.policyService.profile.documents.map(document => document.key);
    if (keys.length === 0) return { municipalityId, errandId, documents: [] };
    return this.accessService.getDocumentAccess(req.user, municipalityId, errandId, keys);
  }
}
