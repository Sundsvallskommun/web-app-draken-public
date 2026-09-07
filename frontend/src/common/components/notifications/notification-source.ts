import type { NotificationType } from './notification-utils';

/** Operations consumed by the notification UI; the application supplies its transport. */
export interface NotificationSource {
  list: (municipalityId: string) => Promise<NotificationType[]>;
  acknowledge: (municipalityId: string, notification: NotificationType) => Promise<boolean>;
}
