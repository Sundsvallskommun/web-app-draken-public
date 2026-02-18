import {
  acknowledgeCasedataNotification,
  getCasedataNotifications,
} from '@casedata/services/casedata-notification-service';
import { Notification as CaseDataNotification } from '@common/data-contracts/case-data/data-contracts';
import { Notification as SupportNotification } from '@common/data-contracts/supportmanagement/data-contracts';
import { sortBy } from '@common/services/helper-service';
import { appConfig } from '@config/appconfig';
import { AppContextInterface, useAppContext } from '@contexts/app.context';
import LucideIcon from '@sk-web-gui/lucide-icon';
import { Button, Checkbox, Divider, cx, useSnackbar } from '@sk-web-gui/react';
import {
  acknowledgeSupportNotification,
  getSupportNotifications,
} from '@supportmanagement/services/support-notification-service';
import { useEffect, useState } from 'react';
import { NotificationItem } from './notification-item';
import { getFilteredNotifications } from './notification-utils';

export const NotificationsWrapper: React.FC<{ show: boolean; setShow: (arg0: boolean) => void }> = ({
  show,
  setShow,
}) => {
  const { municipalityId, notifications, setNotifications }: AppContextInterface = useAppContext();
  const { user } = useAppContext();
  const toastMessage = useSnackbar();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isAcknowledging, setIsAcknowledging] = useState(false);

  useEffect(() => {
    const getNotifications = appConfig.isCaseData ? getCasedataNotifications : getSupportNotifications;

    municipalityId &&
      getNotifications(municipalityId)
        .then((res) => {
          setNotifications(res);
        })
        .catch((e) => {
          console.error('Something went wrong when fetching notifications');
          return [];
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [municipalityId, show]);

  useEffect(() => {
    if (!show) {
      setSelectedIds(new Set());
    }
  }, [show]);

  const filteredNotifications = getFilteredNotifications(notifications, user?.username || '');

  const acknowledgedNotifications = sortBy(
    filteredNotifications.filter((n) => n.acknowledged),
    'created'
  ).reverse();

  const newNotifications = sortBy(
    filteredNotifications.filter((n) => !n.acknowledged),
    'created'
  ).reverse();

  const handleToggleSelect = (notificationId: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(notificationId)) {
        newSet.delete(notificationId);
      } else {
        newSet.add(notificationId);
      }
      return newSet;
    });
  };

  const handleSelectAllNew = () => {
    const allNewIds = newNotifications.map((n) => n.id).filter(Boolean) as string[];
    const allSelected = allNewIds.every((id) => selectedIds.has(id));

    if (allSelected) {
      setSelectedIds((prev) => {
        const newSet = new Set(prev);
        allNewIds.forEach((id) => newSet.delete(id));
        return newSet;
      });
    } else {
      setSelectedIds((prev) => {
        const newSet = new Set(prev);
        allNewIds.forEach((id) => newSet.add(id));
        return newSet;
      });
    }
  };

  const handleAcknowledgeSelected = async () => {
    if (selectedIds.size === 0) return;

    setIsAcknowledging(true);

    try {
      const notificationsToAcknowledge = newNotifications.filter((n) => n.id && selectedIds.has(n.id));

      const acknowledgePromises = notificationsToAcknowledge.map((notification) => {
        if (appConfig.isCaseData) {
          return acknowledgeCasedataNotification(municipalityId, notification as CaseDataNotification);
        } else {
          return acknowledgeSupportNotification(municipalityId, notification as SupportNotification);
        }
      });

      await Promise.all(acknowledgePromises);

      const getNotifications = appConfig.isCaseData ? getCasedataNotifications : getSupportNotifications;
      const updatedNotifications = await getNotifications(municipalityId);
      setNotifications(updatedNotifications);

      setSelectedIds(new Set());

      toastMessage({
        position: 'bottom',
        closeable: true,
        message: `${notificationsToAcknowledge.length} notis${
          notificationsToAcknowledge.length > 1 ? 'er' : ''
        } kvitterad${notificationsToAcknowledge.length > 1 ? 'e' : ''}`,
        status: 'success',
      });
    } catch (error) {
      toastMessage({
        position: 'bottom',
        closeable: false,
        message: 'Något gick fel när notifieringarna skulle kvitteras',
        status: 'error',
      });
    } finally {
      setIsAcknowledging(false);
    }
  };

  const allNewSelected = newNotifications.length > 0 && newNotifications.every((n) => n.id && selectedIds.has(n.id));
  const someNewSelected = newNotifications.some((n) => n.id && selectedIds.has(n.id));

  return (
    <div className="static">
      {show && (
        <>
          <div className="w-[calc(100vw-32rem)] ml-[32rem] top-0 bottom-0 h-full absolute bg-primitives-overlay-darken-6"></div>
          <div
            className={cx(
              `border-1 border-t-0 absolute top-0 bottom-0 -right-[52rem] bg-background-content h-auto transition-all ease-in-out duration-150 z-[20]`,
              show ? 'w-[52rem]' : 'w-0 px-0'
            )}
          >
            <div className="py-16 px-40 w-full flex justify-between items-center shadow-lg h-[8rem]">
              <div className="text-h4-sm flex items-center gap-12">
                <LucideIcon name="bell" /> Notiser
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
                <LucideIcon name="x" />
              </Button>
            </div>
          </div>
          <section
            className={cx(
              `border-1 border-t-0 mt-md absolute top-[9rem] bottom-0 -right-[52rem] transition-all ease-in-out duration-150 z-[20] flex flex-col shadow-lg`,
              show ? 'w-[52rem]' : 'w-0 px-0'
            )}
          >
            <div className="flex-grow mt-sm mb-0 p-24 pt-5 flex flex-col gap-24 overflow-auto">
              <div className="flex flex-col gap-4">
                <div className="relative">
                  <Divider.Section>
                    <div className="flex gap-sm items-center">
                      {newNotifications.length > 0 && (
                        <Checkbox
                          checked={allNewSelected}
                          indeterminate={someNewSelected && !allNewSelected}
                          onChange={handleSelectAllNew}
                        />
                      )}
                      <h2 className="text-h4-sm">Nya</h2>
                    </div>
                  </Divider.Section>
                  {selectedIds.size > 0 && (
                    <Button
                      size="sm"
                      variant="primary"
                      color="vattjom"
                      onClick={handleAcknowledgeSelected}
                      loading={isAcknowledging}
                      disabled={isAcknowledging}
                      className="absolute right-0 top-1/2 -translate-y-1/2"
                    >
                      Markera som läst ({selectedIds.size})
                    </Button>
                  )}
                </div>
                {newNotifications.length > 0 ? (
                  <ul>
                    {newNotifications.map((notification) => (
                      <li key={notification.id}>
                        <NotificationItem
                          notification={notification}
                          isSelected={notification.id ? selectedIds.has(notification.id) : false}
                          onToggleSelect={() => notification.id && handleToggleSelect(notification.id)}
                          showCheckbox={true}
                        />
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
                        <NotificationItem notification={notification} />
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
