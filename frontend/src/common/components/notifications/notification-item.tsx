import {
  acknowledgeCasedataNotification,
  getCasedataNotifications,
} from '@casedata/services/casedata-notification-service';
import { Notification as CaseDataNotification } from '@common/data-contracts/case-data/data-contracts';
import { Notification as SupportNotification } from '@common/data-contracts/supportmanagement/data-contracts';
import { prettyTime } from '@common/services/helper-service';
import { appConfig } from '@config/appconfig';
import { AppContextInterface, useAppContext } from '@contexts/app.context';
import LucideIcon from '@sk-web-gui/lucide-icon';
import { Avatar, cx, useSnackbar } from '@sk-web-gui/react';
import {
  acknowledgeSupportNotification,
  getSupportNotifications,
} from '@supportmanagement/services/support-notification-service';
import NextLink from 'next/link';

type Notification = SupportNotification | CaseDataNotification;

//Help function to get the notification key subtype? in supportmanagement and subType? in casedata
const getNotificationKey = (notification: Notification): string | undefined => {
  return (notification as any).subType?.toUpperCase() ?? (notification as any).subtype?.toUpperCase();
};

const iconConfig: Record<string, { icon?: string; avatar?: boolean; defaultColor: string; label?: string }> = {
  ATTACHMENT: { icon: 'file', defaultColor: 'vattjom', label: 'Ny bilaga' },
  DECISION: { icon: 'bell-ring', defaultColor: 'juniskar', label: 'Nytt beslut' },
  ERRAND: { icon: 'bell-ring', defaultColor: 'juniskar', label: 'Ärende uppdaterat' },
  MESSAGE: { icon: 'message-circle', defaultColor: 'gronsta', label: 'Nytt meddelande' },
  NOTE: { avatar: true, defaultColor: 'juniskar', label: 'Ny kommentar/anteckning' },
  SYSTEM: { icon: 'bell', defaultColor: 'vattjom', label: 'Fasbyte' },
  SUSPENSION: { icon: 'bell-ring', defaultColor: 'juniskar', label: 'Parkering upphört' },

  default: { icon: 'bell', defaultColor: 'vattjom', label: 'Notis' },
};

const senderFallback = (name?: string): string => {
  if (!name || name.toUpperCase() === 'UNKNOWN') return 'Okänd';
  return name;
};

const renderIcon = (notification: Notification) => {
  const key = getNotificationKey(notification) ?? notification.description?.toUpperCase();
  const config = iconConfig[key as keyof typeof iconConfig] ?? iconConfig.default;
  const color = notification.acknowledged ? 'tertiary' : config.defaultColor;

  if (config.avatar) {
    const initials = `${notification.createdByFullName?.split(' ')[1]?.charAt(0)?.toUpperCase() ?? ''}${
      notification.createdByFullName?.split(' ')[0]?.charAt(0)?.toUpperCase() ?? ''
    }`;

    return (
      <div className={cx(`w-[4rem] h-[4rem] rounded-12 flex items-center justify-center bg-${color}-surface-accent`)}>
        <Avatar size="md" initials={initials} color={color} />
      </div>
    );
  }

  return (
    <div
      className={cx(
        `w-[4rem] h-[4rem] rounded-12 flex items-center justify-center ${
          notification.acknowledged ? 'bg-tertiary-surface' : `bg-${color}-surface-accent`
        }`
      )}
    >
      {config.icon && (
        <LucideIcon
          name={config.icon as 'message-circle' | 'bell-ring' | 'file' | 'bell'}
          color={
            color as
              | 'gronsta'
              | 'juniskar'
              | 'vattjom'
              | 'primary'
              | 'error'
              | 'info'
              | 'success'
              | 'warning'
              | 'bjornstigen'
              | 'tertiary'
          }
          size="2.4rem"
        />
      )}
    </div>
  );
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

  return (
    <div className="p-16 flex gap-12 items-start justify-between text-small">
      <div className="flex items-center my-xs">{renderIcon(notification)}</div>
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
        {(() => {
          const key = getNotificationKey(notification);
          const config = iconConfig[key as keyof typeof iconConfig];
          return config?.label ? <div>Händelse: {config.label}</div> : null;
        })()}
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
