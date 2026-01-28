import { MUNICIPALITY_ID } from '@/config';
import { apiServiceName } from '@/config/api-config';
import { BillingRecord, Status } from '@/data-contracts/billingpreprocessor/data-contracts';
import { RequestWithUser } from '@/interfaces/auth.interface';
import { CBillingRecord, CPageBillingRecord } from '@/interfaces/billing-interface';
import authMiddleware from '@/middlewares/auth.middleware';
import { hasPermissions } from '@/middlewares/permissions.middleware';
import { validationMiddleware } from '@/middlewares/validation.middleware';
import ApiService from '@/services/api.service';
import { apiURL, toOffsetDateTime } from '@/utils/util';
import dayjs from 'dayjs';
import { Body, Controller, Get, Param, Post, Put, QueryParam, Req, Res, UseBefore } from 'routing-controllers';
import { OpenAPI, ResponseSchema } from 'routing-controllers-openapi';

@Controller()
@UseBefore(hasPermissions(['canEditSupportManagement']))
export class BillingController {
  private apiService = new ApiService();
  private SERVICE = apiServiceName('billingpreprocessor');

  @Get('/billing/billingrecords')
  @OpenAPI({ summary: 'Get all billing records' })
  @ResponseSchema(CPageBillingRecord)
  @UseBefore(authMiddleware)
  async getBillingRecords(
    @Req() req: RequestWithUser,
    @QueryParam('page') page: number,
    @QueryParam('size') size: number,
    @QueryParam('query') query: string,
    @QueryParam('invoiceType') invoiceType: string,
    @QueryParam('status') status: string,
    @QueryParam('start') start: string,
    @QueryParam('end') end: string,
    @QueryParam('sort') sort: string,
    @Res() response: any,
  ): Promise<CPageBillingRecord> {
    const filterList = [];
    if (invoiceType) {
      const types = invoiceType.split(',').map(s => `invoice.description:'${s}'`);
      filterList.push(`(${types.join(' or ')})`);
    }
    if (status) {
      const statuses = status.split(',').map(s => `status:'${s}'`);
      filterList.push(`(${statuses.join(' or ')})`);
    }
    if (start) {
      const s = toOffsetDateTime(dayjs(start).startOf('day'));
      filterList.push(`created>'${s}'`);
    }
    if (end) {
      const e = toOffsetDateTime(dayjs(end).endOf('day'));
      filterList.push(`created<'${e}'`);
    }

    const defaultFilter = "&filter=category:'SALARY_AND_PENSION'";
    const filter = filterList.length > 0 ? `${defaultFilter} and ${filterList.join(' and ')}` : defaultFilter;
    let url = `${this.SERVICE}/${MUNICIPALITY_ID}/billingrecords?page=${page || 0}&size=${size || 8}`;
    url += filter;
    if (sort) {
      url += `&sort=${sort}`;
    }
    const res = await this.apiService.get<CPageBillingRecord>({ url }, req.user);
    return response.status(200).send(res.data);
  }

  @Post('/billing/billingrecords')
  @OpenAPI({ summary: 'Create billing record' })
  @UseBefore(authMiddleware, validationMiddleware(CBillingRecord, 'body'))
  async createBillingRecord(@Req() req: RequestWithUser, @Body() data: BillingRecord, @Res() response: any): Promise<BillingRecord> {
    const url = `${MUNICIPALITY_ID}/billingrecords`;
    const baseURL = apiURL(this.SERVICE);
    const res = await this.apiService.post<BillingRecord, BillingRecord>({ url, baseURL, data }, req.user);
    return response.status(200).send(res.data);
  }

  @Get('/billing/billingrecords/:id')
  @OpenAPI({ summary: 'Get billing record by id' })
  @ResponseSchema(CBillingRecord)
  @UseBefore(authMiddleware)
  async getBillingRecord(@Req() req: RequestWithUser, @Param('id') id: string, @Res() response: any): Promise<BillingRecord> {
    const url = `${this.SERVICE}/${MUNICIPALITY_ID}/billingrecords/${id}`;
    const res = await this.apiService.get<BillingRecord>({ url }, req.user);
    return response.status(200).send(res.data);
  }

  @Put('/billing/billingrecords/:id')
  @OpenAPI({ summary: 'Update billing record by id' })
  @ResponseSchema(CBillingRecord)
  @UseBefore(authMiddleware, validationMiddleware(CBillingRecord, 'body'))
  async updateBillingRecord(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Body() data: CBillingRecord,
    @Res() response: any,
  ): Promise<BillingRecord> {
    if (data.status !== Status.NEW) {
      return response.status(403).send('Error: user is not allowed to change status of billing record');
    }
    const url = `${MUNICIPALITY_ID}/billingrecords/${id}`;
    const baseURL = apiURL(this.SERVICE);
    const res = await this.apiService.put<BillingRecord, BillingRecord>({ url, baseURL, data }, req.user);
    return response.status(200).send(res.data);
  }

  @Put('/billing/billingrecords/:id/status')
  @OpenAPI({ summary: 'Set billing record status' })
  @ResponseSchema(CBillingRecord)
  @UseBefore(authMiddleware, validationMiddleware(CBillingRecord, 'body'), hasPermissions(['canEditAttestations']))
  async setBillingRecordStatus(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Body() data: CBillingRecord,
    @Res() response: any,
  ): Promise<BillingRecord> {
    const url = `${MUNICIPALITY_ID}/billingrecords/${id}`;
    const baseURL = apiURL(this.SERVICE);
    const res = await this.apiService.put<BillingRecord, BillingRecord>({ url, baseURL, data }, req.user);
    return response.status(200).send(res.data);
  }
}
