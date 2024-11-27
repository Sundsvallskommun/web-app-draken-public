import { AppContextInterface, useAppContext } from '@contexts/app.context';
import LucideIcon from '@sk-web-gui/lucide-icon';
import { Badge, Button } from '@sk-web-gui/react';

export const NotificationsBell = (props: { toggleShow: () => void }) => {
  const { notifications }: AppContextInterface = useAppContext();

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
      {notifications.filter((n) => !n.acknowledged).length ? (
        <Badge
          className="absolute -top-10 -right-10 text-white"
          rounded
          color="vattjom"
          counter={notifications.filter((n) => !n.acknowledged).length}
        />
      ) : null}
    </Button>
  );
};
