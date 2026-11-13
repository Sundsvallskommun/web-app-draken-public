'use client';

import type { Measure } from '@common/data-contracts/supportmanagement/data-contracts';
import { Spinner } from '@sk-web-gui/react';
import { useConfigStore, useSupportStore } from '@stores/index';
import {
  type Sections,
  supportInvestigationTextKeys,
} from '@supportmanagement/services/support-investigation-sections';
import {
  getSupportMeasures,
  SUPPORT_ACTION_POINT_RESULTS,
  supportMeasureIsOverdue,
  supportMeasureRow,
  supportMeasuresOfType,
  SupportMeasureType,
} from '@supportmanagement/services/support-measure-service';
import { FC, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { InvestigationFact } from '../investigation-fact.component';
import { type InvestigationSectionProps, InvestigationSectionText } from '../investigation-section-text.component';

const resultKeyOf = (result: string): string =>
  SUPPORT_ACTION_POINT_RESULTS.find((choice) => choice.result === result)?.translationKey ?? '';

const ActionPointLine: FC<{ measure: Measure }> = ({ measure }) => {
  const { t } = useTranslation();
  const row = supportMeasureRow(measure);
  const result = row.result ? t(resultKeyOf(row.result)) : t('common:action_points.result_none');
  const deadline = row.dueAt ? t('common:action_points.due_by', { date: row.dueAt }) : '';

  return (
    <li className="flex flex-col gap-2">
      <span className="font-bold">{row.title}</span>
      <span className="text-small text-dark-secondary">
        {[deadline, result].filter(Boolean).join(' · ')}
        {supportMeasureIsOverdue(row) ? (
          <span className="text-error font-bold"> · {t('common:action_points.overdue')}</span>
        ) : null}
      </span>
      {row.goal ? <span className="text-small">{row.goal}</span> : null}
    </li>
  );
};

/**
 * The action points as they stand, above what the handler writes about them. They are read from the errand rather
 * than copied into the text, so a point whose deadline or result changes afterwards reads right here too.
 */
export const SupportActionPointsSection: FC<InvestigationSectionProps & { sectionKey: Sections }> = ({
  sectionKey,
  ...props
}) => {
  const { t } = useTranslation();
  const municipalityId = useConfigStore((s) => s.municipalityId);
  const errandId = useSupportStore((s) => s.supportErrand?.id);
  const [points, setPoints] = useState<Measure[]>();

  useEffect(() => {
    if (!municipalityId || !errandId) return;
    let cancelled = false;

    void getSupportMeasures(errandId, municipalityId)
      .catch(() => [] as Measure[])
      .then((measures) => {
        if (!cancelled) setPoints(supportMeasuresOfType(measures, SupportMeasureType.EXTERNAL));
      });

    return () => {
      cancelled = true;
    };
  }, [municipalityId, errandId]);

  const list = () => {
    if (!points) return <Spinner size={2} aria-label={t('common:action_points.loading')} />;
    if (points.length === 0) {
      return <span className="text-dark-secondary">{t('common:action_points.none')}</span>;
    }
    return (
      <ul className="m-0 pl-0 list-none flex flex-col gap-12" data-cy="action-point-facts">
        {points.map((measure) => (
          <ActionPointLine key={measure.id} measure={measure} />
        ))}
      </ul>
    );
  };

  return (
    <div className="flex flex-col gap-24" data-cy={`action-points-${sectionKey}`}>
      <InvestigationFact label={t('common:action_points.heading')}>{list()}</InvestigationFact>
      <InvestigationSectionText {...props} name={sectionKey} {...supportInvestigationTextKeys(sectionKey)} />
    </div>
  );
};
