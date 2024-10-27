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

@Controller()
export class SupportMetadataController {
  private apiService = new ApiService();
  private namespace = SUPPORTMANAGEMENT_NAMESPACE;

  @Get('/supportmetadata/:municipalityId')
  @OpenAPI({ summary: 'Get support metadata' })
  @UseBefore(authMiddleware)
  async fetchSupportMetadata(
    @Req() req: RequestWithUser,
    @Param('municipalityId') municipalityId: string,
    @Res() response: any,
  ): Promise<SupportMetadata> {
    const url = `supportmanagement/8.1/${municipalityId}/${this.namespace}/metadata`;
    const res = await this.apiService.get<SupportMetadata>({ url }, req.user);
    return response.status(200).send(res.data);
  }
}
