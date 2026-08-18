import {
  acknowledgeCasedataNotification,
  getCasedataNotifications,
} from '@casedata/services/casedata-notification-service';
import { appConfig } from '@config/appconfig';
import {
  acknowledgeSupportNotifications,
  getSupportNotifications,
} from '@supportmanagement/services/support-notification-service';

import { casedataToNotificationView, NotificationView } from './notification-view';

/**
 * The one place that knows which domain the app is running as.
 *
 * Casedata and supportmanagement have different notification backends, but every component above
 * this file works on `NotificationView` alone. Keeping the branch here means adding or changing a
 * notification feature never means touching domain checks in a component again.
 */

export const fetchNotifications = (municipalityId: string): Promise<NotificationView[]> => {
  if (appConfig.isCaseData) {
    return getCasedataNotifications(municipalityId).then((notifications) =>
      notifications.map(casedataToNotificationView)
    );
  }
  return getSupportNotifications(municipalityId);
};

/**
 * Acknowledge a set of notifications. Supportmanagement takes the whole set in one request; casedata
 * still acknowledges one at a time, so the fan-out stays on the client for that domain only.
 */
export const acknowledgeNotifications = async (
  municipalityId: string,
  notifications: NotificationView[]
): Promise<void> => {
  if (!notifications.length) return;

  if (appConfig.isCaseData) {
    await Promise.all(
      notifications
        .map((notification) => notification.source)
        .filter((source) => !!source)
        .map((source) => acknowledgeCasedataNotification(municipalityId, source))
    );
    return;
  }

  await acknowledgeSupportNotifications(
    municipalityId,
    notifications.map((notification) => notification.id)
  );
};
