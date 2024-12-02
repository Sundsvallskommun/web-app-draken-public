import { BillingRecord, PageBillingRecord } from '@/data-contracts/billingpreprocessor/data-contracts';
import { RequestWithUser } from '@/interfaces/auth.interface';
import { CBillingRecord, CPageBillingRecord } from '@/interfaces/billing-interface';
import authMiddleware from '@/middlewares/auth.middleware';
import { validationMiddleware } from '@/middlewares/validation.middleware';
import ApiService from '@/services/api.service';
import { Body, Controller, Get, Param, Post, Put, Req, Res, UseBefore } from 'routing-controllers';
import { OpenAPI, ResponseSchema } from 'routing-controllers-openapi';

@Controller()
export class BillingController {
  private apiService = new ApiService();
  private SERVICE = `billingpreprocessor/2.0`;

  @Get('/billing/:municipalityId/billingrecords')
  @OpenAPI({ summary: 'Get all billing records' })
  @ResponseSchema(CPageBillingRecord)
  @UseBefore(authMiddleware)
  async getBillingRecords(
    @Req() req: RequestWithUser,
    @Param('municipalityId') municipalityId: string,
    @Res() response: any,
  ): Promise<CPageBillingRecord> {
    const url = `${this.SERVICE}/${municipalityId}/billingrecords?filter=type:'EXTERNAL'`;
    console.log('URL2:', url);
    const res = await this.apiService.get<CPageBillingRecord>({ url }, req.user);
    return response.status(200).send(res.data);
  }

  @Post('/billing/:municipalityId/billingrecords')
  @OpenAPI({ summary: 'Create billing record' })
  @UseBefore(authMiddleware, validationMiddleware(CBillingRecord, 'data'))
  async createBillingRecord(
    @Req() req: RequestWithUser,
    @Param('municipalityId') municipalityId: string,
    @Body() data: CBillingRecord,
    @Res() response: any,
  ): Promise<any> {
    const url = `${this.SERVICE}/${municipalityId}/billingrecords`;
    const res = await this.apiService.post<any, BillingRecord>({ url, data }, req.user);
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
  @UseBefore(authMiddleware, validationMiddleware(CBillingRecord, 'data'))
  async updateBillingRecord(
    @Req() req: RequestWithUser,
    @Param('municipalityId') municipalityId: string,
    @Param('id') id: string,
    @Body() data: CBillingRecord,
    @Res() response: any,
  ): Promise<BillingRecord> {
    const url = `${this.SERVICE}/${municipalityId}/billingrecords/${id}`;
    const res = await this.apiService.put<BillingRecord, BillingRecord>({ url, data }, req.user);
    return response.status(200).send(res.data);
  }
}
