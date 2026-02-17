import { MUNICIPALITY_ID } from '@/config';
import { apiServiceName } from '@/config/api-config';
import { Contract, PageContract } from '@/data-contracts/contract/data-contracts';
import { HttpException } from '@/exceptions/HttpException';
import { validateContractAction } from '@/services/contract-service';
import { logger } from '@/utils/logger';
import { apiURL, luhnCheck } from '@/utils/util';
import { RequestWithUser } from '@interfaces/auth.interface';
import authMiddleware from '@middlewares/auth.middleware';
import ApiService from '@services/api.service';
import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, QueryParam, Req, Res, UseBefore } from 'routing-controllers';
import { OpenAPI } from 'routing-controllers-openapi';

export interface ResponseData {
  data: any;
  message: string;
}

export interface CasedataContractAttachment {
  attachmentData: {
    content: string;
  };
  metaData: {
    category: string;
    filename: string;
    mimeType: string;
    note: string;
  };
}

@Controller()
export class CasedataContractsController {
  private apiService = new ApiService();
  SERVICE = apiServiceName('contract');
  CITIZEN_SERVICE = apiServiceName('citizen');

  @Get('/contracts/:id')
  @OpenAPI({ summary: 'Fetch a contract' })
  @UseBefore(authMiddleware)
  async fetch_contract(@Req() req: RequestWithUser, @Param('id') id: string, @Res() response: any): Promise<ResponseData> {
    const url = `${MUNICIPALITY_ID}/contracts/${id}`;
    const baseURL = apiURL(this.SERVICE);
    const res = await this.apiService.get<Contract>({ url, baseURL }, req.user);
    return { data: res.data, message: 'success' } as ResponseData;
  }

  @Get('/contracts')
  @OpenAPI({ summary: 'Fetch all contracts with pagination' })
  @UseBefore(authMiddleware)
  async fetch_contracts(
    @Req() req: RequestWithUser,
    @QueryParam('page') page: number,
    @QueryParam('limit') limit: number,
    @QueryParam('sortBy') sortBy: string,
    @QueryParam('sortOrder') sortOrder: string,
    @QueryParam('query') query: string,
    @QueryParam('status') status: string,
    @QueryParam('contractType') contractType: string,
    @QueryParam('leaseType') leaseType: string,
    @QueryParam('startDate') startDate: string,
    @QueryParam('endDate') endDate: string,
    @Res() response: any,
  ): Promise<PageContract> {
    let url = `${MUNICIPALITY_ID}/contracts?page=${page ?? 0}&limit=${limit || 12}`;

    const filterList: string[] = [];

    if (query) {
      let guidRes = null;
      const isPersonNumber = luhnCheck(query);
      if (isPersonNumber) {
        const guidUrl = `${this.CITIZEN_SERVICE}/${MUNICIPALITY_ID}/${query}/guid`;
        guidRes = await this.apiService.get<string>({ url: guidUrl }, req.user).catch(e => null);
      }

      let queryFilter = `(`;
      queryFilter += `contractId~'*${query}*'`;
      queryFilter += ` or exists(propertyDesignations.name~'*${query}*')`;
      queryFilter += ` or exists(stakeholders.organizationName~'*${query}*')`;
      queryFilter += ` or exists(stakeholders.organizationNumber~'*${query}*')`;
      queryFilter += ` or exists(stakeholders.firstName~'*${query}*')`;
      queryFilter += ` or exists(stakeholders.lastName~'*${query}*')`;
      queryFilter += ` or exists(stakeholders.phoneNumber~'*${query}*')`;
      queryFilter += ` or exists(stakeholders.emailAddress~'*${query}*')`;
      queryFilter += ` or exists(stakeholders.address.streetAddress~'*${query}*')`;
      if (guidRes !== null) {
        queryFilter += ` or exists(stakeholders.partyId ~ '*${guidRes.data}*')`;
      }
      queryFilter += ')';
      filterList.push(queryFilter);
    }
    if (status) {
      const ss = status.split(',').map(s => `status:'${s}'`);
      filterList.push(`(${ss.join(' or ')})`);
    }
    if (contractType) {
      const ct = contractType.split(',').map(t => `type:'${t}'`);
      filterList.push(`(${ct.join(' or ')})`);
    }
    if (leaseType) {
      const lt = leaseType.split(',').map(l => `leaseType:'${l}'`);
      filterList.push(`(${lt.join(' or ')})`);
    }
    if (startDate) {
      filterList.push(`startDate>='${startDate}'`);
    }
    if (endDate) {
      filterList.push(`endDate<='${endDate}'`);
    }

    if (filterList.length > 0) {
      url += `&filter=${filterList.join(' and ')}`;
    }

    if (sortBy) {
      const order = sortOrder || 'desc';
      url += `&sort=${sortBy},${order}`;
    }

    logger.info(
      `Fetching contracts with params: page=${page}, limit=${limit}, sortBy=${sortBy}, sortOrder=${sortOrder}, query=${query}, status=${status}, contractType=${contractType}, leaseType=${leaseType}`,
    );

    const baseURL = apiURL(this.SERVICE);
    const res = await this.apiService.get<PageContract>({ url, baseURL }, req.user);
    return response.status(200).send(res.data);
  }

