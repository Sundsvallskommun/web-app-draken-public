import { Notification as CasedataNotification, Errand } from '@common/data-contracts/case-data/data-contracts';
import { apiService } from '@common/services/api-service';
import { PatchNotificationDto } from 'src/data-contracts/backend/data-contracts';

export const getCasedataNotifications: () => Promise<CasedataNotification[]> = () => {
  return apiService
    .get<CasedataNotification[]>(`casedatanotifications`)
    .then((res) => {
      return res.data;
    })
    .catch((e) => {
      console.error('Something went wrong when fetching notifications');
      throw e;
    });
};

export const acknowledgeCasedataNotification: (notification: CasedataNotification) => Promise<boolean> = (
  notification
) => {
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
    .patch<boolean, PatchNotificationDto>(`casedatanotifications`, data)
    .then((res) => {
      return true;
    })
    .catch((e) => {
      console.error('Something went wrong when acknowledging notification');
      throw e;
    });
};

export const globalAcknowledgeCasedataNotification: (errand: Errand) => Promise<boolean> = (errand) => {
  if (!errand.id) {
    return Promise.reject('Missing id on notification');
  }
  return apiService
    .put(`casedatanotifications/${errand.id}/global-acknowledged`, {})
    .then((res) => {
      return true;
    })
    .catch((e) => {
      console.error('Something went wrong when acknowledging notification');
      throw e;
    });
};
