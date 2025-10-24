import { MUNICIPALITY_ID } from '@/config';
import { apiServiceName } from '@/config/api-config';
import { CaseStatusResponse } from '@/data-contracts/casestatus/data-contracts';
import { RequestWithUser } from '@/interfaces/auth.interface';
import authMiddleware from '@/middlewares/auth.middleware';
import ApiService from '@/services/api.service';
import { logger } from '@/utils/logger';
import { apiURL } from '@/utils/util';
import { Controller, Get, Param, Req, UseBefore } from 'routing-controllers';
import { OpenAPI } from 'routing-controllers-openapi';

const allowedNamespaces: string[] = ['SBK_MEX', 'SBK_PARKING_PERMIT', 'CONTACTSUNDSVALL'];
const namespaceIsallowed = (c: CaseStatusResponse) => allowedNamespaces.includes(c.namespace);

const allowedSystems: string[] = ['OPEN_E_PLATFORM', 'BYGGR'];
const systemIsAllowed = (c: CaseStatusResponse) => allowedSystems.includes(c.system);

const caseIsallowed = (c: CaseStatusResponse) => namespaceIsallowed(c) || (typeof c.namespace === 'undefined' && systemIsAllowed(c));

@Controller()
export class CaseStatusController {
  private apiService = new ApiService();

  private SERVICE = apiServiceName('casestatus');

  @Get('/party/:partyId/statuses')
  @OpenAPI({ summary: 'Get all statuses connected to a partyId' })
  @UseBefore(authMiddleware)
  async getStatusesUsingPartyId(@Req() req: RequestWithUser, @Param('partyId') partyId: string): Promise<{ data: any; message: string }> {
    const url = `${MUNICIPALITY_ID}/party/${partyId}/statuses`;
    const baseURL = apiURL(this.SERVICE);
    const res = await this.apiService.get<any>({ url, baseURL }, req.user).catch(e => {
      logger.error('Error when fetching relations: ', e);
      throw e;
    });
    return { data: res.data.filter(caseIsallowed), message: 'success' };
  }

  @Get('/:organizationNumber/statuses')
  @OpenAPI({ summary: 'Get all statuses connected to a organizationNumber' })
  @UseBefore(authMiddleware)
  async getStatusesUsingOrganizationNumber(
    @Req() req: RequestWithUser,
    @Param('organizationNumber') organizationNumber: string,
  ): Promise<{ data: any; message: string }> {
    const url = `${MUNICIPALITY_ID}/${organizationNumber}/statuses`;
    const baseURL = apiURL(this.SERVICE);
    const res = await this.apiService.get<any>({ url, baseURL }, req.user).catch(e => {
      logger.error('Error when fetching relations: ', e);
      throw e;
    });
    return { data: res.data.filter(caseIsallowed), message: 'success' };
  }

  @Get('/errands/statuses/:query')
  @OpenAPI({ summary: 'Get errand statuses by errandNumber and propertyDesignation' })
  @UseBefore(authMiddleware)
  async getErrandStatus(@Req() req: RequestWithUser, @Param('query') query: string): Promise<{ data: any; message: string }> {
    const urlErrandNumber = `${MUNICIPALITY_ID}/errands/statuses?errandNumber=${query}`;
    const urlPropertyDesignation = `${MUNICIPALITY_ID}/errands/statuses?propertyDesignation=${query}`;
    const baseURL = apiURL(this.SERVICE);
    const resErrandNumber = await this.apiService.get<any>({ url: urlErrandNumber, baseURL }, req.user).catch(e => {
      logger.error('Error when fetching relations: ', e);
      throw e;
    });
    const resPropertyDesignation = await this.apiService.get<any>({ url: urlPropertyDesignation, baseURL }, req.user).catch(e => {
      logger.error('Error when fetching relations: ', e);
      throw e;
    });
    return { data: [...resErrandNumber.data, ...resPropertyDesignation.data], message: 'success' };
  }
}
