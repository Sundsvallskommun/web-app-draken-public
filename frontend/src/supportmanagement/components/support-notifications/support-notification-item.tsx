import { prettyTime } from '@common/services/helper-service';
import { useAppContext } from '@contexts/app.context';
import LucideIcon from '@sk-web-gui/lucide-icon';
import { cx, useSnackbar } from '@sk-web-gui/react';
import {
  SupportNotification,
  acknowledgeSupportNotification,
  getSupportNotifications,
} from '@supportmanagement/services/support-notification-service';
import NextLink from 'next/link';

export const SupportNotificationItem: React.FC<{ notification: SupportNotification }> = ({ notification }) => {
  const {
    municipalityId,
    setSupportNotifications,
  }: {
    municipalityId: string;
    supportNotifications: SupportNotification[];
    setSupportNotifications: (notifications: SupportNotification[]) => void;
  } = useAppContext();
  const toastMessage = useSnackbar();

  const color = notification.acknowledged ? 'tertiary' : 'info';
  return (
    <div className="p-16 flex gap-12 items-start justify-between text-small">
      <div className="flex items-center my-xs">
        <LucideIcon.Padded name="message-circle" color={color} inverted size="4rem" />
      </div>
      <div className="flex-grow">
        <div>
          {notification.description}{' '}
          <NextLink
            href={`/arende/${municipalityId}/${notification.errandId}`}
            target="_blank"
            onClick={async (e) => {
              try {
                await acknowledgeSupportNotification(municipalityId, notification).catch(() => {
                  throw new Error('Failed to acknowledge notification');
                });
                const notifications = await getSupportNotifications(municipalityId);
                setSupportNotifications(notifications);
              } catch (error) {
                toastMessage({
                  position: 'bottom',
                  closeable: false,
                  message: 'Något gick fel när notifieringen skulle kvitteras',
                  status: 'error',
                });
              }
            }}
            className="underline whitespace-nowrap"
          >
            {notification.errandNumber || 'Till ärendet'}
          </NextLink>
        </div>
        <div>Från {notification.createdByFullName || notification.createdBy || '(okänt)'}</div>
      </div>
      <span className="whitespace-nowrap">{prettyTime(notification.created)}</span>
      <div>
        <span
          className={cx(
            notification.acknowledged ? 'bg-gray-200' : `bg-vattjom-surface-primary`,
            `w-12 h-12 my-xs rounded-full flex items-center justify-center text-lg`
          )}
        ></span>
      </div>
    </div>
  );
};
