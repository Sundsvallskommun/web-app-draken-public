import { Button, cx, Disclosure } from '@sk-web-gui/react';
import type { ProtocolObservations } from '@supportmanagement/inspection-protocols';
import { observedItems } from '@supportmanagement/services/support-inspection-protocol-service';
import {
  SUPPORT_MEASURE_RESULTS,
  SupportMeasureResult,
  type SupportMeasureResultName,
  type SupportMeasureRow,
} from '@supportmanagement/services/support-measure-service';
import { Check, CircleAlert } from 'lucide-react';
import { FC } from 'react';
import { useTranslation } from 'react-i18next';

import { RESULT_COLOR } from './inspection-protocol-measure-card.component';

/** A card per area of the premises: its result, and on a deficiency what was observed. An unassessed area has no row. */
export const InspectionProtocolObservations: FC<{
  observations: ProtocolObservations;
  rows: SupportMeasureRow[];
  readOnly: boolean;
  onChange: (rows: SupportMeasureRow[]) => void;
}> = ({ observations, rows, readOnly, onChange }) => {
  const { t } = useTranslation();
  const rowOf = (title: string) => rows.find((row) => row.title === title);
  const assessed = observations.areas.filter((area) => rowOf(area.label)?.result).length;
  const observed = observations.areas.reduce((count, area) => count + observedItems(rowOf(area.label)).length, 0);

  const setRow = (row: SupportMeasureRow) =>
    onChange(
      rowOf(row.title) ? rows.map((candidate) => (candidate.title === row.title ? row : candidate)) : [...rows, row]
    );

  // Leaving Brist drops what was observed, so an approved area never carries observations.
  const setResult = (title: string, result: SupportMeasureResultName) => {
    const row = rowOf(title) ?? { title, result: '', description: '', resultText: '' };
    setRow({ ...row, result, resultText: result === SupportMeasureResult.NOT_COMPLETED ? row.resultText : '' });
  };

  const toggleItem = (row: SupportMeasureRow, key: string) => {
    const items = observedItems(row);
    const next = items.includes(key) ? items.filter((item) => item !== key) : [...items, key];
    setRow({ ...row, resultText: next.join('|') });
  };

  return (
    <Disclosure variant="alt" className="w-full" initalOpen data-cy="observations">
      <Disclosure.Header>
        <Disclosure.Title>{t('common:inspection_protocol.observations.heading')}</Disclosure.Title>
        <span className="text-small font-bold" data-cy="observations-assessed">
          {t('common:inspection_protocol.observations.assessed', { assessed, total: observations.areas.length })}
          {' · '}
          {t('common:inspection_protocol.observations.observed', { count: observed })}
        </span>
        <Disclosure.Button />
      </Disclosure.Header>
      <Disclosure.Content>
        <div className="flex flex-col gap-16">
          <p className="m-0">{t('common:inspection_protocol.observations.intro')}</p>
          {observations.areas.map((area) => {
            const row = rowOf(area.label);
            const deficient = row?.result === SupportMeasureResult.NOT_COMPLETED;
            const items = observedItems(row);
            const missing = deficient && items.length === 0;
            return (
              <section
                key={area.key}
                className={cx(
                  'border-1 rounded-12 px-16 pt-12 pb-16 flex flex-col gap-12',
                  missing && 'border-error-surface-primary'
                )}
                data-cy={`observation-${area.key}`}
              >
                <h3 className="text-h4-sm m-0">{area.label}</h3>
                {/* relative keeps the sr-only legend (absolute) from stretching the page below the content scroller */}
                <fieldset className="flex gap-8 relative">
                  <legend className="sr-only">{area.label}</legend>
                  {SUPPORT_MEASURE_RESULTS.map(({ result, translationKey }) => {
                    const selected = row?.result === result;
                    return (
                      <Button
                        key={result}
                        size="sm"
                        variant={selected ? 'primary' : 'secondary'}
                        rounded
                        color={RESULT_COLOR[result]}
                        leftIcon={selected ? <Check size={16} /> : undefined}
                        aria-pressed={selected}
                        disabled={readOnly}
                        onClick={() => setResult(area.label, result)}
                        data-cy={`observation-result-${result}`}
                      >
                        {t(translationKey)}
                      </Button>
                    );
                  })}
                </fieldset>
                {row && deficient ? (
                  <fieldset className="flex flex-col gap-8 border-t-1 pt-12 relative">
                    <legend className="sr-only">{t('common:inspection_protocol.observations.what')}</legend>
                    <span className="text-small font-bold" aria-hidden>
                      {t('common:inspection_protocol.observations.what')}
                    </span>
                    <div className="flex flex-wrap gap-8">
                      {observations.items.map((item) => {
                        const selected = items.includes(item.key);
                        return (
                          <Button
                            key={item.key}
                            size="sm"
                            variant={selected ? 'primary' : 'tertiary'}
                            rounded
                            color="vattjom"
                            leftIcon={selected ? <Check size={16} /> : undefined}
                            aria-pressed={selected}
                            disabled={readOnly}
                            onClick={() => toggleItem(row, item.key)}
                            data-cy={`observation-item-${item.key}`}
                          >
                            {item.label}
                          </Button>
                        );
                      })}
                    </div>
                    {missing ? (
                      <span className="text-small text-error flex items-center gap-4" data-cy="observation-missing">
                        <CircleAlert size={16} />
                        {t('common:inspection_protocol.observations.missing')}
                      </span>
                    ) : null}
                  </fieldset>
                ) : null}
              </section>
            );
          })}
        </div>
      </Disclosure.Content>
    </Disclosure>
  );
};
