'use client';

import { CompanyProfile, getCompanyProfileByPartyId } from '@common/services/legal-entity-service';
import { useEffect, useState } from 'react';

export const useCompanyProfile = (partyId: string | undefined): CompanyProfile | undefined => {
  const [profile, setProfile] = useState<CompanyProfile>();

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
