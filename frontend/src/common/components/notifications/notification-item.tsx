import {
  acknowledgeCasedataNotification,
  getCasedataNotifications,
} from '@casedata/services/casedata-notification-service';
import { Notification as CaseDataNotification } from '@common/data-contracts/case-data/data-contracts';
import { Notification as SupportNotification } from '@common/data-contracts/supportmanagement/data-contracts';
import { prettyTime } from '@common/services/helper-service';
import { appConfig } from '@config/appconfig';
import { AppContextInterface, useAppContext } from '@contexts/app.context';
import { Avatar, cx, useSnackbar } from '@sk-web-gui/react';
import {
  acknowledgeSupportNotification,
  getSupportNotifications,
} from '@supportmanagement/services/support-notification-service';
import NextLink from 'next/link';
import { NotificationRenderIcon } from './notification-render-icon';

type Notification = SupportNotification | CaseDataNotification;

//Help function to get the notification key subtype? in supportmanagement and subType? in casedata
const getNotificationKey = (notification: Notification): string | undefined => {
  return (notification as any).subType?.toUpperCase() ?? (notification as any).subtype?.toUpperCase();
};

const labelBySubType: Record<string, string> = {
  ATTACHMENT: 'Ny bilaga',
  DECISION: 'Nytt beslut',
  ERRAND: 'Ärende uppdaterat',
  MESSAGE: 'Nytt meddelande',
  NOTE: 'Ny kommentar/anteckning',
  SYSTEM: 'Fasbyte',
  SUSPENSION: 'Parkering upphört',
};

const senderFallback = (name?: string): string => {
  if (!name || name.toUpperCase() === 'UNKNOWN') return 'Okänd';
  return name;
};

export const NotificationItem: React.FC<{ notification: Notification }> = ({ notification }) => {
  const { municipalityId, setNotifications }: AppContextInterface = useAppContext();
  const toastMessage = useSnackbar();

  const handleAcknowledge = async () => {
    try {
      if (appConfig.isCaseData) {
        await acknowledgeCasedataNotification(municipalityId, notification as CaseDataNotification);
      } else {
        await acknowledgeSupportNotification(municipalityId, notification as SupportNotification);
      }

      const getNotifications = appConfig.isCaseData ? getCasedataNotifications : getSupportNotifications;

      const notifications = await getNotifications(municipalityId);
      setNotifications(notifications);
    } catch (error) {
      toastMessage({
        position: 'bottom',
        closeable: false,
        message: 'Något gick fel när notifieringen skulle kvitteras',
        status: 'error',
      });
    }
  };

  const subTypeLabel = getNotificationKey(notification) && labelBySubType[getNotificationKey(notification)];

  return (
    <div className="p-16 flex gap-12 items-start justify-between text-small">
      <div className="flex items-center my-xs">
        <NotificationRenderIcon notification={notification} />
      </div>
      <div className="flex-grow">
        <div>
          <strong>{notification.description + ' › '}</strong>
          <NextLink
            href={
              appConfig.isCaseData
                ? `/arende/${municipalityId}/${notification.errandNumber}`
                : `/arende/${municipalityId}/${notification.errandId}`
            }
            target="_blank"
            onClick={handleAcknowledge}
            className="underline whitespace-nowrap"
          >
            {notification.errandNumber || 'Till ärendet'}
          </NextLink>
        </div>
        <div>Från: {senderFallback(notification.createdByFullName || notification.createdBy)}</div>
        {subTypeLabel ? <div>Händelse: {subTypeLabel}</div> : null}
      </div>
      <span className="whitespace-nowrap">{prettyTime(notification.created)}</span>
      {!notification.acknowledged && (
        <div>
          <span
            className={cx(
              `w-12 h-12 my-xs rounded-full flex items-center justify-center text-lg`,
              `bg-vattjom-surface-primary`
            )}
          />
        </div>
      )}
    </div>
  );
};
