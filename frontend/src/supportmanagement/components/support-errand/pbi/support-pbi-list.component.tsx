'use client';

import { Button, List, useConfirm } from '@sk-web-gui/react';
import {
  SupportPbiByHand,
  supportPbiIdentityCode,
  SupportPbiPerson,
} from '@supportmanagement/services/support-pbi-service';
import { Trash2, UserPlus } from 'lucide-react';
import { FC, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { SupportPbiAddDialog } from './support-pbi-add-dialog.component';

const describe = (person: SupportPbiPerson): string =>
  [supportPbiIdentityCode(person.identityCode), person.roles].filter(Boolean).join(' · ');

export const SupportPbiList: FC<{
  people: SupportPbiPerson[];
  canEdit: boolean;
  busyPartyId?: string;
  onRemove: (partyId: string) => void;
  onAdd: (person: SupportPbiByHand) => Promise<boolean>;
}> = ({ people, canEdit, busyPartyId, onRemove, onAdd }) => {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const [adding, setAdding] = useState(false);

  const confirmRemoval = (person: SupportPbiPerson) =>
    confirm
      .showConfirmation(
        t('common:company.pbi.remove.title'),
        <div className="flex flex-col gap-8">
          <strong>{person.name}</strong>
          <span>
            {person.addedByHand
              ? t('common:company.pbi.remove.text_by_hand')
              : t('common:company.pbi.remove.text_from_company')}
          </span>
        </div>,
        t('common:company.pbi.remove.confirm_yes'),
        t('common:company.pbi.remove.cancel'),
        'primary'
      )
      .then((confirmed) => {
        if (confirmed) onRemove(person.partyId);
      });

  return (
    <div className="flex flex-col gap-16" data-cy="pbi-list-section">
      <p className="text-dark-secondary m-0">{t('common:company.pbi.list.description')}</p>

      {people.length === 0 ? (
        <p className="m-0" data-cy="pbi-list-empty">
          {t('common:company.pbi.list.empty')}
        </p>
      ) : (
        <List listStyle="stroke" data-cy="pbi-list">
          {people.map((person) => (
            <List.Item key={person.partyId} className="flex items-center justify-between gap-16">
              <div className="flex flex-col min-w-0">
                <List.Header className="m-0">{person.name}</List.Header>
                {describe(person) ? (
                  <List.Text className="text-small text-dark-secondary m-0">{describe(person)}</List.Text>
                ) : null}
              </div>
              <Button
                iconButton
                variant="tertiary"
                size="sm"
                disabled={!canEdit || !!busyPartyId}
                aria-label={t('common:company.pbi.remove.aria', { name: person.name })}
                data-cy={`pbi-remove-${person.partyId}`}
                onClick={() => confirmRemoval(person)}
              >
                <Trash2 size={18} />
              </Button>
            </List.Item>
          ))}
        </List>
      )}

      <div>
        <Button
          variant="secondary"
          size="sm"
          rightIcon={<UserPlus size={18} />}
          disabled={!canEdit || !!busyPartyId}
          data-cy="pbi-add-open"
          onClick={() => setAdding(true)}
        >
          {t('common:company.pbi.add.open')}
        </Button>
      </div>

      <SupportPbiAddDialog show={adding} onClose={() => setAdding(false)} onAdd={onAdd} />
    </div>
  );
};
