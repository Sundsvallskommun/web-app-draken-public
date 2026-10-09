import { IsString, MaxLength, MinLength } from 'class-validator';
import { Response } from 'express';
import { Body, Controller, Get, HttpCode, Param, Post, QueryParam, Req, Res, UseBefore } from 'routing-controllers';
import { OpenAPI } from 'routing-controllers-openapi';

import { MUNICIPALITY_ID, SUPPORTMANAGEMENT_NAMESPACE } from '@/config';
import { apiServiceName } from '@/config/api-config';
import { ErrandProcessOverview, PageProcessActivity, ProcessSignalRequest } from '@/data-contracts/supportmanagement/data-contracts';
import { HttpException } from '@/exceptions/HttpException';
import { RequestWithUser } from '@/interfaces/auth.interface';
import authMiddleware from '@/middlewares/auth.middleware';
import { hasPermissions } from '@/middlewares/permissions.middleware';
import { validationMiddleware } from '@/middlewares/validation.middleware';
import ApiService from '@/services/api.service';

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 200;

export class SendProcessSignalDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  signal!: string;
}

const resolvePageSize = (size?: number): number => {
  if (!size || size < 1) return DEFAULT_PAGE_SIZE;
  return Math.min(size, MAX_PAGE_SIZE);
};

@Controller()
export class SupportProcessController {
  private readonly apiService = new ApiService();
  private readonly namespace = SUPPORTMANAGEMENT_NAMESPACE;
  private readonly SERVICE = apiServiceName('supportmanagement');

  private processesUrl(municipalityId: string, errandId: string): string {
    return `${this.SERVICE}/${municipalityId}/${this.namespace}/errands/${errandId}/processes`;
  }

  @Get('/supportprocess/:municipalityId/:id')
  @OpenAPI({ summary: 'Get the processes of an errand, and whether one may be started' })
  @UseBefore(authMiddleware)
  async fetchProcessState(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Param('municipalityId') municipalityId: string,
    @Res() response: Response<ErrandProcessOverview | string, any>,
  ): Promise<Response<ErrandProcessOverview | string, any>> {
    if (municipalityId !== MUNICIPALITY_ID) {
      return response.status(400).send('Invalid municipality id');
    }

    const res = await this.apiService.get<ErrandProcessOverview>(
      { url: this.processesUrl(municipalityId, id), propagateClientError: true },
      req.user,
    );
    return response.status(200).send(res.data ?? {});
  }

  @Get('/supportprocess/:municipalityId/:id/activities')
  @OpenAPI({ summary: 'Get the process activity log for an errand' })
  @UseBefore(authMiddleware)
  async fetchProcessActivities(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Param('municipalityId') municipalityId: string,
    @QueryParam('size') size: number,
    @Res() response: Response<PageProcessActivity, any>,
  ): Promise<Response<PageProcessActivity, any>> {
    const query = `page=0&size=${resolvePageSize(size)}&sort=occurredAt%2CDESC`;
    const url = `${this.SERVICE}/${municipalityId}/${this.namespace}/errands/${id}/process-activities?${query}`;
    const res = await this.apiService.get<PageProcessActivity>({ url, propagateClientError: true }, req.user);
    return response.status(200).send(res.data);
  }

  @Post('/supportprocess/:municipalityId/:id/signals')
  @HttpCode(202)
  @OpenAPI({ summary: 'Step the process of an errand past the gate it waits at' })
  @UseBefore(authMiddleware, hasPermissions(['canEditSupportManagement']), validationMiddleware(SendProcessSignalDto, 'body'))
  async sendProcessSignal(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Param('municipalityId') municipalityId: string,
    @Body() data: SendProcessSignalDto,
    @Res() response: any,
  ): Promise<any> {
    if (municipalityId !== MUNICIPALITY_ID) {
      return response.status(400).send('Invalid municipality id');
    }

    const processesUrl = this.processesUrl(municipalityId, id);
    const processes = await this.apiService.get<ErrandProcessOverview>({ url: processesUrl, propagateClientError: true }, req.user);
    const processInstanceId = processes.data?.processes?.[0]?.processInstanceId;
    if (!processInstanceId) {
      throw new HttpException(404, 'The errand has no process to step');
    }

    await this.apiService.post<void, ProcessSignalRequest>(
      {
        url: `${processesUrl}/${processInstanceId}/signals`,
        data: { signal: data.signal },
        propagateClientError: true,
      },
      req.user,
    );

    return response.status(202).send({ signal: data.signal });
  }
}
