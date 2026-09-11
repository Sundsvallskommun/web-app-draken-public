import { IsDefined, IsObject, IsString, MinLength } from 'class-validator';
import { Response } from 'express';
import { Body, Controller, Get, HeaderParam, Param, Put, Req, Res, UseBefore } from 'routing-controllers';
import { OpenAPI } from 'routing-controllers-openapi';

import { APPLICATION, SUPPORTMANAGEMENT_NAMESPACE } from '@/config';
import { resolveIafVofInvestigationDocumentApplicability } from '@/config/iaf-vof-investigation-classification';
import { getSupportInvestigationProfile } from '@/config/support-investigation-profile';
import type { Errand } from '@/data-contracts/supportmanagement/data-contracts';
import { SupportInvestigationDocumentProfileDto, SupportInvestigationProfileDto } from '@/dtos/support-investigation-profile.dto';
import { HttpException } from '@/exceptions/HttpException';
import { RequestWithUser } from '@/interfaces/auth.interface';
import authMiddleware from '@/middlewares/auth.middleware';
import { validationMiddleware } from '@/middlewares/validation.middleware';
import { JsonObject } from '@/services/schema-bound-json.service';
import { SupportInvestigationAccessService } from '@/services/support-investigation-access.service';
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

const NOT_APPLICABLE_MESSAGES: Readonly<Record<Exclude<SupportInvestigationDocumentProfileDto['appliesTo'] & string, 'all'>, string>> = Object.freeze(
  {
    'reported-misconduct': 'This investigation document applies to reported misconduct errands only',
    'hsl-deviation': 'This investigation document applies to HSL deviation errands only',
  },
);

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
  private readonly accessService: SupportInvestigationAccessService;

  constructor(
    investigationProfile: SupportInvestigationProfileDto = getSupportInvestigationProfile(APPLICATION),
    documentService = new SupportJsonParameterService({ namespace: SUPPORTMANAGEMENT_NAMESPACE ?? '' }),
    policyService = new SupportInvestigationPolicyService(undefined, investigationProfile),
    accessService = new SupportInvestigationAccessService(),
  ) {
    this.investigationProfile = investigationProfile;
    this.documentService = documentService;
    this.policyService = policyService;
    this.accessService = accessService;
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
    await this.accessService.assertCanReadDocument(req.user, municipalityId, errandId, definition.key);
    await this.assertDocumentAppliesToErrand(req, definition, municipalityId, errandId);
    const result = await this.documentService.readJsonParameter({ definition, municipalityId, errandId, user: req.user });

    setETagHeader(response, result.etag, result.document.version);
    return response.status(result.status).send(result.document);
  }

  @Put('/supporterrands/:municipalityId/:errandId/json-parameters/:key')
  @OpenAPI({ summary: 'Create or update one JSON parameter on a support errand' })
  @UseBefore(authMiddleware, validationMiddleware(UpdateSupportErrandJsonParameterDto, 'body'))
  async updateJsonParameter(
    @Req() req: RequestWithUser,
    @Param('municipalityId') municipalityId: string,
    @Param('errandId') errandId: string,
    @Param('key') key: string,
    @HeaderParam('If-Match') ifMatch: string,
    @HeaderParam('If-None-Match') ifNoneMatch: string,
    @HeaderParam('X-Errand-Version') parentErrandVersion: string,
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
    // Support Management authorizes the document itself from the forwarded AD account; refusing
    // here keeps the BFF's answer a 403 about permissions instead of a relayed upstream failure.
    // A user who may only read the document is refused here rather than at the load.
    await this.accessService.assertCanWriteDocument(req.user, municipalityId, errandId, definition.key);
    const snapshot = await this.assertDocumentAppliesToErrand(req, definition, municipalityId, errandId);
    await this.assertPrerequisiteDocumentSaved(req, definition, municipalityId, errandId, snapshot);
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

  /**
   * A document declared for reported misconduct only is refused on every other errand, on reads as
   * well as writes: the decision tab is hidden for such errands, so a request that still arrives is
   * a client the profile does not describe. Access is checked before this so a user who may not
   * see the document learns nothing about the errand from the answer.
   */
  private async assertDocumentAppliesToErrand(
    req: RequestWithUser,
    definition: SupportInvestigationDocumentProfileDto,
    municipalityId: string,
    errandId: string,
  ): Promise<Errand | undefined> {
    const appliesTo = definition.appliesTo ?? 'all';
    if (appliesTo === 'all') return undefined;

    // The applicability rule is the IAF/VOF classification policy's; an application without one
    // has no way to decide, so its restricted documents stay closed.
    if (!this.policyService.iafVofClassificationPolicy) {
      throw new HttpException(409, 'Restricted investigation documents require an investigation classification policy');
    }
    const errand = await this.documentService.readParentErrandSnapshot({ definition, municipalityId, errandId, user: req.user });
    if (resolveIafVofInvestigationDocumentApplicability(errand) !== appliesTo) {
      throw new HttpException(409, NOT_APPLICABLE_MESSAGES[appliesTo]);
    }
    return errand;
  }

  /**
   * A document that answers another one is written only once that one exists on the errand. The
   * snapshot from the applicability check is reused when there is one, so the parent is read once.
   */
  private async assertPrerequisiteDocumentSaved(
    req: RequestWithUser,
    definition: SupportInvestigationDocumentProfileDto,
    municipalityId: string,
    errandId: string,
    snapshot: Errand | undefined,
  ): Promise<void> {
    const prerequisiteKey = definition.prerequisiteDocumentKey;
    if (!prerequisiteKey) return;

    const errand = snapshot ?? (await this.documentService.readParentErrandSnapshot({ definition, municipalityId, errandId, user: req.user }));
    if (!errand.jsonParameters?.some(parameter => parameter.key === prerequisiteKey)) {
      throw new HttpException(409, `This investigation document requires ${prerequisiteKey} to be saved on the errand first`);
    }
  }
}
