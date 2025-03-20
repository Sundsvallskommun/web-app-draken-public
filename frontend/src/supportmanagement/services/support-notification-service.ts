import { Notification as SupportNotification } from '@common/data-contracts/supportmanagement/data-contracts';
import { apiService } from '@common/services/api-service';
import { SupportErrand } from './support-errand-service';

export const getSupportNotifications: (municipalityId: string) => Promise<SupportNotification[]> = (municipalityId) => {
  return apiService
    .get<SupportNotification[]>(`supportnotifications/${municipalityId}`)
    .then((res) => {
      return res.data;
    })
    .catch((e) => {
      console.error('Something went wrong when fetching notifications');
      throw e;
    });
};

export const acknowledgeSupportNotification: (
  municipalityId: string,
  notification: SupportNotification
) => Promise<boolean> = (municipalityId, notification) => {
  if (!notification.id) {
    return Promise.reject('Missing id on notification');
  }
  const data = { ...notification, ownerFullName: notification.ownerFullName || '', acknowledged: true };
  return apiService
    .patch<boolean, SupportNotification>(`supportnotifications/${municipalityId}`, data)
    .then((res) => {
      return true;
    })
    .catch((e) => {
      console.error('Something went wrong when acknowledging notification');
      throw e;
    });
};

export const globalAcknowledgeSupportNotification: (
  errand: SupportErrand,
  municipalityId: string
) => Promise<boolean> = (errand, municipalityId) => {
  if (!errand.id) {
    return Promise.reject('Missing id on errand');
  }
  return apiService
    .put(`supportnotifications/${municipalityId}/${errand.id}/global-acknowledged`, {})
    .then((res) => {
      return true;
    })
    .catch((e) => {
      console.error('Something went wrong when acknowledging notification');
      throw e;
    });
};
