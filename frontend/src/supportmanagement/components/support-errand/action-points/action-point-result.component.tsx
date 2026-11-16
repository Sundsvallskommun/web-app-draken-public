import { TriangleAlert } from 'lucide-react';
import { FC } from 'react';
import { useTranslation } from 'react-i18next';

/** What each outcome reads as: settled in green, partly in amber, unaddressed in red, no longer relevant in plain. */
export const ACTION_POINT_RESULT_COLOR: Record<string, 'gronsta' | 'warning' | 'error' | 'primary'> = {
  COMPLETED: 'gronsta',
  PARTIALLY_COMPLETED: 'warning',
  NOT_COMPLETED: 'error',
  NOT_APPLICABLE: 'primary',
};

/** Shown where the result can be set, so that what it asks for is something the handler can act on. */
export const ActionPointOverdue: FC<{ shown: boolean }> = ({ shown }) => {
  const { t } = useTranslation();

  if (!shown) return null;

  return (
    <span className="flex items-center gap-4 text-small text-error font-bold" data-cy="action-point-overdue">
      <TriangleAlert size={16} aria-hidden="true" />
      {t('common:action_points.overdue')}
    </span>
  );
};
