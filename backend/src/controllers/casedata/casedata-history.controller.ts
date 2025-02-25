import { apiURL } from '@/utils/util';
import { RequestWithUser } from '@interfaces/auth.interface';
import authMiddleware from '@middlewares/auth.middleware';
import ApiService from '@services/api.service';
import { Controller, Get, Param, Req, UseBefore } from 'routing-controllers';
import { OpenAPI } from 'routing-controllers-openapi';

interface ResponseData {
  data: any;
  message: string;
}

@Controller()
export class CaseDataHistoryController {
  private apiService = new ApiService();
  SERVICE = `case-data/11.0`;

  @Get('/:municipalityId/errands/:errandId/history')
  @OpenAPI({ summary: 'Fetch history for errand' })
  @UseBefore(authMiddleware)
  async cases(
    @Req() req: RequestWithUser,
    @Param('errandId') errandId: number,
    @Param('municipalityId') municipalityId: string,
  ): Promise<ResponseData> {
    if (!errandId) {
      throw 'Errand id not found. Cannot fetch history.';
    }
    const url = `${municipalityId}/${process.env.CASEDATA_NAMESPACE}/errands/${errandId}/history`;
    const baseURL = apiURL(this.SERVICE);
    const res = await this.apiService.get<string>({ url, baseURL }, req.user);
    return { data: res.data, message: 'success' } as ResponseData;
  }
}
