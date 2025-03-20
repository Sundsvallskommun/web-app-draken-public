import { CASEDATA_NAMESPACE } from '@/config';
import { Notification as CasedataNotification, PatchNotification } from '@/data-contracts/case-data/data-contracts';
import { HttpException } from '@/exceptions/HttpException';
import { RequestWithUser } from '@/interfaces/auth.interface';
import authMiddleware from '@/middlewares/auth.middleware';
import { validationMiddleware } from '@/middlewares/validation.middleware';
import ApiService from '@/services/api.service';
import { logger } from '@/utils/logger';
import { apiURL } from '@/utils/util';
import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';
import { Body, Controller, Get, HttpCode, Param, Patch, Put, Req, Res, UseBefore } from 'routing-controllers';
import { OpenAPI } from 'routing-controllers-openapi';

export class CasedataNotificationDto implements CasedataNotification {
  @IsOptional()
  @IsString()
  id?: string;
  @IsOptional()
  @IsString()
  municipalityId?: string;
  @IsOptional()
  @IsString()
  namespace?: string;
  @IsOptional()
  @IsString()
  created?: string;
  @IsOptional()
  @IsString()
  modified?: string;
  @IsOptional()
  @IsString()
  ownerFullName?: string;
  @IsString()
  ownerId: string;
  @IsOptional()
  @IsString()
  createdBy?: string;
  @IsOptional()
  @IsString()
  createdByFullName?: string;
  @IsString()
  type: string;
  @IsString()
  description: string;
  @IsOptional()
  @IsString()
  content?: string;
  @IsOptional()
  @IsString()
  expires?: string;
  @IsOptional()
  @IsString()
  acknowledged?: boolean;
  @IsOptional()
  @IsString()
  globalAcknowledged?: boolean;
  @IsString()
  errandId: number;
  @IsOptional()
  @IsString()
  errandNumber?: string;
}

export class PatchNotificationDto implements PatchNotification {
  @IsOptional()
  @IsString()
  id?: string;
  @IsOptional()
  @IsNumber()
  errandId: number;
  @IsOptional()
  @IsString()
  ownerId?: string;
  @IsOptional()
  @IsString()
  type?: string;
  @IsOptional()
  @IsString()
  description?: string;
  @IsOptional()
  @IsString()
  content?: string;
  @IsOptional()
  @IsString()
  expires?: string;
  @IsOptional()
  @IsBoolean()
  acknowledged?: boolean;
  @IsOptional()
  @IsBoolean()
  globalAcknowledged?: boolean;
}

@Controller()
export class CasedataNotificationController {
  private apiService = new ApiService();
  private namespace = CASEDATA_NAMESPACE;
  SERVICE = `case-data/11.0`;

  @Get('/casedatanotifications/:municipalityId')
  @OpenAPI({ summary: 'Get notifications' })
  @UseBefore(authMiddleware)
  async getCasedataNotifications(
    @Req() req: RequestWithUser,
    @Param('municipalityId') municipalityId: string,
    @Res() response: any,
  ): Promise<CasedataNotification[]> {
    const queryObject = {
      ownerId: req.user.username,
    };
    const queryString = new URLSearchParams(queryObject).toString();
    const url = `${municipalityId}/${this.namespace}/notifications?${queryString}`;
    const baseURL = apiURL(this.SERVICE);
    const res = await this.apiService.get<CasedataNotification[]>({ url, baseURL }, req.user);
    return response.status(200).send(res.data);
  }

  @Patch('/casedatanotifications/:municipalityId')
  @HttpCode(201)
  @OpenAPI({ summary: 'Update a notification' })
  @UseBefore(authMiddleware, validationMiddleware(PatchNotificationDto, 'body'))
  async updateCasedataNotification(
    @Req() req: RequestWithUser,
    @Param('municipalityId') municipalityId: string,
    @Body() data: PatchNotificationDto,
    @Res() response: any,
  ): Promise<{ data: any; message: string }> {
    if (!municipalityId) {
      logger.error('No municipality id found, it is needed to update notification.');
      return response.status(400).send('Municipality id missing');
    }
    const url = `${municipalityId}/${this.namespace}/notifications`;
    const baseURL = apiURL(this.SERVICE);
    const body: PatchNotificationDto[] = [
      {
        ...data,
      },
    ];
    const res = await this.apiService.patch<any, Partial<PatchNotificationDto[]>>({ url, baseURL, data: body }, req.user).catch(e => {
      logger.error('Error when updating notification');
      logger.error(e);
      throw e;
    });
    return response.status(200).send(res.data);
  }

  @Put('/casedatanotifications/:municipalityId/:errandId/global-acknowledged')
  @HttpCode(201)
  @OpenAPI({ summary: 'Global-acknowledged all casedata notification for errand' })
  async globalAcknowledgedCasedataNotification(
    @Req() req: RequestWithUser,
    @Param('municipalityId') municipalityId: string,
    @Param('errandId') errandId: string,
    @Res() response: any,
  ): Promise<{ data: any; message: string }> {
    if (!municipalityId) {
      logger.error('No municipality id found, it is needed to update notification.');
      return response.status(400).send('Municipality id missing');
    }
    const url = `${municipalityId}/${this.namespace}/errands/${errandId}/notifications/global-acknowledged`;
    const baseURL = apiURL(this.SERVICE);
    const res = await this.apiService.put({ url, baseURL }, req.user).catch(e => {
      logger.error('Error when updating notification');
      logger.error(e);
      throw e;
    });
    return response.status(200).send(res.data);
  }
}
