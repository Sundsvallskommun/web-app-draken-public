import { ErrandSection } from '@common/components/errand-section/errand-section.component';
import { Spinner } from '@sk-web-gui/react';
import { SupportMeasureType } from '@supportmanagement/services/support-measure-service';
import { ListTodo } from 'lucide-react';
import { FC } from 'react';
import { useTranslation } from 'react-i18next';

import { InspectionProtocolActionPoints } from '../tabs/investigation/inspection-protocol-action-points.component';
import { useMeasureDraft } from './use-measure-draft';

/**
 * The errand's external measures (åtgärder) as a section of their own: the points the permit holder is to address,
 * as a list of titles. Edits are written with Spara ärende, as in the inspection protocol.
 */
export const SupportActionPointsSection: FC = () => {
  const { t } = useTranslation();
  const { readOnly, measures, rows, setRows, loading, error } = useMeasureDraft(
    SupportMeasureType.EXTERNAL,
    'actionPoints',
    'common:action_points.save_error'
  );

  return (
    <ErrandSection
      icon={<ListTodo />}
      title={t('common:action_points.count', { count: rows.length })}
      initialOpen
      data-cy="action-points-section"
    >
      {loading ? <Spinner size={3} aria-label={t('common:inspection_protocol.loading')} /> : null}
      {error ? <p className="m-0">{t('common:inspection_protocol.read_error')}</p> : null}
      {measures ? <InspectionProtocolActionPoints rows={rows} readOnly={readOnly} onChange={setRows} bare /> : null}
    </ErrandSection>
  );
};
