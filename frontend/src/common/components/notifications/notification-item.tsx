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
import { cx, useSnackbar } from '@sk-web-gui/react';
import {
  acknowledgeSupportNotification,
  getSupportNotifications,
} from '@supportmanagement/services/support-notification-service';
import NextLink from 'next/link';

export const NotificationItem: React.FC<{ notification: SupportNotification | CaseDataNotification }> = ({
  notification,
}) => {
  const { municipalityId, setNotifications }: AppContextInterface = useAppContext();
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
            href={
              appConfig.isCaseData
                ? `/arende/${municipalityId}/${notification.errandNumber}`
                : `/arende/${municipalityId}/${notification.errandId}`
            }
            target="_blank"
            onClick={async (e) => {
              try {
                if (appConfig.isCaseData) {
                  await acknowledgeCasedataNotification(municipalityId, notification as CaseDataNotification).catch(
                    () => {
                      throw new Error('Failed to acknowledge notification');
                    }
                  );
                } else {
                  await acknowledgeSupportNotification(municipalityId, notification as SupportNotification).catch(
                    () => {
                      throw new Error('Failed to acknowledge notification');
                    }
                  );
                }
                // const acknowledgeNotification =
                //   isPT() || isMEX() ? acknowledgeCasedataNotification : acknowledgeSupportNotification;
                //   const patchedNotification = isPT() || isMEX() ? notification as CaseDataNotification : notification as SupportNotification;
                // await acknowledgeNotification(municipalityId, notification).catch(() => {
                //   throw new Error('Failed to acknowledge notification');
                // });
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
            }}
            className="underline whitespace-nowrap"
          >
            {notification.errandNumber || 'Till ärendet'}
          </NextLink>
        </div>
        <div>Från {notification.createdByFullName || notification.createdBy || '(okänt)'}</div>
      </div>
      <span className="whitespace-nowrap">{prettyTime(notification.created)}</span>
      {!notification.acknowledged ? (
        <div>
          <span
            className={cx(
              notification.acknowledged ? 'bg-gray-200' : `bg-vattjom-surface-primary`,
              `w-12 h-12 my-xs rounded-full flex items-center justify-center text-lg`
            )}
          ></span>
        </div>
      ) : null}
    </div>
  );
};
