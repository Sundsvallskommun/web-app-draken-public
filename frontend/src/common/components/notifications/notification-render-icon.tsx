import { Notification as CaseDataNotification } from '@common/data-contracts/case-data/data-contracts';
import { Notification as SupportNotification } from '@common/data-contracts/supportmanagement/data-contracts';
import { Avatar, cx } from '@sk-web-gui/react';
import LucideIcon from '@sk-web-gui/lucide-icon';

type Notification = SupportNotification | CaseDataNotification;

interface NotificationRenderIconProps {
  notification: Notification;
}

const iconConfig = {
  'Meddelande mottaget': { icon: 'message-circle', defaultColor: 'gronsta' },
  'Parkering av ärendet har upphört': { icon: 'bell-ring', defaultColor: 'juniskar' },
  'Ärende uppdaterat': { icon: 'bell-ring', defaultColor: 'juniskar' },
  'En bilaga har lagts till i ärendet.': { icon: 'file', defaultColor: 'vattjom' },
  'Notering skapad': { avatar: true, defaultColor: 'juniskar' },
  default: { icon: 'bell', defaultColor: 'vattjom' },
};

const surfaceColor: Record<string, string> = {
  juniskar: 'bg-juniskar-surface-accent',
  gronsta: 'bg-gronsta-surface-accent',
  vattjom: 'bg-vattjom-surface-accent',
  bjornstigen: 'bg-bjornstigen-surface-accent',
};

export const NotificationRenderIcon: React.FC<NotificationRenderIconProps> = ({ notification }) => {
  const config = iconConfig[notification.description as keyof typeof iconConfig] ?? iconConfig.default;
  const color = notification.acknowledged ? 'primary' : config.defaultColor;
  const bgColor = surfaceColor[color] ?? 'bg-tertiary-surface';

  if ('avatar' in config && config.avatar) {
    const initials =
      `${notification.createdByFullName?.split(' ')[1]?.charAt(0).toUpperCase() ?? ''}` +
      `${notification.createdByFullName?.split(' ')[0]?.charAt(0).toUpperCase() ?? ''}`;

    return (
      <div className={cx(`w-[4rem] h-[4rem] rounded-12 flex items-center justify-center bg-${color}-surface-accent`)}>
        <Avatar data-cy="avatar-aside" className="flex-none" size="md" initials={initials} color={color} />
      </div>
    );
  }

  return (
    <div className={cx(`w-[4rem] h-[4rem] rounded-12 flex items-center justify-center`, bgColor)}>
      {'icon' in config && (
        <LucideIcon
          name={config.icon as 'message-circle' | 'bell-ring' | 'file' | 'bell'}
          color={
            color as
              | 'gronsta'
              | 'juniskar'
              | 'vattjom'
              | 'primary'
              | 'error'
              | 'info'
              | 'success'
              | 'warning'
              | 'bjornstigen'
              | 'tertiary'
          }
          size="2.4rem"
        />
      )}
    </div>
  );
};
