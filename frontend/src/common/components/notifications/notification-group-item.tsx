import { prettyTime } from '@common/services/helper-service';
import { Button, Checkbox } from '@sk-web-gui/react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import NextLink from 'next/link';
import { FC, useState } from 'react';

import { notificationHref, NotificationItem } from './notification-item';
import { NotificationRenderIcon } from './notification-render-icon';
import { groupSummary, NotificationGroup } from './notification-utils';

interface NotificationGroupItemProps {
  group: NotificationGroup;
  isSelected?: boolean;
  onToggleSelect?: () => void;
  showCheckbox?: boolean;
  refresh?: () => Promise<void>;
}

/**
 * A burst of similar activity on one errand, shown as a single line.
 *
 * Ten messages on the same errand within an hour is one thing that happened, not ten. The group
 * collapses them into a summary that expands on demand, so the panel stays readable without hiding
 * anything.
 */
export const NotificationGroupItem: FC<NotificationGroupItemProps> = ({
  group,
  isSelected = false,
  onToggleSelect,
  showCheckbox = false,
  refresh,
}) => {
  const [expanded, setExpanded] = useState(false);

  if (group.items.length === 1) {
    return (
      <NotificationItem
        notification={group.latest}
        isSelected={isSelected}
        onToggleSelect={onToggleSelect}
        showCheckbox={showCheckbox}
        refresh={refresh}
      />
    );
  }

  return (
    <div data-cy="notification-group">
      <div className="p-16 pl-0 flex gap-12 items-start justify-between text-small">
        {showCheckbox && (
          <div className="flex items-center my-xs">
            <Checkbox checked={isSelected} onChange={onToggleSelect} />
          </div>
        )}
        <div className="flex items-center my-xs">
          <NotificationRenderIcon notification={group.latest} />
        </div>
        <div className="flex-grow">
          <div>
            <strong>{`${groupSummary(group)} › `}</strong>
            <NextLink href={notificationHref(group.latest)} target="_blank" className="underline whitespace-nowrap">
              {group.errandNumber || 'Till ärendet'}
            </NextLink>
          </div>
          <Button
            variant="link"
            size="sm"
            className="text-dark-secondary px-0"
            aria-expanded={expanded}
            data-cy="notification-group-toggle"
            leftIcon={expanded ? <ChevronDown size="1.6rem" /> : <ChevronRight size="1.6rem" />}
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? 'Dölj händelser' : `Visa ${group.items.length} händelser`}
          </Button>
        </div>
        <span className="whitespace-nowrap">{prettyTime(group.latest.created ?? '')}</span>
      </div>
      {expanded && (
        <ul className="pl-40 border-0 border-l-1 border-divider ml-16">
          {group.items.map((notification) => (
            <li key={notification.id}>
              <NotificationItem notification={notification} refresh={refresh} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
