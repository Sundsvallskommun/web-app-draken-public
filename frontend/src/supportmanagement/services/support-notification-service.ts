import { Notification as SupportNotification } from '@common/data-contracts/supportmanagement/data-contracts';
import { apiService } from '@common/services/api-service';
import { SupportErrand } from './support-errand-service';

export const getSupportNotifications: () => Promise<SupportNotification[]> = () => {
  return apiService
    .get<SupportNotification[]>(`supportnotifications`)
    .then((res) => {
      return res.data;
    })
    .catch((e) => {
      console.error('Something went wrong when fetching notifications');
      throw e;
    });
};

export const acknowledgeSupportNotification: (notification: SupportNotification) => Promise<boolean> = (
  notification
) => {
  if (!notification.id) {
    return Promise.reject('Missing id on notification');
  }
  const data = { ...notification, ownerFullName: notification.ownerFullName || '', acknowledged: true };
  return apiService
    .patch<boolean, SupportNotification>(`supportnotifications`, data)
    .then((res) => {
      return true;
    })
    .catch((e) => {
      console.error('Something went wrong when acknowledging notification');
      throw e;
    });
};

export const globalAcknowledgeSupportNotification: (errand: SupportErrand) => Promise<boolean> = (errand) => {
  if (!errand.id) {
    return Promise.reject('Missing id on errand');
  }
  return apiService
    .put(`supportnotifications/${errand.id}/global-acknowledged`, {})
    .then((res) => {
      return true;
    })
    .catch((e) => {
      console.error('Something went wrong when acknowledging notification');
      throw e;
    });
};
