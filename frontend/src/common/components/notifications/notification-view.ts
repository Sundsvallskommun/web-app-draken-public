import { Notification as CaseDataNotification } from '@common/data-contracts/case-data/data-contracts';

/**
 * The shape every notification component renders.
 *
 * Casedata and supportmanagement have drifted apart: supportmanagement moved to the subscriber based
 * model where a notification is a thin pointer to an event, while casedata still carries the older
 * flat notification. Rather than branching on `appConfig.isCaseData` inside each component, both are
 * mapped to this view first, so the components only ever see one shape.
 */
export interface NotificationView {
  id: string;
  created: string;
  acknowledged: boolean;
  errandId: string;
  errandNumber: string;
  /** MESSAGE | ATTACHMENT | NOTE | ... — drives both the icon and the human readable label. */
  subType?: string;
  description?: string;
  /**
   * Grouping and event linking keys. Supportmanagement does not expose them on notifications yet;
   * the fields are here so they can be filled in without touching any component.
   */
  eventId?: string;
  requestGroupId?: string;
  /** Display name of whoever triggered the notification. Absent for supportmanagement. */
  sender?: string;
  /** AD account of whoever triggered the notification. Absent for supportmanagement. */
  createdBy?: string;
  /**
   * The untouched casedata notification. Casedata's acknowledge endpoint wants the whole object
   * back, so it is kept here rather than reconstructed. Never read by a component.
   */
  source?: CaseDataNotification;
}

/** Supportmanagement marks acknowledgement with a timestamp, casedata with a boolean. */
export interface SupportNotificationResponse {
  id: string;
  created: string;
  expires?: string;
  acknowledged?: string;
  errandId: string;
  errandNumber: string;
  eventType?: string;
  subType?: string;
  description?: string;
  eventId?: string;
  requestGroupId?: string;
}

export const toNotificationView = (notification: SupportNotificationResponse): NotificationView => ({
  id: notification.id,
  created: notification.created,
  acknowledged: !!notification.acknowledged,
  errandId: notification.errandId,
  errandNumber: notification.errandNumber,
  subType: notification.subType?.toUpperCase(),
  description: notification.description,
  eventId: notification.eventId,
  requestGroupId: notification.requestGroupId,
});

export const casedataToNotificationView = (notification: CaseDataNotification): NotificationView => ({
  id: notification.id ?? '',
  created: notification.created ?? '',
  acknowledged: !!notification.acknowledged,
  errandId: String(notification.errandId ?? ''),
  errandNumber: notification.errandNumber ?? '',
  subType: notification.subType?.toUpperCase(),
  description: notification.description,
  sender: notification.createdByFullName,
  createdBy: notification.createdBy,
  source: notification,
});
