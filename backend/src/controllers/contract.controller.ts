import { MUNICIPALITY_ID } from '@/config';
import { apiServiceName } from '@/config/api-config';
import { Contract, ContractPaginatedResponse } from '@/data-contracts/contract/data-contracts';
import { HttpException } from '@/exceptions/HttpException';
import { validateContractAction } from '@/services/contract-service';
import { logger } from '@/utils/logger';
import { apiURL } from '@/utils/util';
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
  ): Promise<ContractPaginatedResponse> {
    // Build base URL with pagination (page is 1-based)
    let url = `${MUNICIPALITY_ID}/contracts?page=${page || 1}&limit=${limit || 12}`;

    // NOTE: The contract API does not yet support sorting, filtering, and search.
    // The parameters are accepted here to prepare for future API support.
    // When the API supports these features, uncomment the code below.

    // Use query for property designation search (both name and district)
    if (query) {
      const encodedQuery = encodeURIComponent(query);
      url += `&propertyDesignationNames=${encodedQuery}`;
    }

    // Build filter params (prepared for future API support)
    // if (status) {
    //   url += `&status=${status}`;
    // }
    // if (contractType) {
    //   url += `&type=${contractType}`;
    // }
    if (leaseType) {
      url += `&leaseType=${leaseType}`;
    }
    // if (startDate) {
    //   url += `&startDate=${startDate}`;
    // }
    // if (endDate) {
    //   url += `&endDate=${endDate}`;
    // }

    // Build sort param (prepared for future API support)
    // if (sortBy) {
    //   const order = sortOrder || 'desc';
    //   url += `&sort=${sortBy},${order}`;
    // }

    logger.info(
      `Fetching contracts with params: page=${page}, limit=${limit}, sortBy=${sortBy}, sortOrder=${sortOrder}, query=${query}, status=${status}, contractType=${contractType}, leaseType=${leaseType}`,
    );

    const baseURL = apiURL(this.SERVICE);
    const res = await this.apiService.get<ContractPaginatedResponse>({ url, baseURL }, req.user);
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
    console.log('Saving contract attachment with data:', { metadata: data.metaData });
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
