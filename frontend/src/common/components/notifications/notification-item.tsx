import { prettyTime } from '@common/services/helper-service';
import { Checkbox, cx } from '@sk-web-gui/react';
import NextLink from 'next/link';
import { FC } from 'react';

import { NotificationRenderIcon } from './notification-render-icon';
import { getNotificationKey, labelBySubType, NotificationType, senderFallback } from './notification-utils';

interface NotificationItemProps {
  notification: NotificationType;
  onAcknowledge: (notification: NotificationType) => Promise<void>;
  isSelected?: boolean;
  onToggleSelect?: () => void;
  showCheckbox?: boolean;
}

export const NotificationItem: FC<NotificationItemProps> = ({
  notification,
  onAcknowledge,
  isSelected = false,
  onToggleSelect,
  showCheckbox = false,
}) => {
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
          <NextLink
            href={`/arende/${notification.errandNumber}`}
            target="_blank"
            onClick={() => void onAcknowledge(notification)}
            className="underline whitespace-nowrap"
          >
            {notification.errandNumber || 'Till ärendet'}
          </NextLink>
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
