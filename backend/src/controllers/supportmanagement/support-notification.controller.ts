import { ArrayNotEmpty, IsArray, IsString } from 'class-validator';
import { randomUUID } from 'crypto';
import { Body, Controller, Get, Param, Patch, Put, QueryParam, Req, Res, UseBefore } from 'routing-controllers';
import { OpenAPI } from 'routing-controllers-openapi';

import { SUPPORTMANAGEMENT_NAMESPACE } from '@/config';
import { apiServiceName } from '@/config/api-config';
import { IdentifierTypeEnum, PageSubscriberNotification, SubscriberNotification } from '@/data-contracts/supportmanagement/data-contracts';
import { RequestWithUser } from '@/interfaces/auth.interface';
import { User } from '@/interfaces/users.interface';
import authMiddleware from '@/middlewares/auth.middleware';
import { validationMiddleware } from '@/middlewares/validation.middleware';
import ApiService from '@/services/api.service';
import { logger } from '@/utils/logger';

/**
 * A notification as the frontend consumes it.
 *
 * Deliberately not the raw upstream SubscriberNotification: `eventId` and `requestGroupId` are not
 * exposed upstream yet, and keeping them in the shape from the start means they can be filled in
 * later without touching a single component.
 */
export class SupportNotificationDto {
  @IsString()
  id!: string;
  @IsString()
  created!: string;
  @IsString()
  expires?: string;
  /** Timestamp of acknowledgement, absent while the notification is unacknowledged. */
  @IsString()
  acknowledged?: string;
  @IsString()
  errandId!: string;
  @IsString()
  errandNumber!: string;
  @IsString()
  eventType?: string;
  @IsString()
  subType?: string;
  @IsString()
  description?: string;
  @IsString()
  eventId?: string;
  @IsString()
  requestGroupId?: string;
}

class AcknowledgeNotificationsDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  ids!: string[];
}

export class AcknowledgeResultDto {
  acknowledged!: string[];
  failed!: string[];
}

const toNotificationDto = (notification: SubscriberNotification): SupportNotificationDto => ({
  id: notification.id!,
  created: notification.created!,
  expires: notification.expires,
  acknowledged: notification.acknowledged,
  errandId: notification.errandId!,
  errandNumber: notification.errandNumber!,
  eventType: notification.eventType,
  subType: notification.subType,
  description: notification.description,
});

@Controller()
export class SupportNotificationController {
  private apiService = new ApiService();
  private namespace = SUPPORTMANAGEMENT_NAMESPACE;
  SERVICE = apiServiceName('supportmanagement');

  private notificationsUrl(municipalityId: string, user: User): string {
    return `${this.SERVICE}/${municipalityId}/${this.namespace}/notifications/${IdentifierTypeEnum.AdAccount}/${user.username}`;
  }

  private async fetchNotifications(municipalityId: string, user: User, page: number, size: number): Promise<SubscriberNotification[]> {
    const query = new URLSearchParams({ page: String(page), size: String(size), sort: 'created,desc' }).toString();
    const res = await this.apiService.get<PageSubscriberNotification>({ url: `${this.notificationsUrl(municipalityId, user)}?${query}` }, user);
    return res.data?.content ?? [];
  }

  /**
   * Acknowledge several notifications.
   *
   * Upstream only acknowledges one notification per call, so the fan-out lives here rather than in
   * the browser. The shared request-group id ties the individual calls together as one operation in
   * the upstream event log. Failures are collected instead of thrown so that a single bad id does
   * not discard the notifications that were acknowledged successfully.
   */
  private async acknowledgeMany(municipalityId: string, user: User, ids: string[]): Promise<AcknowledgeResultDto> {
    const requestGroupId = randomUUID();
    const baseUrl = `${this.SERVICE}/${municipalityId}/${this.namespace}/notifications`;
    const results = await Promise.allSettled(
      ids.map(id => this.apiService.put({ url: `${baseUrl}/${id}/acknowledge`, headers: { 'X-Request-Group-Id': requestGroupId } }, user)),
    );

    const acknowledged: string[] = [];
    const failed: string[] = [];
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        acknowledged.push(ids[index]);
      } else {
        failed.push(ids[index]);
        logger.error(`Failed to acknowledge notification ${ids[index]}: ${result.reason}`);
      }
    });
    return { acknowledged, failed };
  }

  @Get('/supportnotifications/:municipalityId')
  @OpenAPI({ summary: 'Get notifications for the logged in user' })
  @UseBefore(authMiddleware)
  async getSupportNotifications(
    @Req() req: RequestWithUser,
    @Param('municipalityId') municipalityId: string,
    @QueryParam('page') page: number,
    @QueryParam('size') size: number,
    @Res() response: any,
  ): Promise<SupportNotificationDto[]> {
    const notifications = await this.fetchNotifications(municipalityId, req.user, page ?? 0, size ?? 100);
    return response.status(200).send(notifications.map(toNotificationDto));
  }

  @Patch('/supportnotifications/:municipalityId/acknowledge')
  @OpenAPI({ summary: 'Acknowledge one or more notifications for the logged in user' })
  @UseBefore(authMiddleware, validationMiddleware(AcknowledgeNotificationsDto, 'body'))
  async acknowledgeSupportNotifications(
    @Req() req: RequestWithUser,
    @Param('municipalityId') municipalityId: string,
    @Body() data: AcknowledgeNotificationsDto,
    @Res() response: any,
  ): Promise<AcknowledgeResultDto> {
    const result = await this.acknowledgeMany(municipalityId, req.user, data.ids);
    return response.status(200).send(result);
  }

  /**
   * Acknowledge every notification the logged in user has for one errand, used when the errand is
   * opened from the overview. Upstream cannot filter notifications by errand, so the user's list is
   * read and filtered here.
   */
  @Put('/supportnotifications/:municipalityId/:errandId/acknowledge-all')
  @OpenAPI({ summary: 'Acknowledge all notifications the logged in user has for an errand' })
  @UseBefore(authMiddleware)
  async acknowledgeAllForErrand(
    @Req() req: RequestWithUser,
    @Param('municipalityId') municipalityId: string,
    @Param('errandId') errandId: string,
    @Res() response: any,
  ): Promise<AcknowledgeResultDto> {
    const notifications = await this.fetchNotifications(municipalityId, req.user, 0, 100);
    const ids = notifications.filter(n => n.errandId === errandId && !n.acknowledged).map(n => n.id!);
    if (!ids.length) {
      return response.status(200).send({ acknowledged: [], failed: [] });
    }
    const result = await this.acknowledgeMany(municipalityId, req.user, ids);
    return response.status(200).send(result);
  }
}
