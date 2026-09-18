import { Response } from 'express';
import { Controller, Get, Param, QueryParam, Req, Res, UseBefore } from 'routing-controllers';
import { OpenAPI } from 'routing-controllers-openapi';

import { SUPPORTMANAGEMENT_NAMESPACE } from '@/config';
import { apiServiceName } from '@/config/api-config';
import { PageProcessActivity } from '@/data-contracts/supportmanagement/data-contracts';
import { RequestWithUser } from '@/interfaces/auth.interface';
import authMiddleware from '@/middlewares/auth.middleware';
import ApiService from '@/services/api.service';

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 200;

const resolvePageSize = (size?: number): number => {
  if (!size || size < 1) return DEFAULT_PAGE_SIZE;
  return Math.min(size, MAX_PAGE_SIZE);
};

@Controller()
export class SupportProcessController {
  private apiService = new ApiService();
  private namespace = SUPPORTMANAGEMENT_NAMESPACE;
  private SERVICE = apiServiceName('supportmanagement');

  @Get('/supportprocess/:municipalityId/:id/activities')
  @OpenAPI({ summary: 'Get the process activity log for an errand' })
  @UseBefore(authMiddleware)
  async fetchProcessActivities(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Param('municipalityId') municipalityId: string,
    @QueryParam('size') size: number,
    @Res() response: Response<PageProcessActivity, any>,
  ): Promise<Response<PageProcessActivity, any>> {
    const query = `page=0&size=${resolvePageSize(size)}&sort=occurredAt%2CDESC`;
    const url = `${this.SERVICE}/${municipalityId}/${this.namespace}/errands/${id}/process-activities?${query}`;
    const res = await this.apiService.get<PageProcessActivity>({ url, propagateClientError: true }, req.user);
    return response.status(200).send(res.data);
  }
}
