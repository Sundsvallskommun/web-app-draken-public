'use client';

import { StakeholderCardContact } from '@common/components/stakeholder-card/stakeholder-card.component';
import { CaseStatusResponse } from '@common/services/casestatus-service';
import { Alert, Modal, Tabs } from '@sk-web-gui/react';
import { FC } from 'react';

import { CustomerViewContactDetails } from './customer-view-contact-details.component';
import { CustomerViewErrands } from './customer-view-errands.component';
import { CustomerViewServices } from './customer-view-services.component';

interface CustomerViewModalProps {
  show: boolean;
  onClose: () => void;
  contact: StakeholderCardContact;
  partyId: string;
  organizationNumber?: string;
  sourceErrandId?: string;
  assetTypes?: string[];
  onOpenMessage?: (errand: CaseStatusResponse) => void;
}

export const CustomerViewModal: FC<CustomerViewModalProps> = ({
  show,
  onClose,
  contact,
  partyId,
  organizationNumber,
  sourceErrandId,
  assetTypes = [],
  onOpenMessage,
}) => {
  return (
    <Modal
      show={show}
      onClose={onClose}
      label="Kundbild"
      className="w-[120rem] max-w-[calc(100vw-4rem)]"
      data-cy="customer-view-modal"
    >
      <Modal.Content>
        <h1 className="text-h2-md my-0" data-cy="customer-view-name">
          {contact.name}
        </h1>
        <Alert type="info" className="mt-16 w-full" data-cy="customer-view-description">
          <Alert.Icon />
          <Alert.Content>
            <Alert.Content.Description>
              Kundbilden visar en samlad bild av den valda personen: kontaktuppgifter, ärenden samt beslut och dokument.
              Allt innehåll och all sökning nedan avser enbart denna person.
            </Alert.Content.Description>
          </Alert.Content>
        </Alert>
        {show ? (
          <Tabs size="sm" className="mt-16">
            <Tabs.Item>
              <Tabs.Button data-cy="customer-view-tab-contact">Kontaktuppgifter</Tabs.Button>
              <Tabs.Content>
                <CustomerViewContactDetails contact={contact} />
              </Tabs.Content>
            </Tabs.Item>
            <Tabs.Item>
              <Tabs.Button data-cy="customer-view-tab-errands">Ärenden</Tabs.Button>
              <Tabs.Content>
                <CustomerViewErrands
                  partyId={partyId}
                  organizationNumber={organizationNumber}
                  sourceErrandId={sourceErrandId}
                  onOpenMessage={
                    onOpenMessage
                      ? (errand) => {
                          onClose();
                          onOpenMessage(errand);
                        }
                      : undefined
                  }
                />
              </Tabs.Content>
            </Tabs.Item>
            {assetTypes.length > 0 ? (
              <Tabs.Item>
                <Tabs.Button data-cy="customer-view-tab-services">Beslut och dokument</Tabs.Button>
                <Tabs.Content>
                  <CustomerViewServices partyId={partyId} assetTypes={assetTypes} />
                </Tabs.Content>
              </Tabs.Item>
            ) : null}
          </Tabs>
        ) : null}
      </Modal.Content>
    </Modal>
  );
};
