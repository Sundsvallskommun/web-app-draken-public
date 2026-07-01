import { Type as TypeTransformer } from 'class-transformer';
import { IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Body, Controller, Get, HeaderParam, HttpCode, Param, Post, Req, Res, UseBefore } from 'routing-controllers';
import { OpenAPI } from 'routing-controllers-openapi';

import { SUPPORTMANAGEMENT_NAMESPACE } from '@/config';
import { apiServiceName } from '@/config/api-config';
import {
  HandoverErrand,
  HandoverErrandRequest,
  HandoverPreview,
  HandoverPreviewRequest,
  MetadataResponse,
  NamespaceConfig,
} from '@/data-contracts/supportmanagement/data-contracts';
import { RequestWithUser } from '@/interfaces/auth.interface';
import { User } from '@/interfaces/users.interface';
import authMiddleware from '@/middlewares/auth.middleware';
import { validationMiddleware } from '@/middlewares/validation.middleware';
import ApiService from '@/services/api.service';
import { logger } from '@/utils/logger';
import { apiURL } from '@/utils/util';

class HandoverPreviewDto {
  @IsString()
  targetNamespace!: string;
  @IsString()
  targetMunicipalityId!: string;
}

class HandoverTargetDto {
  @IsString()
  namespace!: string;
  @IsString()
  @IsOptional()
  municipalityId?: string;
}

class HandoverErrandDto {
  @ValidateNested()
  @TypeTransformer(() => HandoverTargetDto)
  target!: HandoverTargetDto;
  @IsObject()
  mapping!: object;
  @IsObject()
  @IsOptional()
  overrides?: object;
  @IsObject()
  @IsOptional()
  include?: object;
  @IsObject()
  @IsOptional()
  sourceHandling?: object;
  // Optional message that is added as an internal conversation on the new errand (mirrors MEX forward).
  @IsString()
  @IsOptional()
  message?: string;
}

@Controller()
export class SupportHandoverController {
  private apiService = new ApiService();
  private namespace = SUPPORTMANAGEMENT_NAMESPACE;
  private SERVICE = apiServiceName('supportmanagement');

  @Get('/supportnamespaceconfigs/:municipalityId')
  @OpenAPI({ summary: 'Get namespace configurations for a municipality' })
  @UseBefore(authMiddleware)
  async fetchNamespaceConfigs(
    @Req() req: RequestWithUser,
    @Param('municipalityId') municipalityId: string,
    @Res() response: any,
  ): Promise<NamespaceConfig[]> {
    // SupportManagement NamespaceConfigResource lists configs at the service root with municipalityId
    // as a query parameter: GET /namespace-configs?municipalityId={id} (not a path segment).
    const url = `${this.SERVICE}/namespace-configs?municipalityId=${municipalityId}`;
    const res = await this.apiService.get<NamespaceConfig[]>({ url }, req.user);
    // Exclude the source namespace – an errand can not be handed over to the namespace it is in.
    const targets = (res.data ?? []).filter(config => config.namespace !== this.namespace);
    return response.status(200).send(targets);
  }

  @Get('/supportnamespacemetadata/:municipalityId/:namespace')
  @OpenAPI({ summary: 'Get metadata for a specific namespace (used to resolve handover target display names)' })
  @UseBefore(authMiddleware)
  async fetchNamespaceMetadata(
    @Req() req: RequestWithUser,
    @Param('municipalityId') municipalityId: string,
    @Param('namespace') namespace: string,
    @Res() response: any,
  ): Promise<MetadataResponse> {
    const url = `${this.SERVICE}/${municipalityId}/${namespace}/metadata`;
    const res = await this.apiService.get<MetadataResponse>({ url }, req.user);
    return response.status(200).send(res.data);
  }

  @Post('/supporterrands/:municipalityId/:id/handover/preview')
  @HttpCode(200)
  @OpenAPI({ summary: 'Preview how a support errand would be handed over to another namespace' })
  @UseBefore(authMiddleware, validationMiddleware(HandoverPreviewDto, 'body'))
  async previewHandover(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Param('municipalityId') municipalityId: string,
    @Body() data: HandoverPreviewRequest,
    @Res() response: any,
  ): Promise<HandoverPreview> {
    const url = `${this.SERVICE}/${municipalityId}/${this.namespace}/errands/${id}/handover/preview`;
    const res = await this.apiService.post<HandoverPreview, HandoverPreviewRequest>({ url, data, propagateClientError: true }, req.user);
    return response.status(200).send(res.data);
  }

  @Post('/supporterrands/:municipalityId/:id/handover')
  @HttpCode(201)
  @OpenAPI({ summary: 'Hand over a support errand to another namespace' })
  @UseBefore(authMiddleware, validationMiddleware(HandoverErrandDto, 'body'))
  async handoverErrand(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Param('municipalityId') municipalityId: string,
    @HeaderParam('Idempotency-Key') idempotencyKey: string,
    @Body() data: HandoverErrandRequest & { message?: string },
    @Res() response: any,
  ): Promise<HandoverErrand> {
    // `message` is consumed here (added as a conversation below) and not forwarded to the microservice.
    const { message, ...handoverRequest } = data;
    const url = `${this.SERVICE}/${municipalityId}/${this.namespace}/errands/${id}/handover/execute`;
    const res = await this.apiService.post<HandoverErrand, HandoverErrandRequest>(
      {
        url,
        data: handoverRequest,
        // Reuse the client-generated idempotency key so retries do not create duplicate errands.
        headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined,
        propagateClientError: true,
      },
      req.user,
    );

    const result = res.data;
    // Optionally add the user's message as an internal conversation on the new errand, mirroring the
    // MEX forward. A failure here must not fail the handover – the new errand has already been created.
    if (message?.trim() && result?.newErrandId && result?.target?.namespace) {
      try {
        await this.addHandoverConversation(municipalityId, result.target.namespace, result.newErrandId, result.relationId, message, req.user);
      } catch (error) {
        logger.error(`Error creating handover conversation message: ${error}`);
      }
    }

    return response.status(201).send(result);
  }

  /** Creates an internal "Överlämning" conversation on the handed-over errand and posts the message,
   * in the target namespace (the new errand lives there). Mirrors the MEX forward conversation. */
  private async addHandoverConversation(
    municipalityId: string,
    namespace: string,
    errandId: string,
    relationId: string | undefined,
    content: string,
    user: User,
  ): Promise<void> {
    const baseURL = apiURL(this.SERVICE);
    const conversationUrl = `${municipalityId}/${namespace}/errands/${errandId}/communication/conversations`;

    const conversationRes = await this.apiService.post<{ id?: string }, Record<string, unknown>>(
      {
        url: conversationUrl,
        baseURL,
        data: { topic: 'Överlämning', type: 'INTERNAL', ...(relationId ? { relationIds: [relationId] } : {}) },
      },
      user,
    );

    const conversationId = conversationRes.data?.id;
    if (!conversationId) {
      return;
    }

    const formData = new FormData();
    formData.append('message', JSON.stringify({ createdBy: { type: 'adAccount', value: user.username }, content }));
    await this.apiService.post(
      {
        url: `${conversationUrl}/${conversationId}/messages`,
        baseURL,
        data: formData,
        headers: { 'Content-Type': 'multipart/form-data' },
      },
      user,
    );
  }
}
