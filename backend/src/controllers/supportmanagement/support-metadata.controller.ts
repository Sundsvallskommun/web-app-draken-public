import { Controller, Get, Param, Req, Res, UseBefore } from 'routing-controllers';
import { OpenAPI } from 'routing-controllers-openapi';

import { SUPPORTMANAGEMENT_CATEGORIZATION_ROOT, SUPPORTMANAGEMENT_NAMESPACE } from '@/config';
import { apiServiceName } from '@/config/api-config';
import { MetadataResponse, Role } from '@/data-contracts/supportmanagement/data-contracts';
import { RequestWithUser } from '@/interfaces/auth.interface';
import authMiddleware from '@/middlewares/auth.middleware';
import ApiService from '@/services/api.service';
import { withCategorizationLabels } from '@/utils/categorization-labels';

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
  ): Promise<MetadataResponse> {
    const url = `${this.SERVICE}/${municipalityId}/${this.namespace}/metadata`;
    const res = await this.apiService.get<MetadataResponse>({ url }, req.user);
    return response.status(200).send(withCategorizationLabels(res.data, SUPPORTMANAGEMENT_CATEGORIZATION_ROOT));
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
