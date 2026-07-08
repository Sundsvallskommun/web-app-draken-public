'use client';

import { StakeholderCardContact } from '@common/components/stakeholder-card/stakeholder-card.component';
import { Modal, Tabs } from '@sk-web-gui/react';
import { FC } from 'react';

import { CustomerViewContactDetails } from './customer-view-contact-details.component';

interface CustomerViewModalProps {
  show: boolean;
  onClose: () => void;
  contact: StakeholderCardContact;
}

export const CustomerViewModal: FC<CustomerViewModalProps> = ({ show, onClose, contact }) => {
  return (
    <Modal show={show} onClose={onClose} label="Kundbild" className="w-[96rem]" data-cy="customer-view-modal">
      <Modal.Content>
        <h1 className="text-h2-md my-0" data-cy="customer-view-name">
          {contact.name}
        </h1>
        <Tabs size="sm" className="mt-16">
          <Tabs.Item>
            <Tabs.Button data-cy="customer-view-tab-contact">Kontaktuppgifter</Tabs.Button>
            <Tabs.Content>
              <CustomerViewContactDetails contact={contact} />
            </Tabs.Content>
          </Tabs.Item>
        </Tabs>
      </Modal.Content>
    </Modal>
  );
};
