'use client';

import type { DecisionPremises } from '@supportmanagement/services/support-decision-premises-service';
import { formatAddress } from '@supportmanagement/services/support-premises-address-service';
import { useTranslation } from 'react-i18next';

/** The premises as one line: the address, and the restaurant number or that a new one is asked for. */
export const usePremisesText = () => {
  const { t } = useTranslation();

  return (premises: DecisionPremises): string =>
    [
      formatAddress({ streetAddress: premises.street, postalCode: premises.postalCode, postalArea: premises.city }),
      premises.choice.kind === 'EXISTING'
        ? t('common:decision.premises.number', { number: premises.choice.restaurantNumber })
        : t('common:decision.premises.new_number'),
    ].join(' · ');
};
