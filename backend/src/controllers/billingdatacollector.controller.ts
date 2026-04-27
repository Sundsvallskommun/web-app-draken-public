import { Response } from 'express';
import { Controller, Get, Param, Req, Res, UseBefore } from 'routing-controllers';
import { OpenAPI } from 'routing-controllers-openapi';

import { MUNICIPALITY_ID } from '@/config';
import { apiServiceName } from '@/config/api-config';
import { ScheduledBilling } from '@/data-contracts/billing-data-collector/data-contracts';
import { RequestWithUser } from '@/interfaces/auth.interface';
import authMiddleware from '@/middlewares/auth.middleware';
import { hasAnyPermission } from '@/middlewares/permissions.middleware';
import ApiService from '@/services/api.service';

@Controller()
@UseBefore(hasAnyPermission(['canEditCasedata']))
export class BillingDataCollectorController {
  private readonly apiService = new ApiService();
  private readonly SERVICE = apiServiceName('billing-data-collector');

  @Get('/billingdatacollector/:contractId')
  @OpenAPI({ summary: 'Get next scheduled billing date by contract id' })
  @UseBefore(authMiddleware)
  async getBillingRecord(
    @Req() req: RequestWithUser,
    @Param('contractId') contractId: string,
    @Res() response: Response<string>,
  ): Promise<Response<string>> {
    const url = `${this.SERVICE}/${MUNICIPALITY_ID}/scheduled-billing/external/CONTRACT/${contractId}`;
    const res = await this.apiService.get<ScheduledBilling>({ url }, req.user);
    return response.status(200).send(res.data.nextScheduledBilling);
  }
}
