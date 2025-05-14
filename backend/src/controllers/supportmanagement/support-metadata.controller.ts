import { SUPPORTMANAGEMENT_NAMESPACE } from '@/config';
import { RequestWithUser } from '@/interfaces/auth.interface';
import authMiddleware from '@/middlewares/auth.middleware';
import { validationMiddleware } from '@/middlewares/validation.middleware';
import ApiService from '@/services/api.service';
import { logger } from '@/utils/logger';
import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Req, Res, UseBefore } from 'routing-controllers';
import { OpenAPI } from 'routing-controllers-openapi';

interface SupportType {
  name: string;
  displayName: string;
  escalationEmail?: string;
  created: string;
  modified?: string;
}

interface Category {
  description?: string;
  name: string;
  displayName?: string;
  types: SupportType[];
  created?: string;
  modified?: string;
}

interface ContactReason {
  reason: string;
  created: string;
  modified: string;
}

interface SupportMetadata {
  categories?: Category[];
  externalIdTypes?: {
    description?: string;
    name: string;
    created?: string;
    modified?: string;
  }[];
  statuses?: {
    description?: string;
    name: string;
    created?: string;
    modified?: string;
  }[];
  contactReasons?: ContactReason[];
}

interface SupportRoles {
  name: string;
  displayName?: string;
}
@Controller()
export class SupportMetadataController {
  private apiService = new ApiService();
  private namespace = SUPPORTMANAGEMENT_NAMESPACE;
  private SERVICE = `supportmanagement/10.2`;

  @Get('/supportmetadata/:municipalityId')
  @OpenAPI({ summary: 'Get support metadata' })
  @UseBefore(authMiddleware)
  async fetchSupportMetadata(
    @Req() req: RequestWithUser,
    @Param('municipalityId') municipalityId: string,
    @Res() response: any,
  ): Promise<SupportMetadata> {
    const url = `${this.SERVICE}/${municipalityId}/${this.namespace}/metadata`;
    const res = await this.apiService.get<SupportMetadata>({ url }, req.user);
    return response.status(200).send(res.data);
  }

  @Get('/supportmetadata/:municipalityId/roles')
  @OpenAPI({ summary: 'Get support roles' })
  @UseBefore(authMiddleware)
  async fetchSupportMetadataRoles(
    @Req() req: RequestWithUser,
    @Param('municipalityId') municipalityId: string,
    @Res() response: any,
  ): Promise<SupportRoles> {
    const url = `${this.SERVICE}/${municipalityId}/${this.namespace}/metadata/roles`;
    const res = await this.apiService.get<SupportRoles>({ url }, req.user);
    return response.status(200).send(res.data);
  }
}
