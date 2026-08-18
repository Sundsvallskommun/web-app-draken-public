import iconMap from '@common/components/lucide-icon-map/lucide-icon-map.component';
import { Avatar, cx } from '@sk-web-gui/react';
import { FC } from 'react';

import { NotificationView } from './notification-view';

interface NotificationRenderIconProps {
  notification: NotificationView;
}

/**
 * Keyed on subtype rather than on the description text, so the icon survives upstream rewording of
 * the notification message.
 */
const iconConfig: Record<string, { icon?: string; avatar?: boolean; defaultColor: string }> = {
  MESSAGE: { icon: 'message-circle', defaultColor: 'gronsta' },
  SUSPENSION: { icon: 'bell-ring', defaultColor: 'juniskar' },
  ERRAND: { icon: 'bell-ring', defaultColor: 'juniskar' },
  ATTACHMENT: { icon: 'file', defaultColor: 'vattjom' },
  DECISION: { icon: 'file-text', defaultColor: 'vattjom' },
  // The avatar variant needs a name to build initials from; without one it renders as an empty
  // circle, so the icon is used instead.
  NOTE: { avatar: true, icon: 'clipboard-pen', defaultColor: 'juniskar' },
  default: { icon: 'bell', defaultColor: 'vattjom' },
};

const surfaceColor: Record<string, string> = {
  juniskar: 'bg-juniskar-surface-accent',
  gronsta: 'bg-gronsta-surface-accent',
  vattjom: 'bg-vattjom-surface-accent',
  bjornstigen: 'bg-bjornstigen-surface-accent',
};

const textColor: Record<string, string> = {
  juniskar: 'text-juniskar-surface-primary',
  gronsta: 'text-gronsta-surface-primary',
  vattjom: 'text-vattjom-surface-primary',
  bjornstigen: 'text-bjornstigen-surface-primary',
  primary: 'text-primary',
};

export const NotificationRenderIcon: FC<NotificationRenderIconProps> = ({ notification }) => {
  const config = (notification.subType && iconConfig[notification.subType]) || iconConfig.default;
  const color = notification.acknowledged ? 'primary' : config.defaultColor;
  const bgColor = surfaceColor[color] ?? 'bg-tertiary-surface';

  if (config.avatar && notification.sender) {
    const initials =
      `${notification.sender?.split(' ')[1]?.charAt(0).toUpperCase() ?? ''}` +
      `${notification.sender?.split(' ')[0]?.charAt(0).toUpperCase() ?? ''}`;

    return (
      <div className={cx(`w-[4rem] h-[4rem] rounded-12 flex items-center justify-center bg-${color}-surface-accent`)}>
        <Avatar data-cy="avatar-aside" className="flex-none" size="md" initials={initials} color={color} />
      </div>
    );
  }

  const iconColor = textColor[color] ?? 'text-primary';

  return (
    <div className={cx(`w-[4rem] h-[4rem] rounded-12 flex items-center justify-center`, bgColor, iconColor)}>
      {config.icon &&
        (() => {
          const DynIcon = iconMap[config.icon as string];
          return DynIcon ? <DynIcon size="2.4rem" /> : null;
        })()}
    </div>
  );
};
