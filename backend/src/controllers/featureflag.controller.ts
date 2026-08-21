import authMiddleware from '@middlewares/auth.middleware';
import { Controller, Get, Req, UseBefore } from 'routing-controllers';
import { OpenAPI, ResponseSchema } from 'routing-controllers-openapi';

import { FeatureFlagDto } from '@/dtos/featureflag.dto';
import { HttpException } from '@/exceptions/HttpException';
import { RequestWithUser } from '@/interfaces/auth.interface';
import { FeatureFlagService } from '@/services/feature-flag.service';
import { logger } from '@/utils/logger';

@Controller()
export class FeatureFlagController {
  private featureFlagService = new FeatureFlagService();

  @Get('/featureflags')
  @UseBefore(authMiddleware)
  @OpenAPI({ summary: 'Get all feature flags' })
  @ResponseSchema(FeatureFlagDto)
  async getFeatureFlags(@Req() req: RequestWithUser): Promise<FeatureFlagDto[]> {
    if (!req.user) {
      throw new HttpException(400, 'Bad Request');
    }

    try {
      return await this.featureFlagService.getFeatureFlags(req.user);
    } catch (error) {
      logger.error('Error getting featureflags', error);

      const httpError = error instanceof HttpException ? error : null;
      throw new HttpException(httpError?.status ?? 500, httpError?.message ?? 'Internal Server Error');
    }
  }
}
