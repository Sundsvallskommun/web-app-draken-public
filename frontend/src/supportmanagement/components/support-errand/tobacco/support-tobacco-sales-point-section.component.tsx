'use client';

import { useMetadataStore, useSupportStore } from '@stores/index';
import { supportInvestigationTextKeys } from '@supportmanagement/services/support-investigation-sections';
import {
  formatPremisesAddress,
  getPremisesAddress,
} from '@supportmanagement/services/support-premises-address-service';
import {
  supportTobaccoSalesPeriod,
  supportTobaccoSalesPoint,
} from '@supportmanagement/services/support-tobacco-application-service';
import { FC, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { InvestigationFact } from '../investigation-fact.component';
import { type InvestigationSectionProps, InvestigationSectionText } from '../investigation-section-text.component';

export const SupportTobaccoSalesPointSection: FC<InvestigationSectionProps> = (props) => {
  const { t } = useTranslation();
  const supportErrand = useSupportStore((s) => s.supportErrand);
  const namespace = useMetadataStore((s) => s.supportMetadata?.namespace);

  const salesPoint = useMemo(() => supportTobaccoSalesPoint(supportErrand, namespace), [supportErrand, namespace]);
  const salesPeriod = useMemo(() => supportTobaccoSalesPeriod(supportErrand, namespace), [supportErrand, namespace]);
  const address = useMemo(() => getPremisesAddress(supportErrand, namespace), [supportErrand, namespace]);

  const answer = (given: boolean | undefined) => {
    if (given === undefined) return '-';
    return t(given ? 'common:investigation.answer_yes' : 'common:investigation.answer_no');
  };

  const period = () => {
    if (salesPeriod.indefinite === undefined) return '-';
    if (salesPeriod.indefinite) {
      return [t('common:investigation.sales_point.indefinite'), salesPeriod.startDate].filter(Boolean).join(', ');
    }
    return [t('common:investigation.sales_point.temporary'), salesPeriod.period].filter(Boolean).join(', ');
  };

  const distanceSelling = [answer(salesPoint.distanceSelling), salesPoint.website].filter(Boolean).join(', ');

  return (
    <div className="flex flex-col gap-24" data-cy="tobacco-sales-point-section">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-24">
        <InvestigationFact label={t('common:investigation.sales_point.name')}>
          <span data-cy="sales-point-name">{salesPoint.name || '-'}</span>
        </InvestigationFact>

        <InvestigationFact label={t('common:investigation.sales_point.address')}>
          <span data-cy="sales-point-address">{address ? formatPremisesAddress(address) : '-'}</span>
        </InvestigationFact>

        <InvestigationFact label={t('common:investigation.sales_point.sales_period')}>
          <span data-cy="sales-point-period">{period()}</span>
        </InvestigationFact>

        <InvestigationFact label={t('common:investigation.sales_point.distance_selling')}>
          <span data-cy="sales-point-distance-selling">{distanceSelling}</span>
        </InvestigationFact>

        <InvestigationFact label={t('common:investigation.sales_point.dangerous_products')}>
          <span data-cy="sales-point-dangerous-products">{answer(salesPoint.dangerousProducts)}</span>
        </InvestigationFact>

        <InvestigationFact label={t('common:investigation.sales_point.supplier_agreement')}>
          <span data-cy="sales-point-supplier-agreement">{answer(salesPoint.supplierAgreement)}</span>
        </InvestigationFact>
      </div>

      <InvestigationSectionText {...props} name="sales_point" {...supportInvestigationTextKeys('sales_point')} />
    </div>
  );
};
