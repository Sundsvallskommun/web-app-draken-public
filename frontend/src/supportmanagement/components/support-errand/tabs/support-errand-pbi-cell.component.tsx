import { Checkbox, useConfirm } from '@sk-web-gui/react';
import { SupportPbiCandidate } from '@supportmanagement/services/support-pbi-service';
import { useTranslation } from 'react-i18next';

export interface PbiMarking {
  canEdit: boolean;
  busyPartyId?: string;
  onMark: (partyId: string) => void;
  onUnmark: (partyId: string) => void;
}

export const SupportErrandPbiCell: React.FC<{ engagement: SupportPbiCandidate; marking: PbiMarking }> = ({
  engagement,
  marking,
}) => {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const { partyId, marked, name, unresolved } = engagement;
  if (!partyId) {
    return unresolved ? (
      <span className="text-small text-dark-secondary">{t('common:company.pbi.unresolved')}</span>
    ) : null;
  }

  const confirmMarking = () =>
    confirm
      .showConfirmation(
        t('common:company.pbi.confirm_title'),
        <div className="flex flex-col gap-8">
          <strong>{name}</strong>
          <span>{t('common:company.pbi.confirm_text')}</span>
        </div>,
        t('common:company.pbi.confirm_yes'),
        t('common:company.pbi.confirm_no'),
        'primary'
      )
      .then((confirmed) => {
        if (confirmed) marking.onMark(partyId);
      });

  return (
    <Checkbox
      checked={!!marked}
      disabled={!marking.canEdit || !!marking.busyPartyId}
      aria-label={t('common:company.pbi.checkbox_aria', { name })}
      onChange={() => (marked ? marking.onUnmark(partyId) : confirmMarking())}
      data-cy="pbi-checkbox"
    />
  );
};
