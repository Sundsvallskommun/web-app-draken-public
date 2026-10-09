'use client';

import { Disclosure } from '@sk-web-gui/react';
import { SupportPbiByHand, SupportPbiPerson } from '@supportmanagement/services/support-pbi-service';
import { Users } from 'lucide-react';
import { FC } from 'react';
import { useTranslation } from 'react-i18next';

import { SupportPbiList } from './support-pbi-list.component';

export const SupportPbiDisclosure: FC<{
  people: SupportPbiPerson[];
  canEdit: boolean;
  busyPartyId?: string;
  notice?: string;
  onRemove: (partyId: string) => void;
  onAdd: (person: SupportPbiByHand) => Promise<boolean>;
}> = ({ people, canEdit, busyPartyId, notice, onRemove, onAdd }) => {
  const { t } = useTranslation();

  return (
    <Disclosure variant="alt" className="w-full" data-cy="pbi-disclosure">
      <Disclosure.Header>
        <Disclosure.Icon icon={<Users />} />
        <Disclosure.Title>{t('common:company.pbi.list.heading')}</Disclosure.Title>
        <Disclosure.Button />
      </Disclosure.Header>
      <Disclosure.Content>
        {notice ? <p className="text-dark-secondary mb-16">{notice}</p> : null}
        <SupportPbiList people={people} canEdit={canEdit} busyPartyId={busyPartyId} onRemove={onRemove} onAdd={onAdd} />
      </Disclosure.Content>
    </Disclosure>
  );
};
