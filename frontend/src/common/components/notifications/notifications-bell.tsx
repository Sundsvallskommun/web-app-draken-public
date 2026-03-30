import { useSupportStore, useUserStore } from '@stores/index';
import { Badge, Button } from '@sk-web-gui/react';
import { getFilteredNotifications } from './notification-utils';
import { Bell } from 'lucide-react';

export const NotificationsBell = (props: { toggleShow: () => void }) => {
  const notifications = useSupportStore((s) => s.notifications);
  const user = useUserStore((s) => s.user);
  const filteredNotifications = getFilteredNotifications(notifications, user?.username || '');
  const newCount = filteredNotifications.filter((n) => !n.acknowledged).length;

  return (
    <Button
      role="menuitem"
      size={'md'}
      aria-label={'Notifieringar'}
      onClick={() => {
        props.toggleShow();
      }}
      className="mx-md"
      variant="tertiary"
      iconButton
      leftIcon={
        <>
          <Bell />
        </>
      }
    >
      {newCount > 0 && (
        <Badge
          className="absolute -top-10 -right-10 text-white"
          rounded
          color="vattjom"
          counter={newCount > 99 ? '99+' : newCount}
        />
      )}
    </Button>
  );
};
