import { RequestWithUser } from '@interfaces/auth.interface';
import { Decision } from '@interfaces/decision.interface';
import { validationMiddleware } from '@middlewares/validation.middleware';
import ApiService from '@services/api.service';
import { logger } from '@utils/logger';
import authMiddleware from '@middlewares/auth.middleware';
import { Body, Controller, Get, HttpCode, Param, Patch, Put, Req, Res, UseBefore } from 'routing-controllers';
import { OpenAPI } from 'routing-controllers-openapi';
import { HttpException } from '@/exceptions/HttpException';
import { User } from '@/interfaces/users.interface';
import { ResponseData } from './casedata-notes.controller';
import { validateAction } from '@/services/errand.service';
import { apiURL } from '@/utils/util';

@Controller()
export class CaseDataDecisionsController {
  private apiService = new ApiService();
  SERVICE = `case-data/9.0`;

  async isUnsigning(municipalityId: string, decision: Decision, user: User) {
    const url = `${municipalityId}/decisions/${decision.id}`;
    const baseURL = apiURL(this.SERVICE);
    const previousDecision = await this.apiService.get<Decision>({ url, baseURL }, user);
    return previousDecision.data.extraParameters?.['signed'] === 'true' && decision.extraParameters?.['signed'] === 'false';
  }

  @Patch('/:municipalityId/errands/:id/decisions')
  @HttpCode(201)
  @OpenAPI({ summary: 'Add a decision to an errand by id' })
  @UseBefore(authMiddleware, validationMiddleware(Decision, 'body'))
  async newDecision(
    @Req() req: RequestWithUser,
    @Param('id') errandId: number,
    @Param('municipalityId') municipalityId: string,
    @Body() decisionData: Decision,
  ): Promise<{ data: string; message: string }> {
    const allowed = await validateAction(municipalityId, errandId.toString(), req.user);
    if (!allowed) {
      throw new HttpException(403, 'Forbidden');
    }
    const url = `${municipalityId}/${process.env.CASEDATA_NAMESPACE}/errands/${errandId}/decisions`;
    const baseURL = apiURL(this.SERVICE);
    const response = await this.apiService.patch<any, Decision>({ url, baseURL, data: decisionData }, req.user).catch(e => {
      logger.error(`Error when patching decision: ${e}`);
      throw e;
    });
    return { data: 'true', message: `Decision created on errand ${errandId}` };
  }

  @Put('/:municipalityId/errands/:id/decisions/:decisionId')
  @HttpCode(201)
  @OpenAPI({ summary: 'Update a decision by id' })
  @UseBefore(authMiddleware, validationMiddleware(Decision, 'body'))
  async replaceDecision(
    @Req() req: RequestWithUser,
    @Param('id') errandId: number,
    @Param('municipalityId') municipalityId: string,
    @Param('decisionId') decisionId: number,
    @Body() decisionData: Decision,
  ): Promise<{ data: string; message: string }> {
    const allowed = await validateAction(municipalityId, errandId.toString(), req.user);
    if (!allowed) {
      throw new HttpException(403, 'Forbidden');
    }
    const url = `${municipalityId}/decisions/${decisionId}`;
    const baseURL = apiURL(this.SERVICE);
    if (await this.isUnsigning(municipalityId, decisionData, req.user)) {
      throw new HttpException(400, 'Cannot unsign a signed decision');
    }
    const response = await this.apiService.put<any, Decision>({ url, baseURL, data: decisionData }, req.user).catch(e => {
      logger.error(`Error when putting decision: ${e}`);
      throw e;
    });
    return { data: 'true', message: `Decision ${decisionId} replaced on errand ${errandId}` };
  }

  @Get('/:municipalityId/decisions/:id')
  @OpenAPI({ summary: 'Return a decision by id' })
  @UseBefore(authMiddleware)
  async permits(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Param('municipalityId') municipalityId: string,
    @Res() response: any,
  ): Promise<ResponseData> {
    const url = `${municipalityId}/decisions/${id}`;
    const baseURL = apiURL(this.SERVICE);
    const res = await this.apiService.get<Decision>({ url, baseURL }, req.user);
    return { data: res.data, message: 'success' } as ResponseData;
  }
}
