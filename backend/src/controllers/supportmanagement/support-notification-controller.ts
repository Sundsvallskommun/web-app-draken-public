import { MUNICIPALITY_ID, SUPPORTMANAGEMENT_NAMESPACE } from '@/config';
import { apiServiceName } from '@/config/api-config';
import { Notification as SupportNotification } from '@/data-contracts/supportmanagement/data-contracts';
import { HttpException } from '@/exceptions/HttpException';
import { RequestWithUser } from '@/interfaces/auth.interface';
import authMiddleware from '@/middlewares/auth.middleware';
import { validationMiddleware } from '@/middlewares/validation.middleware';
import ApiService from '@/services/api.service';
import { logger } from '@/utils/logger';
import { apiURL } from '@/utils/util';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { Body, Controller, Get, HttpCode, Param, Patch, Post, Put, Req, Res, UseBefore } from 'routing-controllers';
import { OpenAPI } from 'routing-controllers-openapi';

export class SupportNotificationDto {
  @IsString()
  id: string;
  @IsString()
  ownerFullName?: string;
  @IsString()
  ownerId?: string;
  @IsString()
  @IsOptional()
  created?: string;
  @IsString()
  @IsOptional()
  createdBy?: string;
  @IsString()
  @IsOptional()
  createdByFullName?: string;
  @IsString()
  @IsOptional()
  modified?: string;
  @IsString()
  type?: string;
  @IsString()
  description?: string;
  @IsString()
  @IsOptional()
  content?: string;
  @IsString()
  @IsOptional()
  expires?: string;
  @IsBoolean()
  @IsOptional()
  acknowledged?: boolean;
  @IsBoolean()
  @IsOptional()
  globalAcknowledged?: boolean;
  @IsString()
  errandId?: string;
  @IsString()
  errandNumber?: string;
  @IsString()
  subtype?: string;
}

@Controller()
export class SupportNotificationController {
  private apiService = new ApiService();
  private namespace = SUPPORTMANAGEMENT_NAMESPACE;
  SERVICE = apiServiceName('supportmanagement');

  @Get('/supportnotifications/')
  @OpenAPI({ summary: 'Get support notifications' })
  @UseBefore(authMiddleware)
  async getSupportNotifications(@Req() req: RequestWithUser, @Res() response: any): Promise<SupportNotification[]> {
    const queryObject = {
      ownerId: req.user.username,
    };
    const queryString = new URLSearchParams(queryObject).toString();
    const url = `${MUNICIPALITY_ID}/${this.namespace}/notifications?${queryString}`;
    const baseURL = apiURL(this.SERVICE);
    const res = await this.apiService.get<SupportNotification[]>({ url, baseURL }, req.user);
    return response.status(200).send(res.data);
  }

  @Post('/supportnotifications/')
  @HttpCode(201)
  @OpenAPI({ summary: 'Create a support notification' })
  @UseBefore(authMiddleware, validationMiddleware(SupportNotificationDto, 'body'))
  async createSupportNotification(
    @Req() req: RequestWithUser,
    @Body() data: SupportNotificationDto,
    @Res() response: any,
  ): Promise<{ data: any; message: string }> {
    const allowed = true;
    if (!allowed) {
      throw new HttpException(403, 'Forbidden');
    }

    const url = `${MUNICIPALITY_ID}/${this.namespace}/notifications`;
    const baseURL = apiURL(this.SERVICE);
    const body: SupportNotificationDto = {
      ...data,
    };
    const res = await this.apiService.patch<any, Partial<SupportNotificationDto>>({ url, baseURL, data: body }, req.user).catch(e => {
      logger.error('Error when registering support errand');
      logger.error(e);
      throw e;
    });
    return response.status(200).send(res.data);
  }

  @Patch('/supportnotifications/')
  @HttpCode(201)
  @OpenAPI({ summary: 'Update a support notification' })
  @UseBefore(authMiddleware)
  async updateSupportNotification(
    @Req() req: RequestWithUser,
    @Body() data: SupportNotificationDto,
    @Res() response: any,
  ): Promise<{ data: any; message: string }> {
    const allowed = true;
    if (!allowed) {
      throw new HttpException(403, 'Forbidden');
    }

    const url = `${MUNICIPALITY_ID}/${this.namespace}/notifications`;
    const baseURL = apiURL(this.SERVICE);
    const body: SupportNotificationDto[] = [
      {
        ...data,
      },
    ];
    const res = await this.apiService.patch<any, Partial<SupportNotificationDto[]>>({ url, baseURL, data: body }, req.user).catch(e => {
      logger.error('Error when registering support errand');
      logger.error(e);
      throw e;
    });
    return response.status(200).send(res.data);
  }

  @Put('/supportnotifications/:errandId/global-acknowledged')
  @HttpCode(201)
  @OpenAPI({ summary: 'Global-acknowledged all support notification for errand' })
  @UseBefore(authMiddleware)
  async globalAcknowledgedSupportNotification(
    @Req() req: RequestWithUser,
    @Param('errandId') errandId: string,
    @Res() response: any,
  ): Promise<{ data: any; message: string }> {
    const allowed = true;
    if (!allowed) {
      throw new HttpException(403, 'Forbidden');
    }

    const url = `${MUNICIPALITY_ID}/${this.namespace}/errands/${errandId}/notifications/global-acknowledged`;
    const baseURL = apiURL(this.SERVICE);
    const res = await this.apiService.put({ url, baseURL }, req.user).catch(e => {
      logger.error('Error when global acknowledging support notification');
      logger.error(e);
      throw e;
    });
    return response.status(200).send(res.data);
  }
}
