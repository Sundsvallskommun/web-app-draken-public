import { prettyTime } from '@common/services/helper-service';
import { Checkbox, cx, useSnackbar } from '@sk-web-gui/react';
import { useConfigStore } from '@stores/index';
import NextLink from 'next/link';
import { FC } from 'react';

import { acknowledgeNotifications } from './notification-actions';
import { NotificationRenderIcon } from './notification-render-icon';
import { labelBySubType, notificationLabel, senderFallback } from './notification-utils';
import { NotificationView } from './notification-view';

interface NotificationItemProps {
  notification: NotificationView;
  isSelected?: boolean;
  onToggleSelect?: () => void;
  showCheckbox?: boolean;
  refresh?: () => Promise<void>;
}

/** Deep link that opens the errand on its log, with the originating event highlighted. */
export const notificationHref = (notification: NotificationView): string =>
  `/arende/${notification.errandNumber}?tab=history&notification=${notification.id}`;

export const NotificationItem: FC<NotificationItemProps> = ({
  notification,
  isSelected = false,
  onToggleSelect,
  showCheckbox = false,
  refresh,
}) => {
  const municipalityId = useConfigStore((s) => s.municipalityId);
  const toastMessage = useSnackbar();

  const handleAcknowledge = async () => {
    try {
      await acknowledgeNotifications(municipalityId, [notification]);
      await refresh?.();
    } catch (error) {
      toastMessage({
        position: 'bottom',
        closeable: false,
        message: 'Något gick fel när notifieringen skulle kvitteras',
        status: 'error',
      });
    }
  };

  const subTypeLabel = notification.subType ? labelBySubType[notification.subType] : undefined;

  return (
    <div className="p-16 pl-0 flex gap-12 items-start justify-between text-small" data-cy="notification-item">
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
          <strong>{`${notificationLabel(notification)} › `}</strong>
          <NextLink
            href={notificationHref(notification)}
            target="_blank"
            onClick={handleAcknowledge}
            className="underline whitespace-nowrap"
          >
            {notification.errandNumber || 'Till ärendet'}
          </NextLink>
        </div>
        {notification.sender ? <div>Från: {senderFallback(notification.sender)}</div> : null}
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
