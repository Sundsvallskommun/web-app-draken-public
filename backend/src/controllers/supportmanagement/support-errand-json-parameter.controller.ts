import { IsDefined, IsObject, IsString, MinLength } from 'class-validator';
import { Response } from 'express';
import { Body, Controller, Get, HeaderParam, Param, Put, Req, Res, UseBefore } from 'routing-controllers';
import { OpenAPI } from 'routing-controllers-openapi';

import { SUPPORTMANAGEMENT_NAMESPACE } from '@/config';
import { apiServiceName } from '@/config/api-config';
import { HttpException } from '@/exceptions/HttpException';
import { RequestWithUser } from '@/interfaces/auth.interface';
import authMiddleware from '@/middlewares/auth.middleware';
import { hasPermissions } from '@/middlewares/permissions.middleware';
import { validationMiddleware } from '@/middlewares/validation.middleware';
import ApiService from '@/services/api.service';

export interface JsonObject {
  [property: string]: JsonValue;
}

export type JsonValue = null | boolean | number | string | JsonValue[] | JsonObject;

export const INVESTIGATION_JSON_PARAMETER_KEYS = ['utredning-enhetschef', 'utredning-sol-lss', 'utredning-hsl'] as const;

export type InvestigationJsonParameterKey = (typeof INVESTIGATION_JSON_PARAMETER_KEYS)[number];

export interface SupportErrandJsonParameter {
  key: InvestigationJsonParameterKey;
  value: JsonObject;
  schemaId: string;
  version?: number;
}

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

const requireInvestigationKey = (key: string): InvestigationJsonParameterKey => {
  const supportedKey = INVESTIGATION_JSON_PARAMETER_KEYS.find(candidate => candidate === key);
  if (!supportedKey) {
    throw new HttpException(400, 'Unsupported investigation JSON parameter key');
  }

  return supportedKey;
};

@Controller()
export class SupportErrandJsonParameterController {
  private readonly apiService: ApiService;
  private readonly namespace = SUPPORTMANAGEMENT_NAMESPACE;
  private readonly service = apiServiceName('supportmanagement');

  constructor(apiService = new ApiService()) {
    this.apiService = apiService;
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
    const investigationKey = requireInvestigationKey(key);
    const url = this.buildUpstreamUrl(municipalityId, errandId, investigationKey);
    const result = await this.apiService.get<SupportErrandJsonParameter>({ url, includeResponseHeaders: true, propagateClientError: true }, req.user);

    setETagHeader(response, result.headers?.etag, result.data.version);
    return response.status(200).send(result.data);
  }

  @Put('/supporterrands/:municipalityId/:errandId/json-parameters/:key')
  @OpenAPI({ summary: 'Create or update one JSON parameter on a support errand' })
  @UseBefore(authMiddleware, hasPermissions(['canEditSupportManagement']), validationMiddleware(UpdateSupportErrandJsonParameterDto, 'body'))
  async updateJsonParameter(
    @Req() req: RequestWithUser,
    @Param('municipalityId') municipalityId: string,
    @Param('errandId') errandId: string,
    @Param('key') key: string,
    @HeaderParam('If-Match') ifMatch: string | undefined,
    @Body() data: UpdateSupportErrandJsonParameterDto,
    @Res() response: Response,
  ): Promise<Response> {
    const investigationKey = requireInvestigationKey(key);
    const url = this.buildUpstreamUrl(municipalityId, errandId, investigationKey);
    const body: SupportErrandJsonParameter = {
      key: investigationKey,
      schemaId: data.schemaId,
      value: data.value,
    };
    const result = await this.apiService.put<SupportErrandJsonParameter, SupportErrandJsonParameter>(
      {
        url,
        data: body,
        headers: ifMatch ? { 'If-Match': ifMatch } : undefined,
        includeResponseHeaders: true,
        propagateClientError: true,
      },
      req.user,
    );

    setETagHeader(response, result.headers?.etag, result.data.version);
    return response.status(200).send(result.data);
  }

  private buildUpstreamUrl(municipalityId: string, errandId: string, key: InvestigationJsonParameterKey): string {
    return `${this.service}/${municipalityId}/${this.namespace}/errands/${errandId}/json-parameters/${key}`;
  }
}
