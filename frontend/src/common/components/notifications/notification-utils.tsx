import dayjs from 'dayjs';

import { NotificationView } from './notification-view';

export const labelBySubType: Record<string, string> = {
  ATTACHMENT: 'Ny bilaga',
  DECISION: 'Nytt beslut',
  ERRAND: 'Ärende uppdaterat',
  MESSAGE: 'Nytt meddelande',
  NOTE: 'Ny kommentar/anteckning',
  SYSTEM: 'Fasbyte',
  SUSPENSION: 'Parkering upphört',
};

/** Plural forms for the grouped notification summary, falling back to the singular label. */
const pluralBySubType: Record<string, string> = {
  ATTACHMENT: 'nya bilagor',
  DECISION: 'nya beslut',
  ERRAND: 'uppdateringar av ärendet',
  MESSAGE: 'nya meddelanden',
  NOTE: 'nya kommentarer/anteckningar',
  SUSPENSION: 'parkeringar som upphört',
};

/** Shown when a notification carries neither a description nor a recognised subtype. */
export const DEFAULT_NOTIFICATION_LABEL = 'Händelse på ärende';

export const senderFallback = (name?: string): string => {
  if (!name || name.toUpperCase() === 'UNKNOWN') return 'Okänd';
  return name;
};

/**
 * What to call a notification in the list.
 *
 * Not every notification carries a description or a subtype — older ones predate those fields, and
 * upstream does not guarantee them. Falling back keeps the panel readable instead of rendering an
 * empty or broken row.
 */
export const notificationLabel = (notification: NotificationView): string => {
  if (notification.description) return notification.description;
  if (notification.subType && labelBySubType[notification.subType]) {
    return labelBySubType[notification.subType];
  }
  return DEFAULT_NOTIFICATION_LABEL;
};

/**
 * Hide notifications the user should not be bothered by.
 *
 * The own-action filter only applies when the notification knows who triggered it. Supportmanagement
 * no longer exposes that (the backend is responsible for not notifying the person who acted), while
 * casedata still carries `createdBy` and still needs the filter here.
 */
export const getFilteredNotifications = (
  notifications: NotificationView[],
  currentUsername: string
): NotificationView[] => {
  const username = (currentUsername || '').toLowerCase();

  return notifications.filter((notification) => {
    // Phase changes are noise for everyone until subscriber event filters are configured.
    if (notification.subType === 'SYSTEM') return false;
    if (!notification.createdBy) return true;
    return notification.createdBy.toLowerCase() !== username;
  });
};

export interface NotificationGroup {
  key: string;
  errandId: string;
  errandNumber: string;
  subType?: string;
  /** Newest notification in the group — its timestamp and text represent the group. */
  latest: NotificationView;
  items: NotificationView[];
}

/** Human readable summary of a group, e.g. "3 nya meddelanden". */
export const groupSummary = (group: NotificationGroup): string => {
  if (group.items.length === 1) {
    return notificationLabel(group.latest);
  }
  const plural = group.subType ? pluralBySubType[group.subType] : undefined;
  return `${group.items.length} ${plural ?? 'nya händelser'}`;
};

/**
 * Merge similar notifications so a burst of activity on one errand reads as one line.
 *
 * Grouping prefers the upstream `requestGroupId`, which ties everything that happened in one
 * operation together. Supportmanagement does not expose it on notifications yet, so the fallback
 * groups by errand and subtype within a time window — same intent, coarser precision.
 */
export const groupNotifications = (
  notifications: NotificationView[],
  windowMinutes: number = 60
): NotificationGroup[] => {
  const groups: NotificationGroup[] = [];

  // Newest first, so the first notification of a group is always the one representing it.
  const sorted = [...notifications].sort((a, b) => dayjs(b.created).valueOf() - dayjs(a.created).valueOf());

  sorted.forEach((notification) => {
    const openGroup = groups.find((group) => {
      if (group.errandId !== notification.errandId) return false;
      if (notification.requestGroupId || group.latest.requestGroupId) {
        return group.latest.requestGroupId === notification.requestGroupId;
      }
      if (group.subType !== notification.subType) return false;
      return dayjs(group.latest.created).diff(dayjs(notification.created), 'minute') < windowMinutes;
    });

    if (openGroup) {
      openGroup.items.push(notification);
      return;
    }

    groups.push({
      key: notification.requestGroupId ?? `${notification.errandId}-${notification.subType}-${notification.id}`,
      errandId: notification.errandId,
      errandNumber: notification.errandNumber,
      subType: notification.subType,
      latest: notification,
      items: [notification],
    });
  });

  return groups;
};

/**
 * Does this event belong to the given notification?
 *
 * Exact while `eventId`/`requestGroupId` are present, and heuristic otherwise — supportmanagement
 * does not link notifications to events yet. Keeping the fuzzy comparison in one place means the
 * heuristic disappears in a single edit once upstream exposes the reference.
 */
export const matchEventToNotification = (
  event: { id?: string; requestGroupId?: string; subType?: string; created?: string },
  notification: NotificationView
): boolean => {
  if (notification.eventId && event.id) return notification.eventId === event.id;
  if (notification.requestGroupId && event.requestGroupId) {
    return notification.requestGroupId === event.requestGroupId;
  }
  if (!event.created || !notification.created) return false;
  // Both subtypes must be known. Treating "neither has one" as a match would let any event within
  // the time window claim any subtype-less notification.
  if (!event.subType || !notification.subType) return false;
  if (event.subType.toUpperCase() !== notification.subType) return false;
  return Math.abs(dayjs(event.created).diff(dayjs(notification.created), 'second')) <= 5;
};
