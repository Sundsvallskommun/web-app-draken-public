import { useAppContext } from '@contexts/app.context';
import LucideIcon from '@sk-web-gui/lucide-icon';
import { Badge, Button } from '@sk-web-gui/react';
import { SupportNotification } from '@supportmanagement/services/support-notification-service';

export const SupportNotificationsBell = (props: { toggleShow: () => void }) => {
  const { supportNotifications }: { supportNotifications: SupportNotification[] } = useAppContext();

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
          <LucideIcon name={'bell'} />
        </>
      }
    >
      {supportNotifications.filter((n) => !n.acknowledged).length ? (
        <Badge
          className="absolute -top-10 -right-10 text-white"
          rounded
          color="vattjom"
          counter={supportNotifications.filter((n) => !n.acknowledged).length}
        />
      ) : null}
    </Button>
  );
};
