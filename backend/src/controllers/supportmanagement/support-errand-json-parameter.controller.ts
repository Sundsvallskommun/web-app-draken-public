import { IsDefined, IsObject, IsString, MinLength } from 'class-validator';
import { Response } from 'express';
import { Body, Controller, Get, HeaderParam, Param, Put, Req, Res, UseBefore } from 'routing-controllers';
import { OpenAPI } from 'routing-controllers-openapi';

import { APPLICATION, SUPPORTMANAGEMENT_NAMESPACE } from '@/config';
import { getSupportInvestigationProfile } from '@/config/support-investigation-profile';
import { SupportInvestigationDocumentProfileDto, SupportInvestigationProfileDto } from '@/dtos/support-investigation-profile.dto';
import { HttpException } from '@/exceptions/HttpException';
import { RequestWithUser } from '@/interfaces/auth.interface';
import authMiddleware from '@/middlewares/auth.middleware';
import { hasPermissions } from '@/middlewares/permissions.middleware';
import { validationMiddleware } from '@/middlewares/validation.middleware';
import { JsonObject } from '@/services/schema-bound-json.service';
import { SupportInvestigationPolicyService } from '@/services/support-investigation-policy.service';
import { SupportJsonParameter, SupportJsonParameterService } from '@/services/support-json-parameter.service';

export type SupportErrandJsonParameterKey = SupportInvestigationProfileDto['documents'][number]['key'];

export type SupportErrandJsonParameter = SupportJsonParameter<SupportErrandJsonParameterKey>;

export class UpdateSupportErrandJsonParameterDto {
  @IsString()
  @MinLength(1)
  schemaId!: string;

  @IsDefined()
  @IsObject()
  value!: JsonObject;
}

const setETagHeader = (response: Response, etag: unknown, version?: number): void => {
  if (typeof etag === 'string') {
    response.setHeader('ETag', etag);
    return;
  }

  if (version !== undefined) {
    response.setHeader('ETag', `"${version}"`);
  }
};

const requireJsonParameterDefinition = (profile: SupportInvestigationProfileDto, key: string): SupportInvestigationDocumentProfileDto => {
  const definition = profile.documents.find(document => document.key === key);
  if (!definition) {
    throw new HttpException(400, 'Unsupported investigation JSON parameter key');
  }

  return definition;
};

@Controller()
export class SupportErrandJsonParameterController {
  private readonly investigationProfile: SupportInvestigationProfileDto;
  private readonly documentService: SupportJsonParameterService;
  private readonly policyService: SupportInvestigationPolicyService;

  constructor(
    investigationProfile: SupportInvestigationProfileDto = getSupportInvestigationProfile(APPLICATION),
    documentService = new SupportJsonParameterService({ namespace: SUPPORTMANAGEMENT_NAMESPACE ?? '' }),
    policyService = new SupportInvestigationPolicyService(undefined, investigationProfile),
  ) {
    this.investigationProfile = investigationProfile;
    this.documentService = documentService;
    this.policyService = policyService;
  }

  @Get('/supporterrands/:municipalityId/:errandId/json-parameters/:key')
  @OpenAPI({ summary: 'Read one JSON parameter from a support errand' })
  @UseBefore(authMiddleware)
  async getJsonParameter(
    @Req() req: RequestWithUser,
    @Param('municipalityId') municipalityId: string,
    @Param('errandId') errandId: string,
    @Param('key') key: string,
    @Res() response: Response,
  ): Promise<Response> {
    const definition = requireJsonParameterDefinition(this.investigationProfile, key);
    // Reads stay allowed while investigation is merely inactive, so existing documents remain
    // viewable, but an unresolvable policy fails closed here as it does on every write path.
    if ((await this.policyService.getState(req.user)) === 'unavailable') {
      throw new HttpException(503, 'Investigation read policy is temporarily unavailable');
    }
    this.policyService.assertCanReadDocument(req.user, definition.key);
    const result = await this.documentService.readJsonParameter({ definition, municipalityId, errandId, user: req.user });

    setETagHeader(response, result.etag, result.document.version);
    return response.status(result.status).send(result.document);
  }

  @Put('/supporterrands/:municipalityId/:errandId/json-parameters/:key')
  @OpenAPI({ summary: 'Create or update one JSON parameter on a support errand' })
  @UseBefore(authMiddleware, hasPermissions(['canEditSupportManagement']), validationMiddleware(UpdateSupportErrandJsonParameterDto, 'body'))
  async updateJsonParameter(
    @Req() req: RequestWithUser,
    @Param('municipalityId') municipalityId: string,
    @Param('errandId') errandId: string,
    @Param('key') key: string,
    @HeaderParam('If-Match') ifMatch: string,
    @HeaderParam('If-None-Match') ifNoneMatch: string,
    @HeaderParam('X-Errand-Version') parentErrandVersion: string | undefined,
    @Body() data: UpdateSupportErrandJsonParameterDto,
    @Res() response: Response,
  ): Promise<Response> {
    const definition = requireJsonParameterDefinition(this.investigationProfile, key);
    const state = await this.policyService.getState(req.user);
    if (state === 'unavailable') {
      throw new HttpException(503, 'Investigation write policy is temporarily unavailable');
    }
    if (state !== 'active') {
      throw new HttpException(409, 'Investigation documents are not active for this application');
    }
    this.policyService.assertCanWriteDocument(req.user, definition.key);

    const result = await this.documentService.writeJsonParameter({
      definition,
      municipalityId,
      errandId,
      user: req.user,
      data,
      preconditions: { ifMatch, ifNoneMatch, parentErrandVersion },
    });

    setETagHeader(response, result.etag, result.document.version);
    response.setHeader('X-Errand-Version', String(result.parentErrandVersion));
    return response.status(result.status).send(result.document);
  }
}
