import { MUNICIPALITY_ID } from '@/config';
import { FeatureFlagDto } from '@/dtos/featureflag.dto';
import { HttpException } from '@/exceptions/HttpException';
import { RequestWithUser } from '@/interfaces/auth.interface';
import { FeatureFlagsApiResponse } from '@/responses/featureflag.response';
import ApiService from '@/services/api.service';
import { logger } from '@/utils/logger';
import authMiddleware from '@middlewares/auth.middleware';
import { Controller, Get, Req, UseBefore } from 'routing-controllers';
import { OpenAPI, ResponseSchema } from 'routing-controllers-openapi';

@Controller()
export class FeatureFlagController {
  private apiService = new ApiService();
  private application = process.env.APPLICATION;
  private caseDataNamespace = process.env.CASEDATA_NAMESPACE;
  private supportManagementNamespace = process.env.SUPPORTMANAGEMENT_NAMESPACE;

  @Get('/featureflags')
  @UseBefore(authMiddleware)
  @OpenAPI({ summary: 'Get all feature flags' })
  @ResponseSchema(FeatureFlagDto)
  async getFeatureFlags(@Req() req: RequestWithUser): Promise<FeatureFlagDto[]> {
    if (!req.user) {
      throw new HttpException(400, 'Bad Request');
    }

    try {
      const url = `${process.env.ADMINPANEL_URL}/featureflags/${MUNICIPALITY_ID}`;
      const res = await this.apiService.get<FeatureFlagsApiResponse>({ baseURL: url }, req.user);

      const namespaces = [this.caseDataNamespace, this.supportManagementNamespace];

      const filteredFlags = res.data.data.filter(flag => {
        return flag.application === this.application && namespaces.includes(flag.namespace);
      });

      const featureFlagRes: FeatureFlagDto[] = filteredFlags.map(flag => ({
        name: flag.name,
        value: flag.value,
        enabled: flag.enabled,
      }));

      return featureFlagRes;
    } catch (error) {
      logger.error('Error getting featureflags', error);

      throw new HttpException(error?.status ?? 500, error?.message ?? 'Internal Server Error');
    }
  }
}
