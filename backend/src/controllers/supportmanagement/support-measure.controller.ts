import { Body, Controller, Get, HeaderParam, OnUndefined, Param, Patch, Post, Req, UseBefore } from 'routing-controllers';
import { OpenAPI } from 'routing-controllers-openapi';

import { CreateSupportMeasureDto, DecideSupportMeasureDto, UpdateSupportMeasureDto } from '@/dtos/support-measure.dto';
import { RequestWithUser } from '@/interfaces/auth.interface';
import authMiddleware from '@/middlewares/auth.middleware';
import { hasPermissions } from '@/middlewares/permissions.middleware';
import { validationMiddleware } from '@/middlewares/validation.middleware';
import { SupportMeasureService } from '@/services/support-measure.service';

// Write handlers return nothing. routing-controllers turns an undefined result into NotFoundError unless
// @OnUndefined names the status, and that error carries no `status`/message, so it surfaced as an opaque 500.
@Controller()
export class SupportMeasureController {
  private readonly measures = new SupportMeasureService();

  @Get('/supporterrands/:municipalityId/:errandId/measures')
  @OpenAPI({ summary: 'Read protected errand measures with the loaded errand version' })
  @UseBefore(authMiddleware)
  async read(@Req() req: RequestWithUser, @Param('municipalityId') municipalityId: string, @Param('errandId') errandId: string) {
    return this.measures.read(municipalityId, errandId, req.user);
  }

  @Post('/supporterrands/:municipalityId/:errandId/measures')
  @OnUndefined(204)
  @OpenAPI({ summary: 'Create an errand measure using Draken registration rules and the authenticated creator' })
  @UseBefore(authMiddleware, hasPermissions(['canEditSupportManagement']), validationMiddleware(CreateSupportMeasureDto, 'body'))
  async create(
    @Req() req: RequestWithUser,
    @Param('municipalityId') municipalityId: string,
    @Param('errandId') errandId: string,
    @Body() data: CreateSupportMeasureDto,
  ) {
    await this.measures.create(municipalityId, errandId, data, req.user);
  }

  @Patch('/supporterrands/:municipalityId/:errandId/measures/:measureId')
  @OnUndefined(204)
  @OpenAPI({ summary: 'Update the basic fields of an errand measure' })
  @UseBefore(authMiddleware, hasPermissions(['canEditSupportManagement']), validationMiddleware(UpdateSupportMeasureDto, 'body'))
  async update(
    @Req() req: RequestWithUser,
    @Param('municipalityId') municipalityId: string,
    @Param('errandId') errandId: string,
    @Param('measureId') measureId: string,
    // Keep the runtime decorator type String; Object would JSON-parse and strip the ETag quotes.
    @HeaderParam('If-Match') ifMatch: string,
    @Body() data: UpdateSupportMeasureDto,
  ) {
    await this.measures.update(municipalityId, errandId, measureId, ifMatch, data, req.user);
  }

  @Patch('/supporterrands/:municipalityId/:errandId/measures/:measureId/decision')
  @OnUndefined(204)
  @OpenAPI({ summary: 'Decide a pending measure proposal using the authenticated decision role and measure version' })
  @UseBefore(authMiddleware, hasPermissions(['canEditSupportManagement']), validationMiddleware(DecideSupportMeasureDto, 'body'))
  async decide(
    @Req() req: RequestWithUser,
    @Param('municipalityId') municipalityId: string,
    @Param('errandId') errandId: string,
    @Param('measureId') measureId: string,
    @HeaderParam('If-Match') ifMatch: string,
    @Body() data: DecideSupportMeasureDto,
  ) {
    await this.measures.decide(municipalityId, errandId, measureId, ifMatch, data, req.user);
  }
}
