import { IsString, MaxLength, MinLength } from 'class-validator';
import { Response } from 'express';
import { Body, Controller, Get, HttpCode, Param, Post, QueryParam, Req, Res, UseBefore } from 'routing-controllers';
import { OpenAPI } from 'routing-controllers-openapi';

import { MUNICIPALITY_ID, SUPPORTMANAGEMENT_NAMESPACE } from '@/config';
import { apiServiceName } from '@/config/api-config';
import { Errand, PageProcessActivity, ProcessSignalRequest } from '@/data-contracts/supportmanagement/data-contracts';
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

    const errandUrl = `${this.SERVICE}/${municipalityId}/${this.namespace}/errands/${id}`;
    const errand = await this.apiService.get<Errand>({ url: errandUrl, propagateClientError: true }, req.user);
    const process = errand.data?.process;
    if (!process?.processInstanceId) {
      throw new HttpException(404, 'The errand has no process to step');
    }
    if (!(process.awaitingSignals ?? []).some(awaited => awaited.name === data.signal)) {
      throw new HttpException(409, 'The process is not waiting for that signal');
    }

    await this.apiService.post<void, ProcessSignalRequest>(
      {
        url: `${errandUrl}/processes/${process.processInstanceId}/signals`,
        data: { signal: data.signal },
        propagateClientError: true,
      },
      req.user,
    );

    return response.status(202).send({ signal: data.signal });
  }
}
