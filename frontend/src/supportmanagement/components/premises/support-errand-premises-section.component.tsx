'use client';

import { useConfigStore, useMetadataStore, useSupportStore } from '@stores/index';
import { isSupportActionErrand } from '@supportmanagement/services/support-measure-service';
import { getPremisesAddress } from '@supportmanagement/services/support-premises-address-service';
import { FC, useMemo } from 'react';

import { PremisesSection } from './premises-section.component';

/**
 * The serveringsställen of the open support errand, looked up from its premises address.
 *
 * An action errand has none of its own: it decides on a permit already granted and assigns no restaurant number,
 * so the lookup would offer the handler a choice that is kept nowhere. Which serving place its decision concerns
 * is stated in the decision basis instead, read from the inspection it was raised from.
 */
export const SupportErrandPremisesSection: FC = () => {
  const supportErrand = useSupportStore((s) => s.supportErrand);
  const namespace = useMetadataStore((s) => s.supportMetadata?.namespace);
  const municipalityId = useConfigStore((s) => s.municipalityId);

  const premises = useMemo(() => getPremisesAddress(supportErrand, namespace), [supportErrand, namespace]);

  if (isSupportActionErrand(supportErrand)) return null;

  return <PremisesSection municipalityId={municipalityId} premises={premises} />;
};
