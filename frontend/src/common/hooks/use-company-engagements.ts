'use client';

import { CompanyEngagement, getCompanyEngagementsByPartyId } from '@common/services/legal-entity-service';
import { useEffect, useState } from 'react';

export const useCompanyEngagements = (partyId: string | undefined): CompanyEngagement[] => {
  const [engagements, setEngagements] = useState<CompanyEngagement[]>([]);

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
