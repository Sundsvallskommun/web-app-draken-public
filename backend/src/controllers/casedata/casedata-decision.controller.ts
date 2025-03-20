import { Decision, DecisionDecisionOutcomeEnum, DecisionDecisionTypeEnum, Law } from '@/data-contracts/case-data/data-contracts';
import { HttpException } from '@/exceptions/HttpException';
import { DecisionDTO } from '@/interfaces/decision.interface';
import { User } from '@/interfaces/users.interface';
import { validateAction } from '@/services/errand.service';
import { apiURL } from '@/utils/util';
import { RequestWithUser } from '@interfaces/auth.interface';
import authMiddleware from '@middlewares/auth.middleware';
import { validationMiddleware } from '@middlewares/validation.middleware';
import ApiService from '@services/api.service';
import { logger } from '@utils/logger';
import { Body, Controller, Get, HttpCode, Param, Patch, Put, Req, Res, UseBefore } from 'routing-controllers';
import { OpenAPI } from 'routing-controllers-openapi';
import { ResponseData } from './casedata-notes.controller';

@Controller()
export class CaseDataDecisionsController {
  private apiService = new ApiService();
  SERVICE = `case-data/11.0`;

  async isUnsigning(municipalityId: string, errandid: string, decision: Decision, user: User) {
    const url = `${municipalityId}/${process.env.CASEDATA_NAMESPACE}/errands/${errandid}/decisions/${decision.id}`;
    const baseURL = apiURL(this.SERVICE);
    const previousDecision = await this.apiService.get<Decision>({ url, baseURL }, user);
    return previousDecision.data.extraParameters?.['signed'] === 'true' && decision.extraParameters?.['signed'] === 'false';
  }

  @Patch('/:municipalityId/errands/:id/decisions')
  @HttpCode(201)
  @OpenAPI({ summary: 'Add a decision to an errand by id' })
  @UseBefore(authMiddleware, validationMiddleware(DecisionDTO, 'body'))
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
    const patchData: Decision = {
      attachments: decisionData.attachments,
      decisionType: decisionData.decisionType as unknown as DecisionDecisionTypeEnum,
      decisionOutcome: decisionData.decisionOutcome as unknown as DecisionDecisionOutcomeEnum,
      description: decisionData.description,
      decidedBy: decisionData.decidedBy,
      law: decisionData.law,
      ...(decisionData.decidedAt && { decidedAt: decisionData.decidedAt }),
      ...(decisionData.validFrom && { validFrom: decisionData.validFrom }),
      ...(decisionData.validTo && { validTo: decisionData.validTo }),
      ...(decisionData.validTo && { validTo: decisionData.validTo }),
      extraParameters: decisionData.extraParameters || {},
    };
    const url = `${municipalityId}/${process.env.CASEDATA_NAMESPACE}/errands/${errandId}/decisions`;
    const baseURL = apiURL(this.SERVICE);
    const response = await this.apiService.patch<any, Decision>({ url, baseURL, data: patchData }, req.user).catch(e => {
      logger.error(`Error when patching decision: ${e}`);
      throw e;
    });
    return { data: 'true', message: `Decision created on errand ${errandId}` };
  }

  @Put('/:municipalityId/errands/:id/decisions/:decisionId')
  @HttpCode(201)
  @OpenAPI({ summary: 'Update a decision by id' })
  @UseBefore(authMiddleware, validationMiddleware(DecisionDTO, 'body'))
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
    const url = `${municipalityId}/${process.env.CASEDATA_NAMESPACE}/errands/${errandId}/decisions/${decisionId}`;
    const baseURL = apiURL(this.SERVICE);
    if (await this.isUnsigning(municipalityId, errandId.toString(), decisionData, req.user)) {
      throw new HttpException(400, 'Cannot unsign a signed decision');
    }
    const response = await this.apiService.put<any, Decision>({ url, baseURL, data: decisionData }, req.user).catch(e => {
      logger.error(`Error when putting decision: ${e}`);
      throw e;
    });
    return { data: 'true', message: `Decision ${decisionId} replaced on errand ${errandId}` };
  }

  @Get('/:municipalityId/errands/:id/decisions/:decisionId')
  @OpenAPI({ summary: 'Return a decision by id' })
  @UseBefore(authMiddleware)
  async permits(
    @Req() req: RequestWithUser,
    @Param('id') errandId: number,
    @Param('decisionId') decisionId: string,
    @Param('municipalityId') municipalityId: string,
    @Res() response: any,
  ): Promise<ResponseData> {
    const url = `${municipalityId}/${process.env.CASEDATA_NAMESPACE}/errands/${errandId}/decisions/${decisionId}`;
    const baseURL = apiURL(this.SERVICE);
    const res = await this.apiService.get<Decision>({ url, baseURL }, req.user);
    return { data: res.data, message: 'success' } as ResponseData;
  }
}
