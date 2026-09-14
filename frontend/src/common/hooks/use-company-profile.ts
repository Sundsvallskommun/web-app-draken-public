'use client';

import { getCompanyProfileByPartyId } from '@common/services/legal-entity-service';
import { useEffect, useState } from 'react';
import { LegalEntityProfile } from 'src/data-contracts/backend/data-contracts';

export const useCompanyProfile = (partyId: string | undefined): LegalEntityProfile | undefined => {
  const [profile, setProfile] = useState<LegalEntityProfile>();

  useEffect(() => {
    if (!partyId) {
      return undefined;
    }

    let active = true;

    getCompanyProfileByPartyId(partyId)
      .then((res) => {
        if (active) setProfile(res);
      })
      .catch(() => {
        if (active) setProfile(undefined);
      });

    return () => {
      active = false;
    };
  }, [partyId]);

  return partyId ? profile : undefined;
};
