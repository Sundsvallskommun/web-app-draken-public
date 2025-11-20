import { apiServiceName } from '@/config/api-config';
import { ExtraParameter } from '@/data-contracts/case-data/data-contracts';
import { HttpException } from '@/exceptions/HttpException';
import { apiURL } from '@/utils/util';
import { RequestWithUser } from '@interfaces/auth.interface';
import authMiddleware from '@middlewares/auth.middleware';
import { hasPermissions } from '@middlewares/permissions.middleware';
import ApiService from '@services/api.service';
import { Body, Controller, HttpCode, Param, Patch, Req, UseBefore } from 'routing-controllers';
import { OpenAPI } from 'routing-controllers-openapi';

export const PROCESS_PARAMETER_KEYS = ['process.displayPhase', 'process.phaseAction', 'process.phaseStatus'];

@Controller()
@UseBefore(hasPermissions(['canEditCasedata']))
export class ExtraParameterController {
  private apiService = new ApiService();
  SERVICE = apiServiceName('case-data');

  @Patch('/casedata/:municipalityId/errands/:id/extraparameters')
  @HttpCode(201)
  @OpenAPI({ summary: 'Modify an existing errand' })
  @UseBefore(authMiddleware, hasPermissions(['canEditCasedata']))
  async patchExtraparameters(
    @Req() req: RequestWithUser,
    @Param('id') errandId: number,
    @Param('municipalityId') municipalityId: string,
    @Body() data: ExtraParameter[],
  ): Promise<{ data: ExtraParameter[]; message: string }> {
    if (!errandId) {
      throw 'Id not found. Cannot patch errand extraParameters without id.';
    }

    if (data.some(p => PROCESS_PARAMETER_KEYS.includes(p.key))) {
      throw new HttpException(400, 'Patching process parameters is not allowed via this endpoint.');
    }

    const url = `${municipalityId}/${process.env.CASEDATA_NAMESPACE}/errands/${errandId}/extraparameters`;
    const baseURL = apiURL(this.SERVICE);
    return this.apiService.patch<ExtraParameter[], ExtraParameter[]>({ url, baseURL, data }, req.user);
  }

  @Patch('/casedata/:municipalityId/errands/:id/extraparameters/process')
  @HttpCode(201)
  @OpenAPI({ summary: 'Modify an existing errand' })
  @UseBefore(authMiddleware, hasPermissions(['canEditCasedata']))
  async patchProcessParameters(
    @Req() req: RequestWithUser,
    @Param('id') errandId: number,
    @Param('municipalityId') municipalityId: string,
    @Body() data: ExtraParameter[],
  ): Promise<{ data: ExtraParameter[]; message: string }> {
    if (!errandId) {
      throw 'Id not found. Cannot patch errand extraParameters without id.';
    }

    if (data.some(p => !PROCESS_PARAMETER_KEYS.includes(p.key))) {
      throw new HttpException(400, 'Patching non-process parameters is not allowed via this endpoint.');
    }

    const url = `${municipalityId}/${process.env.CASEDATA_NAMESPACE}/errands/${errandId}/extraparameters`;
    const baseURL = apiURL(this.SERVICE);
    return this.apiService.patch<ExtraParameter[], ExtraParameter[]>({ url, baseURL, data }, req.user);
  }
}
