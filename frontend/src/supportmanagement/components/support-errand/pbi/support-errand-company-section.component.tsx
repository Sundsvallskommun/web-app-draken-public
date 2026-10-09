'use client';

import { useCompanyProfile } from '@common/hooks/use-company-profile';
import { useSupportStore } from '@stores/index';
import { FC, useState } from 'react';

import { SupportErrandBusinessDescriptionDrawer } from '../tabs/support-errand-business-description-drawer.component';
import { SupportErrandCompanyEngagements } from '../tabs/support-errand-company-engagements.component';
import { useSupportPbi } from '../tabs/use-support-pbi';
import { SupportPbiDisclosure } from './support-pbi-disclosure.component';

/**
 * The company data and the people named from it belong together: unchecking a person in the table and
 * removing them from the list are the same act, so both read from one marking. An errand whose applicant
 * is a private person has no table and still has its list.
 */
export const SupportErrandCompanySection: FC<{ organizationPartyId?: string }> = ({ organizationPartyId }) => {
  const supportErrand = useSupportStore((s) => s.supportErrand);
  const pbi = useSupportPbi(true);
  const companyProfile = useCompanyProfile(organizationPartyId);
  const [showsBusinessDescription, setShowsBusinessDescription] = useState(false);

  const organizationStakeholder = supportErrand?.stakeholders?.find(
    (stakeholder) => stakeholder.role === 'PRIMARY' && stakeholder.externalIdType === 'COMPANY'
  );
  const engagements = pbi.candidates ?? [];

  return (
    <div className="flex flex-col gap-8">
      {engagements.length > 0 ? (
        <SupportErrandCompanyEngagements
          engagements={engagements}
          companyName={companyProfile?.name ?? organizationStakeholder?.organizationName}
          onShowBusinessDescription={companyProfile ? () => setShowsBusinessDescription(true) : undefined}
          pbiMarking={pbi.marking}
          pbiNotice={pbi.notice}
        />
      ) : null}

      <SupportPbiDisclosure
        people={pbi.people}
        canEdit={!!pbi.marking?.canEdit}
        busyPartyId={pbi.marking?.busyPartyId}
        notice={pbi.notice}
        onRemove={(partyId) => pbi.marking?.onUnmark(partyId)}
        onAdd={pbi.addByHand}
      />

      {companyProfile ? (
        <SupportErrandBusinessDescriptionDrawer
          show={showsBusinessDescription}
          profile={companyProfile}
          onClose={() => setShowsBusinessDescription(false)}
        />
      ) : null}
    </div>
  );
};
