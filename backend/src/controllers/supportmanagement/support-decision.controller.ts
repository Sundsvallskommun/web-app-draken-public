import { IsArray, IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { Body, Controller, Get, HttpCode, Param, Post, Req, Res, UseBefore } from 'routing-controllers';
import { OpenAPI } from 'routing-controllers-openapi';

import { MUNICIPALITY_ID, SUPPORTMANAGEMENT_NAMESPACE } from '@/config';
import { apiServiceName } from '@/config/api-config';
import { Decision, DecisionTerm } from '@/data-contracts/supportmanagement/data-contracts';
import { HttpException } from '@/exceptions/HttpException';
import { RequestWithUser } from '@/interfaces/auth.interface';
import authMiddleware from '@/middlewares/auth.middleware';
import { hasPermissions } from '@/middlewares/permissions.middleware';
import { validationMiddleware } from '@/middlewares/validation.middleware';
import ApiService from '@/services/api.service';
import { logger } from '@/utils/logger';
import { apiURL } from '@/utils/util';

const MANUAL_METHOD = 'MANUAL';
const DRAFT_STATUS = 'DRAFT';
const COMPLETED_STATUS = 'COMPLETED';

export class CreateSupportDecisionDto {
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  outcome!: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  decidedByRole?: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  legalBasis?: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  delegationReference?: string;

  @IsOptional()
  @IsString()
  @MaxLength(8192)
  justification?: string;

  @IsOptional()
  @IsBoolean()
  appealable?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  terms?: string[];
}

@Controller()
export class SupportDecisionController {
  private readonly apiService = new ApiService();
  private readonly namespace = SUPPORTMANAGEMENT_NAMESPACE;
  private readonly SERVICE = apiServiceName('supportmanagement');

  private readonly decisionsUrl = (municipalityId: string, errandId: string): string =>
    `${municipalityId}/${this.namespace}/errands/${errandId}/decisions`;

  private async readDecisions(municipalityId: string, errandId: string, user: RequestWithUser['user']): Promise<Decision[]> {
    const res = await this.apiService.get<Decision[]>(
      { url: this.decisionsUrl(municipalityId, errandId), baseURL: apiURL(this.SERVICE), propagateClientError: true },
      user,
    );
    return res.data ?? [];
  }

  /** The decision just written: the newest of the errand's decisions, since the service answers a create with a location only. */
  private readonly newestDecision = (decisions: Decision[]): Decision | undefined =>
    [...decisions].sort((a, b) => (b.created ?? '').localeCompare(a.created ?? ''))[0];

  private async readDecision(municipalityId: string, errandId: string, decisionId: string, user: RequestWithUser['user']): Promise<Decision> {
    const res = await this.apiService.get<Decision>(
      {
        url: `${this.decisionsUrl(municipalityId, errandId)}/${decisionId}`,
        baseURL: apiURL(this.SERVICE),
        propagateClientError: true,
      },
      user,
    );
    return res.data;
  }

  /**
   * Removes a draft that could not be finished, so that a failed write leaves no half written decision
   * on the errand. A draft that cannot be removed is logged rather than raised: the caller is already
   * being told that the decision failed, and that is the error worth answering.
   */
  private async discardDecision(municipalityId: string, errandId: string, decisionId: string, user: RequestWithUser['user']): Promise<void> {
    try {
      await this.apiService.delete<void>(
        {
          url: `${this.decisionsUrl(municipalityId, errandId)}/${decisionId}`,
          baseURL: apiURL(this.SERVICE),
          propagateClientError: true,
        },
        user,
      );
    } catch (error) {
      logger.error(`Could not remove the draft decision ${decisionId} after a failed write`);
      logger.error(error);
    }
  }

  private async writeTerms(
    municipalityId: string,
    errandId: string,
    decisionId: string,
    terms: string[],
    user: RequestWithUser['user'],
  ): Promise<void> {
    const baseURL = apiURL(this.SERVICE);
    for (const [index, text] of terms.entries()) {
      await this.apiService.post<DecisionTerm, DecisionTerm>(
        {
          url: `${this.decisionsUrl(municipalityId, errandId)}/${decisionId}/terms`,
          baseURL,
          data: { sortOrder: index + 1, text },
          propagateClientError: true,
        },
        user,
      );
    }
  }

  @Get('/supportdecisions/:municipalityId/:id')
  @OpenAPI({ summary: 'Get the decisions of a support errand' })
  @UseBefore(authMiddleware)
  async fetchDecisions(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Param('municipalityId') municipalityId: string,
    @Res() response: any,
  ): Promise<any> {
    if (municipalityId !== MUNICIPALITY_ID) {
      return response.status(400).send('Invalid municipality id');
    }
    const decisions = await this.readDecisions(municipalityId, id, req.user);
    return response.status(200).send(decisions);
  }

  @Post('/supportdecisions/:municipalityId/:id')
  @HttpCode(201)
  @OpenAPI({ summary: 'Record a manual decision on a support errand' })
  @UseBefore(authMiddleware, hasPermissions(['canEditSupportManagement']), validationMiddleware(CreateSupportDecisionDto, 'body'))
  async createDecision(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Param('municipalityId') municipalityId: string,
    @Body() data: CreateSupportDecisionDto,
    @Res() response: any,
  ): Promise<any> {
    if (municipalityId !== MUNICIPALITY_ID) {
      return response.status(400).send('Invalid municipality id');
    }

    const { terms, ...decision } = data;
    // The decision is written as a draft, its terms are written while it is one, and it is concluded
    // last: on an errand with a process a completed decision is locked, and its terms with it.
    await this.apiService.post<Decision, Decision>(
      {
        url: this.decisionsUrl(municipalityId, id),
        baseURL: apiURL(this.SERVICE),
        // The handler makes the decision, so it is manual and decided by them, here and now. A
        // decision the process made carries the consumer's identity instead, and is never written here.
        data: {
          ...decision,
          status: DRAFT_STATUS,
          method: MANUAL_METHOD,
          decidedBy: req.user.username,
          decidedAt: new Date().toISOString(),
        },
        propagateClientError: true,
      },
      req.user,
    );

    const written = this.newestDecision(await this.readDecisions(municipalityId, id, req.user));
    if (!written?.id) {
      throw new HttpException(502, 'Support Management did not return the decision that was written');
    }

    try {
      if (terms?.length) {
        await this.writeTerms(municipalityId, id, written.id, terms, req.user);
      }

      const beforeCompleting = await this.readDecision(municipalityId, id, written.id, req.user);
      await this.apiService.patch<Decision, { status: string }>(
        {
          url: `${this.decisionsUrl(municipalityId, id)}/${written.id}`,
          baseURL: apiURL(this.SERVICE),
          data: { status: COMPLETED_STATUS },
          headers: { 'If-Match': `"${beforeCompleting.version}"` },
          propagateClientError: true,
        },
        req.user,
      );
    } catch (error) {
      await this.discardDecision(municipalityId, id, written.id, req.user);
      throw error;
    }

    return response.status(201).send(await this.readDecision(municipalityId, id, written.id, req.user));
  }
}
