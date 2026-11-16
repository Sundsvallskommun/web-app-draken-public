'use client';

import { Button, FormControl, FormLabel, Input } from '@sk-web-gui/react';
import {
  SUPPORT_ACTION_POINT_RESULTS,
  supportMeasureIsOverdue,
  supportMeasureIsSettled,
  type SupportMeasureResultName,
  type SupportMeasureRow,
} from '@supportmanagement/services/support-measure-service';
import { FC } from 'react';
import { useTranslation } from 'react-i18next';

import { ACTION_POINT_RESULT_COLOR, ActionPointOverdue } from './action-point-result.component';

// What Support Management takes as the description of an outcome.
const RESULT_TEXT_MAX_LENGTH = 3000;

/**
 * The day the point was settled. It is shown only while the result still settles the point, since the service keeps
 * the date it was sent and has no way to clear it: a point marked as addressed and then marked as not would otherwise
 * carry a date that says the opposite of the result above it.
 */
const SettledOn: FC<{ row: SupportMeasureRow }> = ({ row }) => {
  const { t } = useTranslation();

  if (!row.completedAt || !supportMeasureIsSettled(row.result)) return null;

  return (
    <span className="text-small text-dark-secondary" data-cy="action-point-completed">
      {t('common:action_points.completed', { date: row.completedAt })}
    </span>
  );
};

/**
 * One action point as it is followed up in Granska: what was asked of the permit holder, shown as it was told to
 * them, and what came of it. The heading, the deadline and the goal are the message that went out and are not
 * rewritten here; the result and the text below it are what the handler establishes afterwards.
 */
export const ActionPointFollowUpCard: FC<{
  index: number;
  row: SupportMeasureRow;
  readOnly: boolean;
  onResult: (result: SupportMeasureResultName) => void;
  onResultText: (resultText: string) => void;
  onResultTextWritten: () => void;
}> = ({ index, row, readOnly, onResult, onResultText, onResultTextWritten }) => {
  const { t } = useTranslation();
  const key = row.id ?? `row-${index}`;
  const number = index + 1;
  const name = row.title || t('common:action_points.row', { number });

  return (
    <section
      className="border-1 rounded-12 px-16 pt-12 pb-16 flex flex-col gap-12"
      data-cy={`action-point-follow-up-${key}`}
    >
      <div className="flex items-baseline gap-8">
        <span className="w-24 text-right text-dark-secondary">{number}.</span>
        <span className="font-bold grow">{name}</span>
      </div>
      <div className="flex flex-wrap gap-16 text-small text-dark-secondary pl-32">
        {row.dueAt ? <span>{t('common:action_points.due_by', { date: row.dueAt })}</span> : null}
        {row.goal ? <span>{row.goal}</span> : null}
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
              color={ACTION_POINT_RESULT_COLOR[result]}
              aria-pressed={selected}
              disabled={readOnly}
              onClick={() => onResult(result)}
              data-cy={`action-point-result-${result}`}
            >
              {t(translationKey)}
            </Button>
          );
        })}
      </fieldset>
      <FormControl id={`action-point-result-text-${key}`}>
        <FormLabel>{t('common:action_points.result_text')}</FormLabel>
        <Input
          className="w-full"
          value={row.resultText}
          maxLength={RESULT_TEXT_MAX_LENGTH}
          placeholder={t('common:action_points.result_text_placeholder')}
          disabled={readOnly}
          onChange={(event) => onResultText(event.target.value)}
          onBlur={onResultTextWritten}
          data-cy="action-point-result-text"
        />
      </FormControl>
      <div className="flex flex-wrap items-center gap-16">
        <ActionPointOverdue shown={supportMeasureIsOverdue(row)} />
        <SettledOn row={row} />
      </div>
    </section>
  );
};
