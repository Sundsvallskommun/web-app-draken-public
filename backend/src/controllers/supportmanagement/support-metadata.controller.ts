import { Controller, Get, Param, Req, Res, UseBefore } from 'routing-controllers';
import { OpenAPI } from 'routing-controllers-openapi';

import { SUPPORTMANAGEMENT_NAMESPACE } from '@/config';
import { apiServiceName } from '@/config/api-config';
import { MetadataResponse, Role } from '@/data-contracts/supportmanagement/data-contracts';
import { RequestWithUser } from '@/interfaces/auth.interface';
import authMiddleware from '@/middlewares/auth.middleware';
import ApiService from '@/services/api.service';
import { withCategorizationLabels } from '@/utils/categorization-labels';

/**
 * `namespace` is added here; upstream does not return it.
 *
 * Context: the namespace is needed by the frontend to construct the json schema name for
 * the errand type, which is used to fetch the form for the errand's type.
 * */
type SupportMetadata = MetadataResponse & { namespace?: string };

@Controller()
export class SupportMetadataController {
  private apiService = new ApiService();
  private namespace = SUPPORTMANAGEMENT_NAMESPACE;
  private SERVICE = apiServiceName('supportmanagement');

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
    return response.status(200).send({ ...withCategorizationLabels(res.data), namespace: this.namespace });
  }

  @Get('/supportmetadata/:municipalityId/roles')
  @OpenAPI({ summary: 'Get support roles' })
  @UseBefore(authMiddleware)
  async fetchSupportMetadataRoles(
    @Req() req: RequestWithUser,
    @Param('municipalityId') municipalityId: string,
    @Res() response: any,
  ): Promise<Role[]> {
    const url = `${this.SERVICE}/${municipalityId}/${this.namespace}/metadata/roles`;
    const res = await this.apiService.get<Role[]>({ url }, req.user);
    return response.status(200).send(res.data);
  }
}
