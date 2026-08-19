'use client';

import { StakeholderCardContact } from '@common/components/stakeholder-card/stakeholder-card.component';
import { FC } from 'react';

const Field: FC<{ label: string; value?: string | null; dataCy?: string }> = ({ label, value, dataCy }) => (
  <div>
    <p className="text-label-small m-0">{label}</p>
    <p className={`m-0 text-small ${value ? '' : 'text-dark-disabled'}`} data-cy={dataCy}>
      {value || '(saknas)'}
    </p>
  </div>
);

export const CustomerViewContactDetails: FC<{ contact: StakeholderCardContact }> = ({ contact }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-24 py-24" data-cy="customer-view-contact-details">
      <Field label="Namn" value={contact.name} dataCy="customer-view-contact-name" />
      <Field
        label="Person-/organisationsnummer"
        value={contact.partyNumber}
        dataCy="customer-view-contact-partynumber"
      />
      <Field label="Adress" value={contact.address} dataCy="customer-view-contact-address" />
      <Field label="E-post" value={contact.emails.join(', ')} dataCy="customer-view-contact-email" />
      <Field label="Telefon" value={contact.phoneNumbers.join(', ')} dataCy="customer-view-contact-phone" />
      {contact.username ? (
        <Field label="Användarnamn" value={contact.username} dataCy="customer-view-contact-username" />
      ) : null}
    </div>
  );
};
