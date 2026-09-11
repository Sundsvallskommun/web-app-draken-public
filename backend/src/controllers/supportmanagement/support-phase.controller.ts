import { IsInt, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';
import { Body, Controller, HttpCode, Param, Patch, Req, Res, UseBefore } from 'routing-controllers';
import { OpenAPI } from 'routing-controllers-openapi';

import { SUPPORTMANAGEMENT_NAMESPACE } from '@/config';
import { apiServiceName } from '@/config/api-config';
import { Errand as SupportErrand, MetadataResponse as SupportMetadata } from '@/data-contracts/supportmanagement/data-contracts';
import { HttpException } from '@/exceptions/HttpException';
import { RequestWithUser } from '@/interfaces/auth.interface';
import authMiddleware from '@/middlewares/auth.middleware';
import { hasPermissions } from '@/middlewares/permissions.middleware';
import { validationMiddleware } from '@/middlewares/validation.middleware';
import ApiService from '@/services/api.service';
import { getErrandVersion, resolveSupportErrandPhaseTransition } from '@/services/support-errand.service';
import { logger } from '@/utils/logger';
import { apiURL } from '@/utils/util';

export class UpdateSupportErrandPhaseDto {
  @IsInt()
  @Min(0)
  @Max(Number.MAX_SAFE_INTEGER)
  expectedVersion!: number;

  /**
   * The transition to apply. Omitted only when the errand has no active phase: it is then entering
   * the workflow rather than moving within it, and there is no transition to name.
   */
  @IsOptional()
  @IsString()
  @MinLength(1)
  transitionId?: string;
}

/**
 * Workflow phase transitions for a support errand.
 *
 * Support Management has no errand-level phase route: the phase model lives under `metadata/phases`
 * and an errand moves by writing `activePhaseId` on the errand itself. The phase is therefore an
 * errand-level field, and the errand's own version is the right precondition for changing it - the
 * one shape of write where that is true, as against the parameters and JSON parameters that carry
 * versions of their own.
 *
 * Draken never derives the target from metadata order. The client submits an explicit transition id,
 * which is resolved against the errand's active phase and fresh metadata, so a branched workflow
 * cannot be advanced by guessing.
 */
@Controller()
@UseBefore(hasPermissions(['canEditSupportManagement']))
export class SupportPhaseController {
  private apiService = new ApiService();
  private namespace = SUPPORTMANAGEMENT_NAMESPACE;
  SERVICE = apiServiceName('supportmanagement');

  @Patch('/supporterrands/:municipalityId/:id/phase')
  @HttpCode(200)
  @OpenAPI({ summary: 'Apply one explicit workflow transition to a support errand' })
  @UseBefore(authMiddleware, validationMiddleware(UpdateSupportErrandPhaseDto, 'body'))
  async updateSupportErrandPhase(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Param('municipalityId') municipalityId: string,
    @Body() data: UpdateSupportErrandPhaseDto,
    @Res() response: any,
  ): Promise<any> {
    if (!municipalityId) {
      logger.error('No municipality id found, it is needed to update the errand phase.');
      return response.status(400).send('Municipality id missing');
    }

    const url = `${municipalityId}/${this.namespace}/errands/${id}`;
    const metadataUrl = `${municipalityId}/${this.namespace}/metadata`;
    const baseURL = apiURL(this.SERVICE);
    const [currentErrand, metadata] = await Promise.all([
      this.apiService.get<SupportErrand>({ url, baseURL, includeResponseHeaders: true, propagateClientError: true }, req.user),
      this.apiService.get<SupportMetadata>({ url: metadataUrl, baseURL, propagateClientError: true }, req.user),
    ]);
    const currentVersion = getErrandVersion(currentErrand.data, currentErrand.headers?.etag);
    if (currentVersion !== data.expectedVersion) {
      throw new HttpException(409, 'Support errand phase has changed since it was loaded');
    }

    const transition = resolveSupportErrandPhaseTransition(currentErrand.data, metadata.data.phases, data.transitionId);
    await this.apiService.patch<SupportErrand, { activePhaseId: string; status?: string }>(
      {
        url,
        baseURL,
        // Phase and status move together: a phase declares which statuses it allows, so writing one
        // without the other leaves the errand in a combination its own workflow does not have.
        data: { activePhaseId: transition.targetPhaseId, ...(transition.status ? { status: transition.status } : {}) },
        headers: { 'If-Match': `"${currentVersion}"` },
        followLocation: false,
        propagateClientError: true,
      },
      req.user,
    );

    const savedErrand = await this.apiService.get<SupportErrand>(
      { url, baseURL, includeResponseHeaders: true, propagateClientError: true },
      req.user,
    );
    return response.status(200).send({
      ...savedErrand.data,
      version: getErrandVersion(savedErrand.data, savedErrand.headers?.etag),
    });
  }
}