  @Post('/contracts')
  @HttpCode(201)
  @OpenAPI({ summary: 'Save a new contract' })
  @UseBefore(authMiddleware)
  async create_contract(@Req() req: RequestWithUser, @Body() data: Contract): Promise<{ data: Contract; message: string }> {
    const errandIdParameter = data.extraParameters.find(p => p.name === 'errandId')?.parameters['errandId'];
    if (!errandIdParameter) {
      throw new HttpException(400, 'Missing errand id');
    }
    const errandId = errandIdParameter.toString();
    const allowed = await validateContractAction(MUNICIPALITY_ID, errandId, req.user);
    if (!allowed) {
      throw new HttpException(403, 'Forbidden');
    }
    const url = `${MUNICIPALITY_ID}/contracts`;
    const baseURL = apiURL(this.SERVICE);
    const response = await this.apiService.post<Contract, Contract>({ url, baseURL, data }, req.user).catch(e => {
      logger.error('Something went wrong when creating contract');
      logger.error(e);
      throw e;
    });
    return { data: response.data, message: `Contract created` };
  }

  @Put('/contracts/:id')
  @OpenAPI({ summary: 'Update an existing contract' })
  @UseBefore(authMiddleware)
  async update_contract(@Req() req: RequestWithUser, @Param('id') id: string, @Body() data: Contract): Promise<ResponseData> {
    if (!id) {
      throw 'Id not found. Cannot edit contract without id.';
    }
    const errandIdParameter = data.extraParameters.find(p => p.name === 'errandId')?.parameters['errandId'];
    if (!errandIdParameter) {
      throw new HttpException(400, 'Missing errand id');
    }
    const errandId = errandIdParameter.toString();
    const allowed = await validateContractAction(MUNICIPALITY_ID, errandId, req.user);
    if (!allowed) {
      throw new HttpException(403, 'Forbidden');
    }
    const url = `${MUNICIPALITY_ID}/contracts/${id}`;
    const baseURL = apiURL(this.SERVICE);
    await this.apiService.put<any, Contract>({ url, baseURL, data }, req.user).catch(e => {
      throw e;
    });
    const getRes = await this.apiService.get<Contract>({ url, baseURL }, req.user).catch(e => {
      throw e;
    });
    return { data: getRes.data, message: 'success' } as ResponseData;
  }

  @Delete('/contracts/:id')
  @HttpCode(201)
  @OpenAPI({ summary: 'Delete a contract' })
  @UseBefore(authMiddleware)
  async delete_contract(@Req() req: RequestWithUser, @Param('id') id: number): Promise<{ data: boolean; message: string }> {
    const baseURL = apiURL(this.SERVICE);
    if (!id) {
      throw 'Id not found. Cannot delete contract without id.';
    }
    const contractUrl = `${MUNICIPALITY_ID}/contracts/${id}`;
    const existingContract: Contract = (
      await this.apiService.get<Contract>({ url: contractUrl, baseURL }, req.user).catch(e => {
        throw 'Existing contract not found.';
      })
    ).data;
    const errandId = existingContract.externalReferenceId.toString();
    const allowed = await validateContractAction(MUNICIPALITY_ID, errandId, req.user);
    if (!allowed) {
      throw new HttpException(403, 'Forbidden');
    }
    const url = `contract/${id}`;
    const response = await this.apiService.delete<boolean>({ url, baseURL }, req.user).catch(e => {
      throw e;
    });
    return { data: response.data, message: `Contract ${id} removed` };
  }

  @Get('/contracts/:municipalityId/:contractId/attachments/:attachmentId')
  @OpenAPI({ summary: 'Fetch signed contract attachment' })
  @UseBefore(authMiddleware)
  async fetchSignedContractAttachment(
    @Req() req: RequestWithUser,
    @Param('contractId') contractId: string,
    @Param('attachmentId') attachmentId: number,
    @Res() response: any,
  ): Promise<ResponseData> {
    const url = `${MUNICIPALITY_ID}/contracts/${contractId}/attachments/${attachmentId}`;
    const baseURL = apiURL(this.SERVICE);
    const res = await this.apiService.get<CasedataContractAttachment>({ url, baseURL }, req.user);
    return { data: res.data, message: 'success' } as ResponseData;
  }

  @Post('/contracts/:municipalityId/:contractId/attachments')
  @HttpCode(201)
  @OpenAPI({ summary: 'Save a signed contract attachment' })
  @UseBefore(authMiddleware)
  async saveSignedContractAttachment(
    @Req() req: RequestWithUser,
    @Param('contractId') contractId: string,
    @Body() data: CasedataContractAttachment,
  ): Promise<{ data: CasedataContractAttachment; message: string }> {
    const url = `${MUNICIPALITY_ID}/contracts/${contractId}/attachments`;
    const baseURL = apiURL(this.SERVICE);
    const response = await this.apiService.post<CasedataContractAttachment, CasedataContractAttachment>({ url, baseURL, data }, req.user).catch(e => {
      logger.error('Something went wrong when saving signed contract attachment');
      logger.error(e);
      throw e;
    });
    return { data: response.data, message: `Signed contract attachment was saved` };
  }

  @Delete('/contracts/:municipalityId/:contractId/attachments/:attachmentId')
  @HttpCode(201)
  @OpenAPI({ summary: 'Delete a signed contract attachment' })
  @UseBefore(authMiddleware)
  async deleteSignedContractAttachment(
    @Req() req: RequestWithUser,
    @Param('contractId') contractId: string,
    @Param('attachmentId') attachmentId: number,
  ): Promise<{ data: boolean; message: string }> {
    const baseURL = apiURL(this.SERVICE);
    if (!attachmentId && !contractId) {
      throw 'Id not found. Cannot delete signed contract attachment without id.';
    }
    const url = `${MUNICIPALITY_ID}/contracts/${contractId}/attachments/${attachmentId}`;
    const response = await this.apiService.delete<boolean>({ url, baseURL }, req.user).catch(e => {
      throw e;
    });
    return { data: response.data, message: `Signed contract attachment with ${attachmentId} removed` };
  }
}
