'use client';

import { Button, useConfirm } from '@sk-web-gui/react';
import { Trash2 } from 'lucide-react';
import { FC } from 'react';
import { useTranslation } from 'react-i18next';

export const SupportPbiRemoveButton: FC<{
  name: string;
  addedByHand: boolean;
  disabled: boolean;
  dataCy: string;
  onRemove: () => void;
}> = ({ name, addedByHand, disabled, dataCy, onRemove }) => {
  const { t } = useTranslation();
  const confirm = useConfirm();

  const askFirst = () =>
    confirm
      .showConfirmation(
        t('common:company.pbi.remove.title'),
        <div className="flex flex-col gap-8">
          <strong>{name}</strong>
          <span>
            {addedByHand
              ? t('common:company.pbi.remove.text_by_hand')
              : t('common:company.pbi.remove.text_from_company')}
          </span>
        </div>,
        t('common:company.pbi.remove.confirm_yes'),
        t('common:company.pbi.remove.cancel'),
        'primary'
      )
      .then((confirmed) => {
        if (confirmed) onRemove();
      });

  return (
    <Button
      iconButton
      variant="tertiary"
      size="sm"
      disabled={disabled}
      aria-label={t('common:company.pbi.remove.aria', { name })}
      data-cy={dataCy}
      onClick={askFirst}
    >
      <Trash2 size={18} />
    </Button>
  );
};
