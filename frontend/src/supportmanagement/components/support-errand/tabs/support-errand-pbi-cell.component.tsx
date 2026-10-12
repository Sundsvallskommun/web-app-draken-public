import { Checkbox, useConfirm } from '@sk-web-gui/react';
import { SupportStakeholderFormModel } from '@supportmanagement/services/support-errand-service';
import { engagementIsPerson, SupportPbiCandidate } from '@supportmanagement/services/support-pbi-service';
import { useTranslation } from 'react-i18next';

export interface PbiMarking {
  canEdit: boolean;
  busyIdentity?: string;
  onMark: (candidate: SupportPbiCandidate) => void;
  onUnmark: (stakeholder: SupportStakeholderFormModel) => void;
}

export const SupportErrandPbiCell: React.FC<{ candidate: SupportPbiCandidate; marking: PbiMarking }> = ({
  candidate,
  marking,
}) => {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const { engagement, marked, stakeholder } = candidate;
  if (!engagementIsPerson(engagement)) return null;

  const confirmMarking = () =>
    confirm
      .showConfirmation(
        t('common:company.pbi.confirm_title'),
        <div className="flex flex-col gap-8">
          <strong>{engagement.name}</strong>
          <span>{t('common:company.pbi.confirm_text')}</span>
        </div>,
        t('common:company.pbi.confirm_yes'),
        t('common:company.pbi.confirm_no'),
        'primary'
      )
      .then((confirmed) => {
        if (confirmed) marking.onMark(candidate);
      });

  return (
    <Checkbox
      checked={marked}
      disabled={!marking.canEdit || !!marking.busyIdentity}
      aria-label={t('common:company.pbi.checkbox_aria', { name: engagement.name })}
      onChange={() => (marked && stakeholder ? marking.onUnmark(stakeholder) : confirmMarking())}
      data-cy="pbi-checkbox"
    />
  );
};
