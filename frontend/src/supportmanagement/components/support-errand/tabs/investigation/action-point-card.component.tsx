import { Button, FormControl, FormLabel, Input } from '@sk-web-gui/react';
import {
  SUPPORT_ACTION_POINT_RESULTS,
  supportMeasureIsOverdue,
  type SupportMeasureRow,
} from '@supportmanagement/services/support-measure-service';
import { TriangleAlert, X } from 'lucide-react';
import { FC } from 'react';
import { useTranslation } from 'react-i18next';

// What Support Management takes as a measure goal.
const GOAL_MAX_LENGTH = 3000;

const RESULT_COLOR: Record<string, 'gronsta' | 'warning' | 'error' | 'primary'> = {
  COMPLETED: 'gronsta',
  PARTIALLY_COMPLETED: 'warning',
  NOT_COMPLETED: 'error',
  NOT_APPLICABLE: 'primary',
};

const Overdue: FC<{ shown: boolean }> = ({ shown }) => {
  const { t } = useTranslation();

  if (!shown) return null;

  return (
    <span className="flex items-center gap-4 text-small text-error font-bold" data-cy="action-point-overdue">
      <TriangleAlert size={16} aria-hidden="true" />
      {t('common:action_points.overdue')}
    </span>
  );
};

/**
 * A measure carries no revision and sends no notification when it is changed, so a deadline that has been moved
 * leaves no trace of its own. The day the point was last touched is what there is to show.
 */
const Changed: FC<{ changedAt: string }> = ({ changedAt }) => {
  const { t } = useTranslation();

  if (!changedAt) return null;

  return (
    <span className="text-small text-dark-secondary" data-cy="action-point-changed">
      {t('common:action_points.deadline_changed', { date: changedAt })}
    </span>
  );
};

/** One action point the permit holder gets to address: what is to be done, by when, the goal of it, and the outcome. */
export const ActionPointCard: FC<{
  index: number;
  row: SupportMeasureRow;
  readOnly: boolean;
  onChange: (row: SupportMeasureRow) => void;
  onRemove: () => void;
}> = ({ index, row, readOnly, onChange, onRemove }) => {
  const { t } = useTranslation();
  const key = row.id ?? `new-${index}`;
  const number = index + 1;
  const name = row.title || t('common:action_points.row', { number });

  return (
    <section className="border-1 rounded-12 px-16 pt-12 pb-16 flex flex-col gap-12" data-cy={`action-point-${key}`}>
      <div className="flex items-center gap-8">
        <span className="w-24 text-right text-dark-secondary">{number}.</span>
        <Input
          className="w-full"
          value={row.title}
          disabled={readOnly}
          onChange={(event) => onChange({ ...row, title: event.target.value })}
          aria-label={t('common:action_points.row', { number })}
          data-cy="action-point-title"
        />
        <Button
          iconButton
          variant="tertiary"
          showBackground={false}
          disabled={readOnly}
          onClick={onRemove}
          aria-label={t('common:action_points.remove', { number })}
          data-cy="action-point-remove"
        >
          <X size={16} className="text-error" />
        </Button>
      </div>
      <div className="flex flex-wrap gap-16">
        <FormControl id={`action-point-due-at-${key}`}>
          <FormLabel>{t('common:action_points.due_at')}</FormLabel>
          <Input
            type="date"
            value={row.dueAt}
            disabled={readOnly}
            onChange={(event) => onChange({ ...row, dueAt: event.currentTarget.value })}
            data-cy="action-point-due-at"
          />
        </FormControl>
        <FormControl id={`action-point-goal-${key}`} className="grow">
          <FormLabel>{t('common:action_points.goal')}</FormLabel>
          <Input
            className="w-full"
            value={row.goal}
            maxLength={GOAL_MAX_LENGTH}
            placeholder={t('common:action_points.goal_placeholder')}
            disabled={readOnly}
            onChange={(event) => onChange({ ...row, goal: event.target.value })}
            data-cy="action-point-goal"
          />
        </FormControl>
      </div>
      {/* relative keeps the sr-only legend (absolute) from stretching the page below the content scroller */}
      <fieldset className="flex flex-wrap gap-8 relative">
        <legend className="sr-only">{name}</legend>
        {SUPPORT_ACTION_POINT_RESULTS.map(({ result, translationKey }) => {
          const selected = row.result === result;
          return (
            <Button
              key={result}
              size="sm"
              variant={selected ? 'primary' : 'secondary'}
              rounded
              color={RESULT_COLOR[result]}
              aria-pressed={selected}
              disabled={readOnly}
              onClick={() => onChange({ ...row, result })}
              data-cy={`action-point-result-${result}`}
            >
              {t(translationKey)}
            </Button>
          );
        })}
      </fieldset>
      <div className="flex flex-wrap items-center gap-16">
        <Overdue shown={supportMeasureIsOverdue(row)} />
        <Changed changedAt={row.changedAt} />
      </div>
    </section>
  );
};
