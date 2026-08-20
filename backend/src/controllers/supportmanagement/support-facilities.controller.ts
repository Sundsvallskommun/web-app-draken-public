import { IsArray, IsDefined, IsString, MaxLength } from 'class-validator';
import { Response } from 'express';
import { Body, Controller, HeaderParam, Param, Patch, Req, Res, UseBefore } from 'routing-controllers';
import { OpenAPI } from 'routing-controllers-openapi';

import { SUPPORTMANAGEMENT_NAMESPACE } from '@/config';
import { apiServiceName } from '@/config/api-config';
import { preservesIafVofInvestigationClassificationOwnerParameter } from '@/config/iaf-vof-investigation-classification';
import { Errand, Parameter } from '@/data-contracts/supportmanagement/data-contracts';
import { HttpException } from '@/exceptions/HttpException';
import { RequestWithUser } from '@/interfaces/auth.interface';
import authMiddleware from '@/middlewares/auth.middleware';
import { hasPermissions } from '@/middlewares/permissions.middleware';
import { validationMiddleware } from '@/middlewares/validation.middleware';
import ApiService from '@/services/api.service';
import {
  assertRequestedErrandVersion,
  assertSupportErrandWritable,
  getErrandVersion,
  requireStrongErrandVersion,
  stripParameterVersions,
} from '@/services/support-errand.service';
import { SupportInvestigationPolicyService } from '@/services/support-investigation-policy.service';
import { apiURL } from '@/utils/util';

const PROPERTY_DESIGNATION = { key: 'propertyDesignation', displayName: 'Fastighetsbeteckning' } as const;
const DISTRICT_NAME = { key: 'districtname', displayName: 'Distriktnamn' } as const;
const STREET = { key: 'street', displayName: 'Adress' } as const;
const FACILITY_PARAMETER_KEYS: ReadonlySet<string> = new Set([PROPERTY_DESIGNATION.key, DISTRICT_NAME.key, STREET.key]);

export class SupportFacilitiesPayloadDto {
  @IsDefined()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(3000, { each: true })
  propertyDesignations!: string[];

  @IsDefined()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(3000, { each: true })
  districtnames!: string[];

  @IsDefined()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(3000, { each: true })
  streets!: string[];
}

type WritableParameter = Omit<Parameter, 'version'>;

@Controller()
export class SupportFacilitiesController {
  private apiService = new ApiService();
  private investigationPolicyService = new SupportInvestigationPolicyService();
  private namespace = SUPPORTMANAGEMENT_NAMESPACE;
  SERVICE = apiServiceName('supportmanagement');

  @Patch('/supporterrands/saveFacilities/:municipalityId/:id')
  @OpenAPI({ summary: 'Save facilities by errand' })
  @UseBefore(authMiddleware, hasPermissions(['canEditSupportManagement']), validationMiddleware(SupportFacilitiesPayloadDto, 'body'))
  async saveFacility(
    @Req() req: RequestWithUser,
    @Param('municipalityId') municipalityId: string,
    @Param('id') id: string,
    @HeaderParam('If-Match') ifMatch: string | undefined,
    @Body() facilities: SupportFacilitiesPayloadDto,
    @Res() response: Response,
  ): Promise<Response> {
    if (!municipalityId || !id) {
      throw new HttpException(400, 'Bad Request');
    }

    const requestedVersion = requireStrongErrandVersion(ifMatch);
    const baseURL = apiURL(this.SERVICE);
    const parentUrl = `${municipalityId}/${this.namespace}/errands/${id}`;
    const currentErrandResponse = await this.apiService.get<Errand>(
      { url: parentUrl, baseURL, includeResponseHeaders: true, propagateClientError: true },
      req.user,
    );
    const currentErrand = currentErrandResponse.data;
    const currentVersion = getErrandVersion(currentErrand, currentErrandResponse.headers?.etag);
    assertRequestedErrandVersion(requestedVersion, currentVersion);
    assertSupportErrandWritable(currentErrand, 'facility changes');

    const preservedParameters = stripParameterVersions(
      (currentErrand.parameters ?? []).filter(parameter => !FACILITY_PARAMETER_KEYS.has(parameter.key)),
    );
    const requestedParameters: WritableParameter[] = [
      ...preservedParameters,
      { ...PROPERTY_DESIGNATION, values: facilities.propertyDesignations },
      { ...DISTRICT_NAME, values: facilities.districtnames },
      { ...STREET, values: facilities.streets },
    ];

    const iafVofClassificationPolicy = this.investigationPolicyService.iafVofClassificationPolicy;
    if (iafVofClassificationPolicy) {
      const classificationOwner = await this.investigationPolicyService.getClassificationOwner(req.user);
      if (classificationOwner === 'unavailable') {
        throw new HttpException(503, 'Investigation classification ownership is temporarily unavailable');
      }
      if (
        classificationOwner === 'investigation' &&
        !preservesIafVofInvestigationClassificationOwnerParameter(currentErrand.parameters, requestedParameters)
      ) {
        throw new HttpException(409, 'The investigation classification owner parameter cannot be changed through the facilities endpoint');
      }
    }

    const parameterUrl = `${parentUrl}/parameters`;
    const savedParameters = await this.apiService.patch<Parameter[], WritableParameter[]>(
      {
        url: parameterUrl,
        baseURL,
        data: requestedParameters,
        headers: { 'If-Match': `"${currentVersion}"` },
        followLocation: false,
        propagateClientError: true,
      },
      req.user,
    );

    return response.status(200).send(savedParameters.data);
  }
}
