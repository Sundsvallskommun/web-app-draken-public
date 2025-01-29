import { Notification as CasedataNotification } from '@common/data-contracts/case-data/data-contracts';
import { apiService } from '@common/services/api-service';
import { PatchNotificationDto } from 'src/data-contracts/backend/data-contracts';

export const getCasedataNotifications: (municipalityId: string) => Promise<CasedataNotification[]> = (
  municipalityId
) => {
  return apiService
    .get<CasedataNotification[]>(`casedatanotifications/${municipalityId}`)
    .then((res) => {
      return res.data;
    })
    .catch((e) => {
      console.error('Something went wrong when fetching notifications');
      throw e;
    });
};

export const acknowledgeCasedataNotification: (
  municipalityId: string,
  notification: CasedataNotification
) => Promise<boolean> = (municipalityId, notification) => {
  if (!notification.id) {
    return Promise.reject('Missing id on notification');
  }
  const data: PatchNotificationDto = {
    id: notification.id,
    errandId: notification.errandId,
    ownerId: notification.ownerId,
    type: notification.type,
    description: notification.description,
    content: notification.content,
    expires: notification.expires,
    acknowledged: true,
  };
  return apiService
    .patch<boolean, PatchNotificationDto>(`casedatanotifications/${municipalityId}`, data)
    .then((res) => {
      return true;
    })
    .catch((e) => {
      console.error('Something went wrong when acknowledging notification');
      throw e;
    });
};
