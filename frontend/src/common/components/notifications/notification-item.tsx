import {
  acknowledgeCasedataNotification,
  getCasedataNotifications,
} from '@casedata/services/casedata-notification-service';
import { Notification as CaseDataNotification } from '@common/data-contracts/case-data/data-contracts';
import { Notification as SupportNotification } from '@common/data-contracts/supportmanagement/data-contracts';
import { prettyTime } from '@common/services/helper-service';
import { appConfig } from '@config/appconfig';
import { useConfigStore, useSupportStore } from '@stores/index';
import { Checkbox, cx, useSnackbar } from '@sk-web-gui/react';
import {
  acknowledgeSupportNotification,
  getSupportNotifications,
} from '@supportmanagement/services/support-notification-service';
import { Link as RouterLink } from 'react-router-dom';
import { FC } from 'react';

import { NotificationRenderIcon } from './notification-render-icon';
import { getNotificationKey, labelBySubType, NotificationType, senderFallback } from './notification-utils';

interface NotificationItemProps {
  notification: NotificationType;
  isSelected?: boolean;
  onToggleSelect?: () => void;
  showCheckbox?: boolean;
}

export const NotificationItem: FC<NotificationItemProps> = ({
  notification,
  isSelected = false,
  onToggleSelect,
  showCheckbox = false,
}) => {
  const municipalityId = useConfigStore((s) => s.municipalityId);
  const setNotifications = useSupportStore((s) => s.setNotifications);
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

  const notificationKey = getNotificationKey(notification);
  const subTypeLabel = notificationKey ? labelBySubType[notificationKey] : undefined;

  return (
    <div className="p-16 pl-0 flex gap-12 items-start justify-between text-small">
      {showCheckbox && (
        <div className="flex items-center my-xs">
          <Checkbox checked={isSelected} onChange={onToggleSelect} />
        </div>
      )}
      <div className="flex items-center my-xs">
        <NotificationRenderIcon notification={notification} />
      </div>
      <div className="flex-grow">
        <div>
          <strong>{notification.description + ' › '}</strong>
          <RouterLink
            to={`/arende/${notification.errandNumber}`}
            target="_blank"
            onClick={handleAcknowledge}
            className="underline whitespace-nowrap"
          >
            {notification.errandNumber || 'Till ärendet'}
          </RouterLink>
        </div>
        <div>Från: {senderFallback(notification.createdByFullName || notification.createdBy)}</div>
        {subTypeLabel ? <div>Händelse: {subTypeLabel}</div> : null}
      </div>
      <span className="whitespace-nowrap">{prettyTime(notification.created ?? '')}</span>
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
