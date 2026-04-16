import dayjs from 'dayjs';
import { Body, Controller, Delete, Get, Param, Post, Put, QueryParam, Req, Res, UseBefore } from 'routing-controllers';
import { OpenAPI, ResponseSchema } from 'routing-controllers-openapi';

import { apiServiceName } from '@/config/api-config';
import { BillingRecord, Status } from '@/data-contracts/billingpreprocessor/data-contracts';
import { RelationPagedResponse } from '@/data-contracts/relations/data-contracts';
import { RequestWithUser } from '@/interfaces/auth.interface';
import { User } from '@/interfaces/users.interface';
import { CBillingRecord, CPageBillingRecord } from '@/interfaces/billing-interface';
import authMiddleware from '@/middlewares/auth.middleware';
import { hasAnyPermission, hasPermissions } from '@/middlewares/permissions.middleware';
import { validationMiddleware } from '@/middlewares/validation.middleware';
import ApiService from '@/services/api.service';
import { logger } from '@/utils/logger';
import { apiURL, toOffsetDateTime } from '@/utils/util';

@Controller()
@UseBefore(hasAnyPermission(['canEditSupportManagement', 'canEditCasedata']))
export class BillingController {
  private apiService = new ApiService();
  private SERVICE = apiServiceName('billingpreprocessor');
  private RELATIONS_SERVICE = apiServiceName('relations');
  private readonly BILLING_ID_CHUNK_SIZE = 50;

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
    // TODO Will query filter be used? Still not decided.
    // if (query) {
    //   let guidRes = null;
    //   const isPersonNumber = luhnCheck(query);
    //   if (isPersonNumber) {
    //     const guidUrl = `${this.CITIZEN_SERVICE}/${query}/guid`;
    //     guidRes = await this.apiService.get<string>({ url: guidUrl }, req.user).catch(e => null);
    //   }
    //   let queryFilter = `(`;
    //   queryFilter += `description~'*${query}*'`;
    //   queryFilter += ')';
    //   filterList.push(queryFilter);
    // }
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
    let url = `${this.SERVICE}/${municipalityId}/billingrecords?page=${page || 0}&size=${size || 8}`;
    url += filter;
    if (sort) {
      url += `&sort=${sort}`;
    }
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
    if (data.status !== Status.NEW) {
      return response.status(403).send('Error: user is not allowed to change status of billing record');
    }
    const url = `${municipalityId}/billingrecords/${id}`;
    const baseURL = apiURL(this.SERVICE);
    const res = await this.apiService.put<BillingRecord, BillingRecord>({ url, baseURL, data }, req.user);
    return response.status(200).send(res.data);
  }

  @Delete('/billing/:municipalityId/billingrecords/:id')
  @OpenAPI({ summary: 'Delete billing record by id' })
  @UseBefore(authMiddleware)
  async deleteBillingRecord(
    @Req() req: RequestWithUser,
    @Param('municipalityId') municipalityId: string,
    @Param('id') id: string,
    @Res() response: any,
  ): Promise<void> {
    const url = `${this.SERVICE}/${municipalityId}/billingrecords/${id}`;
    await this.apiService.delete({ url }, req.user);
    return response.status(204).send();
  }

  @Put('/billing/:municipalityId/billingrecords/:id/status')
  @OpenAPI({ summary: 'Set billing record status' })
  @ResponseSchema(CBillingRecord)
  @UseBefore(authMiddleware, validationMiddleware(CBillingRecord, 'body'), hasAnyPermission(['canEditAttestations', 'canEditCasedata']))
  async setBillingRecordStatus(
    @Req() req: RequestWithUser,
    @Param('municipalityId') municipalityId: string,
    @Param('id') id: string,
    @Body() data: CBillingRecord,
    @Res() response: any,
  ): Promise<BillingRecord> {
    data.approvedBy = `${req.user.firstName} ${req.user.lastName}`;
    const url = `${municipalityId}/billingrecords/${id}`;
    const baseURL = apiURL(this.SERVICE);
    const res = await this.apiService.put<BillingRecord, BillingRecord>({ url, baseURL, data }, req.user);
    return response.status(200).send(res.data);
  }

  @Get('/billing/:municipalityId/contracts/:contractId/invoices')
  @OpenAPI({ summary: 'Get billing records for a specific contract' })
  @ResponseSchema(CPageBillingRecord)
  @UseBefore(authMiddleware, hasPermissions(['canEditCasedata']))
  async getContractInvoices(
    @Req() req: RequestWithUser,
    @QueryParam('page') page: number,
    @QueryParam('size') size: number,
    @Param('municipalityId') municipalityId: string,
    @Param('contractId') contractId: string,
    @Res() response: any,
  ): Promise<CPageBillingRecord> {
    if (!municipalityId) {
      console.error('No municipality id found, needed to fetch contract invoices.');
      logger.error('No municipality id found, needed to fetch contract invoices.');
      return response.status(400).send('Municipality id missing');
    }
    if (!contractId) {
      console.error('No contract id found, needed to fetch contract invoices.');
      logger.error('No contract id found, needed to fetch contract invoices.');
      return response.status(400).send('Contract id missing');
    }

    const billingRecordIds = await this.getAllRelatedBillingRecordIds(municipalityId, contractId, req.user);
    const uniqueIds = [...new Set(billingRecordIds)];

    const s = size || 10;
    const p = page || 0;

    if (uniqueIds.length === 0) {
      return response.status(200).send({
        content: [],
        totalElements: 0,
        totalPages: 0,
        size: s,
        number: p,
        numberOfElements: 0,
        first: true,
        last: true,
        empty: true,
      });
    }

    const chunks: string[][] = [];
    for (let i = 0; i < uniqueIds.length; i += this.BILLING_ID_CHUNK_SIZE) {
      chunks.push(uniqueIds.slice(i, i + this.BILLING_ID_CHUNK_SIZE));
    }

    const results = await Promise.all(chunks.map(chunk => this.fetchBillingRecordsByIds(municipalityId, chunk, req.user)));
    const allRecords = results.flat();

    const slice = allRecords.slice(p * s, (p + 1) * s);
    return response.status(200).send({
      content: slice,
      totalElements: allRecords.length,
      totalPages: Math.ceil(allRecords.length / s),
      size: s,
      number: p,
      numberOfElements: slice.length,
      first: p === 0,
      last: (p + 1) * s >= allRecords.length,
      empty: slice.length === 0,
    });
  }

  private async fetchBillingRecordsByIds(municipalityId: string, ids: string[], user: User): Promise<BillingRecord[]> {
    const idList = ids.map(id => `'${id}'`).join(', ');
    const filter = `&filter=${encodeURIComponent(`id in [${idList}]`)}`;
    const url = `${this.SERVICE}/${municipalityId}/billingrecords?page=0&size=${ids.length}${filter}`;
    const res = await this.apiService.get<CPageBillingRecord>({ url }, user);
    return res.data.content || [];
  }

  private async getAllRelatedBillingRecordIds(municipalityId: string, contractId: string, user: User): Promise<string[]> {
    const allIds: string[] = [];
    let currentPage = 1;
    let totalPages = 1;

    while (currentPage <= totalPages) {
      const url = `${municipalityId}/relations?filter=source.resourceId%3A%27${contractId}%27&page=${currentPage}&limit=100`;
      const baseURL = apiURL(this.RELATIONS_SERVICE);
      const res = await this.apiService.get<RelationPagedResponse>({ url, baseURL }, user);
      const relations = res.data.relations || [];

      relations
        .filter(r => r.target?.type === 'billing-record' && r.target?.service === 'billingpreprocessor')
        .forEach(r => allIds.push(r.target.resourceId));

      totalPages = res.data._meta?.totalPages ?? 1;
      currentPage++;
    }

    return allIds;
  }
}
