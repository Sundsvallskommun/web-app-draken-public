import { Button, Input } from '@sk-web-gui/react';
import type { SupportMeasureRow } from '@supportmanagement/services/support-measure-service';
import { Plus, X } from 'lucide-react';
import { FC } from 'react';
import { useTranslation } from 'react-i18next';

const emptyRow = (): SupportMeasureRow => ({ title: '', result: '', description: '', resultText: '' });

/** The action points the permit holder gets to address: a list of titles, held in the protocol's draft. */
export const InspectionProtocolActionPoints: FC<{
  rows: SupportMeasureRow[];
  readOnly: boolean;
  onChange: (rows: SupportMeasureRow[]) => void;
}> = ({ rows, readOnly, onChange }) => {
  const { t } = useTranslation();

  const setTitle = (index: number, title: string) =>
    onChange(rows.map((row, rowIndex) => (rowIndex === index ? { ...row, title } : row)));

  return (
    <section className="border-1 rounded-12 px-16 pt-12 pb-16 flex flex-col gap-12" data-cy="action-point-list">
      <h3 className="text-h3-md">{t('common:action_points.heading')}</h3>
      <p className="text-small text-dark-secondary m-0">{t('common:action_points.description')}</p>
      <span className="font-bold">{t('common:action_points.count', { count: rows.length })}</span>
      <ol className="flex flex-col gap-8 m-0 p-0 list-none">
        {rows.map((row, index) => (
          <li key={row.id ?? `new-${index}`} className="flex items-center gap-8">
            <span className="w-24 text-right text-dark-secondary">{index + 1}.</span>
            <Input
              className="w-full"
              value={row.title}
              onChange={(event) => setTitle(index, event.target.value)}
              disabled={readOnly}
              aria-label={t('common:action_points.row', { number: index + 1 })}
            />
            <Button
              iconButton
              variant="tertiary"
              showBackground={false}
              onClick={() => onChange(rows.filter((_, rowIndex) => rowIndex !== index))}
              disabled={readOnly}
              aria-label={t('common:action_points.remove', { number: index + 1 })}
            >
              <X size={16} className="text-error" />
            </Button>
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
          onClick={() => onChange([...rows, emptyRow()])}
          disabled={readOnly}
          data-cy="action-point-add"
        >
          {t('common:action_points.add')}
        </Button>
      </div>
    </section>
  );
};
