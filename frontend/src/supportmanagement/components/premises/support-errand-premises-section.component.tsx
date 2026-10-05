'use client';

import { useConfigStore, useMetadataStore, useSupportStore } from '@stores/index';
import { getPremisesAddress } from '@supportmanagement/services/support-premises-address-service';
import { FC, useMemo } from 'react';

import { PremisesSection } from './premises-section.component';

/** The serveringsställen of the open support errand, looked up from its premises address. */
export const SupportErrandPremisesSection: FC = () => {
  const supportErrand = useSupportStore((s) => s.supportErrand);
  const namespace = useMetadataStore((s) => s.supportMetadata?.namespace);
  const municipalityId = useConfigStore((s) => s.municipalityId);

  const premises = useMemo(() => getPremisesAddress(supportErrand, namespace), [supportErrand, namespace]);

  return <PremisesSection municipalityId={municipalityId} premises={premises} />;
};
