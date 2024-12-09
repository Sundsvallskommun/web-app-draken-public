import { BillingRecord, PageBillingRecord } from '@/data-contracts/billingpreprocessor/data-contracts';
import { RequestWithUser } from '@/interfaces/auth.interface';
import { CBillingRecord, CPageBillingRecord } from '@/interfaces/billing-interface';
import authMiddleware from '@/middlewares/auth.middleware';
import { validationMiddleware } from '@/middlewares/validation.middleware';
import ApiService from '@/services/api.service';
import { logger } from '@/utils/logger';
import { apiURL, luhnCheck, toOffsetDateTime } from '@/utils/util';
import dayjs from 'dayjs';
import { Body, Controller, Get, Param, Post, Put, QueryParam, Req, Res, UseBefore } from 'routing-controllers';
import { OpenAPI, ResponseSchema } from 'routing-controllers-openapi';

@Controller()
export class BillingController {
  private apiService = new ApiService();
  private SERVICE = `billingpreprocessor/2.1`;

  @Get('/billing/:municipalityId/billingrecords')
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
    @Param('municipalityId') municipalityId: string,
    @Res() response: any,
  ): Promise<CPageBillingRecord> {
    if (!municipalityId) {
      console.error('No municipality id found, needed to fetch billing records.');
      logger.error('No municipality id found, needed to fetch billing records.');
      return response.status(400).send('Municipality id missing');
    }
    const filterList = [];
    // TODO Will query filter be used?
    // if (query) {
    //   let guidRes = null;
    //   const isPersonNumber = luhnCheck(query);
    //   if (isPersonNumber) {
    //     const guidUrl = `citizen/2.0/${query}/guid`;
    //     guidRes = await this.apiService.get<string>({ url: guidUrl }, req.user).catch(e => null);
    //   }
    //   let queryFilter = `(`;
    //   queryFilter += `description~'*${query}*'`;
    //   queryFilter += ')';
    //   filterList.push(queryFilter);
    // }
    if (invoiceType) {
      const ss = invoiceType.split(',').map(s => `invoice.description:'${s}'`);
      filterList.push(`(${ss.join(' or ')})`);
    }
    if (status) {
      const ss = status.split(',').map(s => `status:'${s}'`);
      filterList.push(`(${ss.join(' or ')})`);
    }
    if (start) {
      const s = toOffsetDateTime(dayjs(start).startOf('day'));
      filterList.push(`created>'${s}'`);
    }
    if (end) {
      const e = toOffsetDateTime(dayjs(end).endOf('day'));
      filterList.push(`created<'${e}'`);
    }

    // TODO CHANGE WHEN API IS FIXED
    const defaultFilter = "&filter=type:'INTERNAL' and category:'ISYCASE'";

    const filter = filterList.length > 0 ? `${defaultFilter} and ${filterList.join(' and ')}` : defaultFilter;
    let url = `${this.SERVICE}/${municipalityId}/billingrecords?page=${page || 0}&size=${size || 8}`;
    url += filter;
    if (sort) {
      url += `&sort=${sort}`;
    }
    console.log('URL2:', url);
    const res = await this.apiService.get<CPageBillingRecord>({ url }, req.user);
    return response.status(200).send(res.data);
  }

  @Post('/billing/:municipalityId/billingrecords')
  @OpenAPI({ summary: 'Create billing record' })
  @UseBefore(authMiddleware, validationMiddleware(CBillingRecord, 'body'))
  async createBillingRecord(
    @Req() req: RequestWithUser,
    @Param('municipalityId') municipalityId: string,
    @Body() data: BillingRecord,
    @Res() response: any,
  ): Promise<BillingRecord> {
    const url = `${municipalityId}/billingrecords`;
    const baseURL = apiURL(this.SERVICE);
    const res = await this.apiService.post<BillingRecord, BillingRecord>({ url, baseURL, data }, req.user);
    return response.status(200).send(res.data);
  }

  @Get('/billing/:municipalityId/billingrecords/:id')
  @OpenAPI({ summary: 'Get billing record by id' })
  @ResponseSchema(CBillingRecord)
  @UseBefore(authMiddleware)
  async getBillingRecord(
    @Req() req: RequestWithUser,
    @Param('municipalityId') municipalityId: string,
    @Param('id') id: string,
    @Res() response: any,
  ): Promise<BillingRecord> {
    const url = `${this.SERVICE}/${municipalityId}/billingrecords/${id}`;
    const res = await this.apiService.get<BillingRecord>({ url }, req.user);
    return response.status(200).send(res.data);
  }

  @Put('/billing/:municipalityId/billingrecords/:id')
  @OpenAPI({ summary: 'Update billing record by id' })
  @ResponseSchema(CBillingRecord)
  @UseBefore(authMiddleware, validationMiddleware(CBillingRecord, 'body'))
  async updateBillingRecord(
    @Req() req: RequestWithUser,
    @Param('municipalityId') municipalityId: string,
    @Param('id') id: string,
    @Body() data: CBillingRecord,
    @Res() response: any,
  ): Promise<BillingRecord> {
    const url = `${municipalityId}/billingrecords/${id}`;
    const baseURL = apiURL(this.SERVICE);
    const res = await this.apiService.put<BillingRecord, BillingRecord>({ url, baseURL, data }, req.user);
    return response.status(200).send(res.data);
  }
}
