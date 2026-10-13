'use client';

import { useCompanyProfile } from '@common/hooks/use-company-profile';
import { useSupportStore } from '@stores/index';
import { FC, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { SupportErrandBusinessDescriptionDrawer } from '../tabs/support-errand-business-description-drawer.component';
import { SupportErrandCompanyEngagements } from '../tabs/support-errand-company-engagements.component';
import { useSupportPbi } from '../tabs/use-support-pbi';
import { AddPbiButton } from './support-add-pbi-button.component';
import { SupportPbiAddDialog } from './support-pbi-add-dialog.component';

/**
 * The company data is a picker: ticking a person adds them to the errand's stakeholders with the PBI marking,
 * unticking takes the marking away again. The people themselves are shown among the stakeholders below, so an
 * errand whose applicant is a private person has no table but can still have people added by hand.
 */
export const SupportErrandCompanySection: FC<{ organizationPartyId?: string }> = ({ organizationPartyId }) => {
  const { t } = useTranslation();
  const supportErrand = useSupportStore((s) => s.supportErrand);
  const pbi = useSupportPbi(organizationPartyId);
  const companyProfile = useCompanyProfile(organizationPartyId);
  const [showsBusinessDescription, setShowsBusinessDescription] = useState(false);
  const [adding, setAdding] = useState(false);

  const organizationStakeholder = supportErrand?.stakeholders?.find(
    (stakeholder) => stakeholder.role === 'PRIMARY' && stakeholder.externalIdType === 'COMPANY'
  );

  return (
    <div className="flex flex-col gap-8">
      {pbi.candidates.length > 0 ? (
        <SupportErrandCompanyEngagements
          candidates={pbi.candidates}
          companyName={companyProfile?.name ?? organizationStakeholder?.organizationName}
          onShowBusinessDescription={companyProfile ? () => setShowsBusinessDescription(true) : undefined}
          pbiMarking={{
            canEdit: pbi.canEdit,
            busyIdentity: pbi.busyIdentity,
            onMark: (candidate) => void pbi.mark(candidate),
            onUnmark: pbi.unmark,
          }}
        />
      ) : null}

      <AddPbiButton
        disabled={!pbi.canEdit || !!pbi.busyIdentity}
        onClick={() => setAdding(true)}
        label={t('common:company.pbi.add.open')}
      />
      <SupportPbiAddDialog show={adding} onClose={() => setAdding(false)} onAdd={pbi.addByHand} />

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
