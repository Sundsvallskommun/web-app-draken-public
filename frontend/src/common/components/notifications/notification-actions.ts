import {
  acknowledgeCasedataNotification,
  getCasedataNotifications,
} from '@casedata/services/casedata-notification-service';
import { appConfig } from '@config/appconfig';
import {
  AcknowledgeResult,
  acknowledgeSupportNotifications,
  getSupportNotifications,
} from '@supportmanagement/services/support-notification-service';

import { casedataToNotificationView, NotificationView } from './notification-view';

export type { AcknowledgeResult };

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
 *
 * A failure comes back in `failed` rather than as a rejection: the backend answers 200 with the ids
 * it could not acknowledge, and casedata's fan-out can fail per call.
 */
export const acknowledgeNotifications = async (
  municipalityId: string,
  notifications: NotificationView[]
): Promise<AcknowledgeResult> => {
  if (!notifications.length) return { acknowledged: [], failed: [] };

  if (appConfig.isCaseData) {
    const results = await Promise.allSettled(
      notifications.map((notification) =>
        notification.source
          ? acknowledgeCasedataNotification(municipalityId, notification.source)
          : Promise.reject(new Error(`Notification ${notification.id} carries no casedata source`))
      )
    );

    const acknowledged: string[] = [];
    const failed: string[] = [];
    results.forEach((result, index) => {
      (result.status === 'fulfilled' ? acknowledged : failed).push(notifications[index].id);
    });
    return { acknowledged, failed };
  }

  return acknowledgeSupportNotifications(
    municipalityId,
    notifications.map((notification) => notification.id)
  );
};
