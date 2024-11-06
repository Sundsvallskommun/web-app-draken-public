import authMiddleware from '@/middlewares/auth.middleware';
import ApiService from '@/services/api.service';
import { Body, Controller, Get, Param, Patch, Req, Res, UseBefore } from 'routing-controllers';
import { OpenAPI } from 'routing-controllers-openapi';
import { RequestWithUser } from '@interfaces/auth.interface';
import { apiURL } from '@/utils/util';
import { PatchAppeal as PatchAppealDTO } from '@/data-contracts/case-data/data-contracts';
import { validateAction } from '@/services/errand.service';
import { HttpException } from '@/exceptions/HttpException';
import { Appeal } from '@/interfaces/decision.interface';

export interface ResponseData {
  data: any;
  message: string;
}

@Controller()
export class CaseDataAppealController {
  SERVICE = `case-data/9.0`;
  private apiService = new ApiService();

  @Patch('/casedata/:municipalityId/errands/:errandId/appeals')
  @OpenAPI({ summary: 'Register an appeal' })
  @UseBefore(authMiddleware)
  async registerAppeal(
    @Req() req: RequestWithUser,
    @Param('municipalityId') municipalityId: string,
    @Param('errandId') errandId: number,
    @Body() appealData: PatchAppealDTO,
  ): Promise<ResponseData> {
    if (!errandId) {
      throw 'Id not found. Cannot register note without errand id.';
    }

    const allowed = await validateAction(municipalityId, errandId.toString(), req.user);
    if (!allowed) {
      throw new HttpException(403, 'Forbidden');
    }
    const url = `${municipalityId}/${process.env.CASEDATA_NAMESPACE}/errands/${errandId}/appeals`;
    const baseURL = apiURL(this.SERVICE);
    const res = await this.apiService.patch<any, PatchAppealDTO>({ url, baseURL, data: appealData }, req.user);
    return { data: 'ok', message: 'success' } as ResponseData;
  }

  @Patch('/casedata/:municipalityId/:errandId/appeals/:appealId')
  @OpenAPI({ summary: 'Update an appeal' })
  @UseBefore(authMiddleware)
  async updateAppeal(
    @Req() req: RequestWithUser,
    @Param('municipalityId') municipalityId: string,
    @Param('errandId') errandId: number,
    @Param('appealId') appealId: number,
    @Body() appealData: PatchAppealDTO,
  ): Promise<ResponseData> {
    if (!appealId) {
      throw 'Id not found. Cannot edit appeal without id.';
    }

    const allowed = await validateAction(municipalityId, errandId.toString(), req.user);
    if (!allowed) {
      throw new HttpException(403, 'Forbidden');
    }
    const url = `${municipalityId}/${process.env.CASEDATA_NAMESPACE}/errands/${errandId}/appeals/${appealId}`;
    const baseURL = apiURL(this.SERVICE);
    const res = await this.apiService.patch<any, PatchAppealDTO>({ url, baseURL, data: appealData }, req.user);
    return { data: 'ok', message: 'success' } as ResponseData;
  }

  @Get('casedata/:municipalityId/:errandId/appeals/:appealId')
  @OpenAPI({ summary: 'Return an appeal by id' })
  @UseBefore(authMiddleware)
  async appeal(
    @Req() req: RequestWithUser,
    @Param('errandId') errandId: number,
    @Param('appealId') appealId: string,
    @Param('municipalityId') municipalityId: string,
    @Res() response: any,
  ): Promise<ResponseData> {
    const url = `${municipalityId}/${process.env.CASEDATA_NAMESPACE}/errands/${errandId}/appeals/${appealId}`;
    const baseURL = apiURL(this.SERVICE);
    const res = await this.apiService.get<Appeal>({ url, baseURL }, req.user);
    return { data: res.data, message: 'success' } as ResponseData;
  }
}
