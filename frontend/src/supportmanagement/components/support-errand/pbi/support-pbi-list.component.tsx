'use client';

import { List } from '@sk-web-gui/react';
import {
  SupportPbiByHand,
  supportPbiIdentityCode,
  SupportPbiPerson,
} from '@supportmanagement/services/support-pbi-service';
import { FC, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AddPbiButton } from './support-add-pbi-button.component';
import { SupportPbiAddDialog } from './support-pbi-add-dialog.component';
import { SupportPbiRemoveButton } from './support-pbi-remove-button.component';

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
  const [adding, setAdding] = useState(false);

  return (
    <div className="flex flex-col gap-16" data-cy="pbi-list-section">
      <p className="text-dark-secondary m-0">{t('common:company.pbi.list.description')}</p>

      {people.length === 0 ? (
        <p className="m-0" data-cy="pbi-list-empty">
          {t('common:company.pbi.list.empty')}
        </p>
      ) : (
        <List listStyle="stroke" data-cy="pbi-list">
          {people.map((person, i) => (
            <List.Item
              key={person.partyId}
              className={`flex items-center justify-between gap-16 ${
                i !== people.length - 1 ? 'border-b-1 border-divider pb-20' : ''
              }`}
            >
              <div className="flex flex-col min-w-0">
                <List.Header className="m-0">{person.name}</List.Header>
                {describe(person) ? (
                  <List.Text className="text-small text-dark-secondary m-0">{describe(person)}</List.Text>
                ) : null}
              </div>
              <SupportPbiRemoveButton
                name={person.name}
                addedByHand={person.addedByHand}
                disabled={!canEdit || !!busyPartyId}
                dataCy={`pbi-remove-${person.partyId}`}
                onRemove={() => onRemove(person.partyId)}
              />
            </List.Item>
          ))}
        </List>
      )}

      <AddPbiButton
        disabled={!canEdit || !!busyPartyId}
        onClick={() => setAdding(true)}
        label={t('common:company.pbi.add.open')}
      />

      <SupportPbiAddDialog show={adding} onClose={() => setAdding(false)} onAdd={onAdd} />
    </div>
  );
};
