import { Notification as CaseDataNotification } from '@common/data-contracts/case-data/data-contracts';

/** One thing that happened on the errand. */
export interface NotificationEventView {
  /**
   * When the event happened. Supportmanagement timestamps every event; casedata only timestamps the
   * notification, so its single event inherits that.
   */
  created: string;
  /** MESSAGE | ATTACHMENT | NOTE | ... — drives both the icon and the human readable label. */
  subType?: string;
  /**
   * CREATE | UPDATE | DELETE — what happened to the entity. Supportmanagement only: casedata's
   * `type` is not documented as this set, and its description is mandatory anyway, so the label
   * never has to fall back to guessing there.
   */
  eventType?: string;
  description?: string;
}

/**
 * The shape every notification component renders.
 *
 * Casedata and supportmanagement have drifted apart: supportmanagement aggregates everything that
 * happened on an errand since the user last acknowledged onto one notification, while casedata still
 * emits one flat notification per event. Rather than branching on `appConfig.isCaseData` inside each
 * component, both are mapped to this view first — casedata as a notification holding a single event
 * — so the components only ever see one shape.
 */
export interface NotificationView {
  id: string;
  created: string;
  acknowledged: boolean;
  errandId: string;
  errandNumber: string;
  /**
   * Everything the notification is about, newest first. Empty is a real case, not a bug: upstream
   * does not guarantee an event for every notification, and the panel still has to render a row.
   */
  events: NotificationEventView[];
  /**
   * Who triggered the notification. `undefined` means the domain has no such concept at all —
   * supportmanagement's subscriber model does not expose one — while a string means casedata knows
   * the notification has an author, even when it cannot name them. The panel relies on that
   * distinction to decide whether to show the sender line at all.
   */
  sender?: string;
  /** AD account of whoever triggered the notification. Absent for supportmanagement. */
  createdBy?: string;
  /**
   * The untouched casedata notification. Casedata's acknowledge endpoint wants the whole object
   * back, so it is kept here rather than reconstructed. Never read by a component.
   */
  source?: CaseDataNotification;
}

/** One event as the backend hands it over. */
interface SupportNotificationEventResponse {
  created?: string;
  eventType?: string;
  subType?: string;
  description?: string;
}

/** Supportmanagement marks acknowledgement with a timestamp, casedata with a boolean. */
export interface SupportNotificationResponse {
  id: string;
  created: string;
  acknowledged?: string;
  errandId: string;
  errandNumber: string;
  /** Already sorted newest first by the backend. */
  events?: SupportNotificationEventResponse[];
}

export const toNotificationView = (notification: SupportNotificationResponse): NotificationView => ({
  id: notification.id,
  created: notification.created,
  acknowledged: !!notification.acknowledged,
  errandId: notification.errandId,
  errandNumber: notification.errandNumber,
  events: (notification.events ?? []).map((event) => ({
    // An event without its own timestamp still has to sit somewhere on the timeline; the
    // notification's own timestamp is the closest truth available.
    created: event.created ?? notification.created,
    subType: event.subType?.toUpperCase(),
    eventType: event.eventType?.toUpperCase(),
    description: event.description,
  })),
});

export const casedataToNotificationView = (notification: CaseDataNotification): NotificationView => ({
  id: notification.id ?? '',
  created: notification.created ?? '',
  acknowledged: !!notification.acknowledged,
  errandId: String(notification.errandId ?? ''),
  errandNumber: notification.errandNumber ?? '',
  events: [
    {
      created: notification.created ?? '',
      subType: notification.subType?.toUpperCase(),
      description: notification.description,
    },
  ],
  // Falls back the same way as before this branch: the full name, then the ad account, then the
  // component's own "Okänd". The empty string still counts as "casedata knows there is an author".
  sender: notification.createdByFullName || notification.createdBy || '',
  createdBy: notification.createdBy,
  source: notification,
});
