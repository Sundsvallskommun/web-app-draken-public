'use client';

import { useSupportStore } from '@stores/index';
import {
  supportFinancingNotes,
  supportFinancingSourceLine,
  supportFinancingSources,
} from '@supportmanagement/services/support-financial-suitability-service';
import { FC, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { InvestigationFact } from '../investigation-fact.component';
import { type InvestigationSectionProps, InvestigationSectionText } from '../investigation-section-text.component';

export const SupportFinancialSuitabilitySection: FC<InvestigationSectionProps> = (props) => {
  const { t } = useTranslation();
  const supportErrand = useSupportStore((s) => s.supportErrand);

  const sources = useMemo(() => supportFinancingSources(supportErrand), [supportErrand]);
  const notes = useMemo(() => supportFinancingNotes(supportErrand), [supportErrand]);

  return (
    <div className="flex flex-col gap-24" data-cy="financial-suitability-section">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-24">
        <InvestigationFact label={t('common:financial_suitability.financing')}>
          {sources.length === 0 ? (
            <span className="text-dark-secondary" data-cy="financing-none">
              {t('common:financial_suitability.financing_none')}
            </span>
          ) : (
            <ul className="m-0 pl-0 list-none flex flex-col gap-2" data-cy="financing-sources">
              {sources.map((source, index) => (
                <li key={`${source.kind}-${source.lender}-${index}`}>{supportFinancingSourceLine(source)}</li>
              ))}
            </ul>
          )}
        </InvestigationFact>

        {notes ? (
          <InvestigationFact label={t('common:financial_suitability.financing_notes')}>
            <span data-cy="financing-notes">{notes}</span>
          </InvestigationFact>
        ) : null}
      </div>

      <InvestigationSectionText
        {...props}
        name="financial-suitability"
        labelKey="common:financial_suitability.assessment"
        placeholderKey="common:financial_suitability.assessment_placeholder"
        saveFailedKey="common:financial_suitability.toast.save_failed"
      />
    </div>
  );
};
