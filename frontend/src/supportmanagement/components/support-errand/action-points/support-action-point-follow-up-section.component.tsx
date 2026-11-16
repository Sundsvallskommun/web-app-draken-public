'use client';

import { getToastOptions } from '@common/utils/toast-message-settings';
import { Spinner, useSnackbar } from '@sk-web-gui/react';
import { useConfigStore, useSupportStore } from '@stores/index';
import { supportInvestigationTextKeys } from '@supportmanagement/services/support-investigation-sections';
import {
  getSupportMeasures,
  saveSupportMeasures,
  supportMeasureChanges,
  supportMeasureIsSettled,
  type SupportMeasureResultName,
  type SupportMeasureRow,
  supportMeasureRow,
  supportMeasuresOfType,
  SupportMeasureType,
} from '@supportmanagement/services/support-measure-service';
import dayjs from 'dayjs';
import { FC, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { InvestigationFact } from '../investigation-fact.component';
import { type InvestigationSectionProps, InvestigationSectionText } from '../investigation-section-text.component';
import { ActionPointFollowUpCard } from './action-point-follow-up-card.component';

/**
 * The day the point was settled. The service writes only the fields an update names and cannot clear one, so the
 * date is written once: a point that is settled again keeps the day it was first settled on.
 */
const settledOn = (row: SupportMeasureRow, result: SupportMeasureResultName): string =>
  supportMeasureIsSettled(result) ? row.completedAt || dayjs().format('YYYY-MM-DD') : row.completedAt;

/**
 * The follow-up of the action points, in the phase where the errand is reviewed. The points were written on the
 * inspection and carried over by the process engine without a result, so this is where what came of them is
 * established. What the permit holder was told, the heading, the deadline and the goal, is shown as it stands.
 *
 * Each change is written on its own, rather than with the investigation: the text of the section holds the save
 * the tab calls, and a point is a record of its own in the service.
 */
export const SupportActionPointFollowUpSection: FC<InvestigationSectionProps> = (props) => {
  const { t } = useTranslation();
  const toastMessage = useSnackbar();
  const municipalityId = useConfigStore((s) => s.municipalityId);
  const errandId = useSupportStore((s) => s.supportErrand?.id);
  const [rows, setRows] = useState<SupportMeasureRow[]>();
  const [saved, setSaved] = useState<SupportMeasureRow[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!municipalityId || !errandId) return;
    let cancelled = false;

    void getSupportMeasures(errandId, municipalityId)
      .catch(() => [])
      .then((measures) => {
        if (cancelled) return;
        const read = supportMeasuresOfType(measures, SupportMeasureType.EXTERNAL).map(supportMeasureRow);
        setRows(read);
        setSaved(read);
      });

    return () => {
      cancelled = true;
    };
  }, [municipalityId, errandId]);

  const readOnly = !props.writable || busy;

  const save = async (next: SupportMeasureRow[]): Promise<void> => {
    if (!errandId || !municipalityId) return;

    const changes = supportMeasureChanges(SupportMeasureType.EXTERNAL, next, saved);
    if (changes.update.length === 0) return;

    setBusy(true);
    try {
      await saveSupportMeasures(errandId, municipalityId, [changes]);
      setSaved(next);
    } catch {
      setRows(saved);
      toastMessage(getToastOptions({ message: t('common:action_points.save_error'), status: 'error' }));
    } finally {
      setBusy(false);
    }
  };

  const rowsWith = (index: number, change: Partial<SupportMeasureRow>): SupportMeasureRow[] =>
    (rows ?? []).map((row, position) => (position === index ? { ...row, ...change } : row));

  const pickResult = (index: number, result: SupportMeasureResultName) => {
    const next = rowsWith(index, { result, completedAt: settledOn((rows ?? [])[index], result) });
    setRows(next);
    void save(next);
  };

  const list = () => {
    if (!rows) return <Spinner size={2} aria-label={t('common:action_points.loading')} />;
    if (rows.length === 0) {
      return <span className="text-dark-secondary">{t('common:action_points.none')}</span>;
    }
    return (
      <div className="flex flex-col gap-12" data-cy="action-point-follow-up-list">
        {rows.map((row, index) => (
          <ActionPointFollowUpCard
            key={row.id ?? `row-${index}`}
            index={index}
            row={row}
            readOnly={readOnly}
            onResult={(result) => pickResult(index, result)}
            onResultText={(resultText) => setRows(rowsWith(index, { resultText }))}
            onResultTextWritten={() => void save(rows)}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-24" data-cy="action-points-measures_taken">
      <p className="text-small text-dark-secondary m-0">{t('common:action_points.follow_up_description')}</p>
      <InvestigationFact label={t('common:action_points.heading')}>{list()}</InvestigationFact>
      <InvestigationSectionText {...props} name="measures_taken" {...supportInvestigationTextKeys('measures_taken')} />
    </div>
  );
};
