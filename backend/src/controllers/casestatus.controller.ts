import { RequestWithUser } from '@/interfaces/auth.interface';
import authMiddleware from '@/middlewares/auth.middleware';
import ApiService from '@/services/api.service';
import { logger } from '@/utils/logger';
import { apiURL } from '@/utils/util';
import { Controller, Get, Param, Req, UseBefore } from 'routing-controllers';
import { OpenAPI } from 'routing-controllers-openapi';

@Controller()
export class CaseStatusController {
  private apiService = new ApiService();

  private SERVICE = `casestatus/4.0`;

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
}
