import { Button } from '@sk-web-gui/react';
import { emptySupportMeasureRow, type SupportMeasureRow } from '@supportmanagement/services/support-measure-service';
import { Plus } from 'lucide-react';
import { FC } from 'react';
import { useTranslation } from 'react-i18next';

import { ActionPointCard } from './action-point-card.component';

/** The action points the permit holder gets to address, held in the protocol's draft until the errand is saved. */
export const InspectionProtocolActionPoints: FC<{
  rows: SupportMeasureRow[];
  readOnly: boolean;
  onChange: (rows: SupportMeasureRow[]) => void;
}> = ({ rows, readOnly, onChange }) => {
  const { t } = useTranslation();

  const replace = (index: number, row: SupportMeasureRow) =>
    onChange(rows.map((current, rowIndex) => (rowIndex === index ? row : current)));

  return (
    <section className="flex flex-col gap-12" data-cy="action-point-list">
      <h3 className="text-h3-md">{t('common:action_points.heading')}</h3>
      <p className="text-small text-dark-secondary m-0">{t('common:action_points.description')}</p>
      <span className="font-bold">{t('common:action_points.count', { count: rows.length })}</span>
      <ol className="flex flex-col gap-12 m-0 p-0 list-none">
        {rows.map((row, index) => (
          <li key={row.id ?? `new-${index}`}>
            <ActionPointCard
              index={index}
              row={row}
              readOnly={readOnly}
              onChange={(changed) => replace(index, changed)}
              onRemove={() => onChange(rows.filter((_, rowIndex) => rowIndex !== index))}
            />
          </li>
        ))}
      </ol>
      <div>
        <Button
          variant="primary"
          inverted
          color="vattjom"
          size="sm"
          leftIcon={<Plus size={16} />}
          onClick={() => onChange([...rows, emptySupportMeasureRow()])}
          disabled={readOnly}
          data-cy="action-point-add"
        >
          {t('common:action_points.add')}
        </Button>
      </div>
    </section>
  );
};
