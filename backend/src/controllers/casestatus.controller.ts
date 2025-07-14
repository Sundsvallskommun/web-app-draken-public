import { Errand } from '@/data-contracts/case-data/data-contracts';
import { RequestWithUser } from '@/interfaces/auth.interface';
import authMiddleware from '@/middlewares/auth.middleware';
import ApiService from '@/services/api.service';
import { logger } from '@/utils/logger';
import { apiURL } from '@/utils/util';
import { Controller, Get, Param, Req, Res, UseBefore } from 'routing-controllers';
import { OpenAPI } from 'routing-controllers-openapi';

@Controller()
export class CaseStatusController {
  private apiService = new ApiService();

  private SERVICE = `casestatus/4.1`;

  @Get('/:municipalityId/party/:partyId/statuses')
  @OpenAPI({ summary: 'Get all statuses connected to a partyId' })
  @UseBefore(authMiddleware)
  async getStatusesUsingPartyId(
    @Req() req: RequestWithUser,
    @Param('municipalityId') municipalityId: string,
    @Param('partyId') partyId: string,
  ): Promise<{ data: any; message: string }> {
    const url = `${municipalityId}/party/${partyId}/statuses`;
    const baseURL = apiURL(this.SERVICE);
    const res = await this.apiService.get<any>({ url, baseURL }, req.user).catch(e => {
      logger.error('Error when fetching relations: ', e);
      throw e;
    });
    return { data: res.data, message: 'success' };
  }

  @Get('/:municipalityId/errands/statuses/:query')
  @OpenAPI({ summary: 'Get errand statuses by errandNumber and propertyDesignation' })
  @UseBefore(authMiddleware)
  async getErrandStatus(
    @Req() req: RequestWithUser,
    @Param('municipalityId') municipalityId: string,
    @Param('query') query: string,
  ): Promise<{ data: any; message: string }> {
    const urlErrandNumber = `${municipalityId}/errands/statuses?errandNumber=${query}`;
    const urlPropertyDesignation = `${municipalityId}/errands/statuses?propertyDesignation=${query}`;
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

  @Get('/:municipalityId/errandbyid/:id')
  @OpenAPI({ summary: 'Return an errandnumber by id' })
  @UseBefore(authMiddleware)
  async errand(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Param('municipalityId') municipalityId: string,
    @Res() response: any,
  ): Promise<{ data: Errand; message: string }> {
    const url = `${municipalityId}/${process.env.CASEDATA_NAMESPACE}/errands/${id}`;
    const baseURL = apiURL('case-data/11.5');
    const errandResponse = await this.apiService.get<Errand>({ url, baseURL }, req.user);
    const errandData = errandResponse.data;
    return response.send(errandData.errandNumber);
  }
}
