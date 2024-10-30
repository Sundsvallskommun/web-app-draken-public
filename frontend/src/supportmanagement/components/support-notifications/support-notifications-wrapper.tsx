import { User } from '@common/interfaces/user';
import { sortBy } from '@common/services/helper-service';
import { useAppContext } from '@contexts/app.context';
import { Button, Divider, LucideIcon as Icon, cx } from '@sk-web-gui/react';
import { SupportErrand } from '@supportmanagement/services/support-errand-service';
import { SupportNotification, getSupportNotifications } from '@supportmanagement/services/support-notification-service';
import { useEffect } from 'react';
import { SupportNotificationItem } from './support-notification-item';

export const SupportNotificationsWrapper: React.FC<{ show: boolean; setShow: (arg0: boolean) => void }> = ({
  show,
  setShow,
}) => {
  const {
    user,
    supportErrand,
    municipalityId,
    supportNotifications,
    setSupportNotifications,
  }: {
    user: User;
    supportErrand: SupportErrand;
    municipalityId: string;
    supportNotifications: SupportNotification[];
    setSupportNotifications: (notifications: SupportNotification[]) => void;
  } = useAppContext();

  useEffect(() => {
    municipalityId &&
      getSupportNotifications(municipalityId)
        .then((res) => {
          setSupportNotifications(res);
        })
        .catch((e) => {
          console.error('Something went wrong when fetching notifications');
          return [];
        });
  }, [municipalityId]);

  const acknowledgedNotifications = sortBy(
    supportNotifications.filter((n) => n.acknowledged),
    'created'
  ).reverse();
  const newNotifications = sortBy(
    supportNotifications.filter((n) => !n.acknowledged),
    'created'
  ).reverse();

  return (
    <div className="static">
      {show && (
        <>
          <div className="w-[calc(100vw-32rem)] ml-[32rem] top-0 bottom-0 h-full absolute bg-primitives-overlay-darken-6"></div>
          <div
            className={cx(
              `border-1 border-t-0 absolute top-0 bottom-0 -right-[48rem] bg-background-content h-auto transition-all ease-in-out duration-150 z-[20]`,
              show ? 'w-[48rem]' : 'w-0 px-0'
            )}
          >
            <div className="py-16 px-40 w-full flex justify-between items-center shadow-lg h-[8rem]">
              <div className="text-h4-sm flex items-center gap-12">
                <Icon name="bell" /> Notiser
              </div>
              <Button
                tabIndex={show ? 0 : -1}
                aria-label="Stäng notiser"
                iconButton
                variant="tertiary"
                onClick={() => {
                  setShow(false);
                }}
              >
                <Icon name="x" />
              </Button>
            </div>
          </div>
          <section
            className={cx(
              `border-1 border-t-0 mt-md absolute top-[9rem] bottom-0 -right-[48rem] transition-all ease-in-out duration-150 z-[20] flex flex-col shadow-lg`,
              show ? 'w-[48rem]' : 'w-0 px-0'
            )}
          >
            <div className="flex-grow mt-sm mb-0 p-24 pt-0 flex flex-col gap-24 overflow-auto">
              <div className="flex flex-col gap-4">
                <Divider.Section>
                  <div className="flex gap-sm items-center">
                    <h2 className="text-h4-sm">Nya</h2>
                  </div>
                </Divider.Section>
                {newNotifications.length > 0 ? (
                  <ul>
                    {newNotifications.map((notification) => (
                      <li key={notification.id}>
                        <SupportNotificationItem notification={notification} />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="m-md">Inga nya notifieringar</div>
                )}
              </div>
              <div>
                <Divider.Section>
                  <div className="flex gap-sm items-center">
                    <h2 className="text-h4-sm">Tidigare</h2>
                  </div>
                </Divider.Section>

                {acknowledgedNotifications.length > 0 ? (
                  <ul>
                    {acknowledgedNotifications.map((notification) => (
                      <li key={notification.id}>
                        <SupportNotificationItem notification={notification} />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="m-md">Inga notifieringar</div>
                )}
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
};
