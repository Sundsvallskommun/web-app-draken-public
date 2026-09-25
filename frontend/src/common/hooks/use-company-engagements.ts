'use client';

import { getCompanyEngagementsByPartyId } from '@common/services/legal-entity-service';
import { useEffect, useState } from 'react';
import { LegalEntityEngagement } from 'src/data-contracts/backend/data-contracts';

export const useCompanyEngagements = (partyId: string | undefined): LegalEntityEngagement[] => {
  const [engagements, setEngagements] = useState<LegalEntityEngagement[]>([]);

  useEffect(() => {
    if (!partyId) {
      return undefined;
    }

    let active = true;

    getCompanyEngagementsByPartyId(partyId)
      .then((res) => {
        if (active) setEngagements(res);
      })
      .catch(() => {
        if (active) setEngagements([]);
      });

    return () => {
      active = false;
    };
  }, [partyId]);

  return partyId ? engagements : [];
};
