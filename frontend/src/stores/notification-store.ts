import type { NotificationType } from '@common/components/notifications/notification-utils';
import { create } from 'zustand';

interface NotificationStore {
  notifications: NotificationType[];
  setNotifications: (notifications: NotificationType[]) => void;
}

export const useNotificationStore = create<NotificationStore>((set) => ({
  notifications: [],
  setNotifications: (notifications) => set({ notifications }),
}));
