'use client';

import { useMetadataStore, useSupportStore } from '@stores/index';
import { supportInvestigationTextKeys } from '@supportmanagement/services/support-investigation-sections';
import { supportTobaccoSalesPeriod } from '@supportmanagement/services/support-tobacco-application-service';
import { FC, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { InvestigationFact } from '../investigation-fact.component';
import { type InvestigationSectionProps, InvestigationSectionText } from '../investigation-section-text.component';

export const SupportTobaccoSalesPeriodSection: FC<InvestigationSectionProps> = (props) => {
  const { t } = useTranslation();
  const supportErrand = useSupportStore((s) => s.supportErrand);
  const namespace = useMetadataStore((s) => s.supportMetadata?.namespace);

  const salesPeriod = useMemo(() => supportTobaccoSalesPeriod(supportErrand, namespace), [supportErrand, namespace]);

  const asked = () => {
    if (salesPeriod.indefinite === undefined) return '-';
    if (salesPeriod.indefinite) return t('common:investigation.opening_hours.indefinite');
    return t('common:investigation.opening_hours.temporary');
  };

  return (
    <div className="flex flex-col gap-24" data-cy="tobacco-sales-period-section">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-24">
        <InvestigationFact label={t('common:investigation.opening_hours.sales_period')}>
          <span data-cy="sales-period">{asked()}</span>
        </InvestigationFact>

        <InvestigationFact label={t('common:investigation.opening_hours.dates')}>
          <span data-cy="sales-period-dates">{salesPeriod.period || salesPeriod.startDate || '-'}</span>
        </InvestigationFact>
      </div>

      <InvestigationSectionText {...props} name="opening_hours" {...supportInvestigationTextKeys('opening_hours')} />
    </div>
  );
};
