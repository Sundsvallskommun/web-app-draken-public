import { User } from '@common/interfaces/user';
import { apiService } from '@common/services/api-service';
import dayjs from 'dayjs';

export interface SupportNotification {
  id: string;
  created?: string;
  modified?: string;
  ownerFullName: string;
  ownerId: string;
  createdBy: string;
  createdByFullName: string;
  type: string;
  description: string;
  content?: string;
  expires?: string;
  acknowledged?: boolean;
  errandId?: string;
  errandNumber?: string;
}

export interface SupportNotificationDto {
  id: string;
  ownerFullName?: string;
  ownerId?: string;
  created?: string;
  createdBy?: string;
  createdByFullName?: string;
  type?: string;
  description?: string;
  content?: string;
  expires?: string;
  acknowledged?: boolean;
  errandId?: string;
  errandNumber?: string;
}

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

export const getSupportNotificationById: (
  municipalityId: string,
  notificationId: string
) => Promise<SupportNotification[]> = (municipalityId, notificationId) => {
  return apiService
    .get<SupportNotification[]>(`supportnotifications/${municipalityId}/${notificationId}`)
    .then((res) => {
      return res.data;
    })
    .catch((e) => {
      console.error('Something went wrong when fetching notificiation');
      throw e;
    });
};

export const acknowledgeSupportNotification: (
  municipalityId: string,
  notification: SupportNotificationDto
) => Promise<boolean> = (municipalityId, notification) => {
  if (!notification.id) {
    return Promise.reject('Missing id on notification');
  }
  const data = { ...notification, ownerFullName: notification.ownerFullName || '', acknowledged: true };
  return apiService
    .patch<boolean, SupportNotificationDto>(`supportnotifications/${municipalityId}`, data)
    .then((res) => {
      return true;
    })
    .catch((e) => {
      console.error('Something went wrong when acknowledging notification');
      throw e;
    });
};
