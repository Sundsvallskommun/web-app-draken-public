import { Notification as CaseDataNotification } from '@common/data-contracts/case-data/data-contracts';
import { Notification as SupportNotification } from '@common/data-contracts/supportmanagement/data-contracts';

export type NotificationType = CaseDataNotification | SupportNotification;

//Help function to get the notification key subtype? in supportmanagement and subType? in casedata
export const getNotificationKey = (notification: NotificationType): string | undefined => {
  return (notification as any).subType?.toUpperCase() ?? (notification as any).subtype?.toUpperCase();
};

export const labelBySubType: Record<string, string> = {
  ATTACHMENT: 'Ny bilaga',
  DECISION: 'Nytt beslut',
  ERRAND: 'Ärende uppdaterat',
  MESSAGE: 'Nytt meddelande',
  NOTE: 'Ny kommentar/anteckning',
  SYSTEM: 'Fasbyte',
  SUSPENSION: 'Parkering upphört',
};

export const getFilteredNotifications = (
  notifications: NotificationType[],
  currentUsername: string
): NotificationType[] => {
  const username = (currentUsername || '').toLowerCase();

  return notifications.filter((n) => {
    const subTypeKey = getNotificationKey(n);
    const createdBy = (n.createdBy || '').toLowerCase();

    return !(subTypeKey === 'SYSTEM' && (createdBy === username || createdBy === 'unknown'));
  });
};
