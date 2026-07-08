import { CustomerViewFooter } from '@common/components/customer-view/customer-view-footer.component';
import { StakeholderCard, StakeholderCardAction } from '@common/components/stakeholder-card/stakeholder-card.component';
import { appConfig } from '@config/appconfig';
import { Disclosure, FormControl, FormLabel, useConfirm } from '@sk-web-gui/react';
import { useMetadataStore, useSupportStore } from '@stores/index';
import {
  emptyContact,
  ExternalIdType,
  isSupportErrandLocked,
  SupportErrand,
  SupportStakeholderFormModel,
} from '@supportmanagement/services/support-errand-service';
import {
  buildStakeholdersList,
  toStakeholderCardContact,
} from '@supportmanagement/services/support-stakeholder-service';
import { Info, Users } from 'lucide-react';
import { FC, useEffect, useState } from 'react';
import { useFieldArray, useFormContext, UseFormReturn } from 'react-hook-form';

import { ACTIVE_PARTY_STATUSES, KC_ASSET_TYPES } from '../support-errand/tabs/services/support-errand-services-tab';
import { PartyAssetsSection } from './partyassets-section.component';
import { SupportSimplifiedContactForm } from './support-simplified-contact-form.component';

interface SupportContactsProps {
  setUnsaved: (unsaved: boolean) => void;
  update: () => void;
  registeringNewErrand?: boolean;
}

export const SupportContactsComponent: FC<SupportContactsProps> = (props) => {
  const [selectedContact, setSelectedContact] = useState<SupportStakeholderFormModel>();
  const supportErrand = useSupportStore((s) => s.supportErrand);
  const supportMetadata = useMetadataStore((s) => s.supportMetadata);
  const deleteConfirm = useConfirm();
  const updateConfirm = useConfirm();

  const setStakeholderContacts = useSupportStore((s) => s.setStakeholderContacts);
  const stakeholderContacts = useSupportStore((s) => s.stakeholderContacts);
  const setStakeholderCustomers = useSupportStore((s) => s.setStakeholderCustomers);
  const stakeholderCustomers = useSupportStore((s) => s.stakeholderCustomers);

  const { control, setValue, reset }: UseFormReturn<SupportErrand, any, undefined> = useFormContext();

  const errandId = supportErrand?.id;

  useEffect(() => {
    setSelectedContact(undefined);
    if (supportErrand) {
      reset(supportErrand);
    }
    setStakeholderContacts(supportErrand?.contacts ?? []);
    setStakeholderCustomers(supportErrand?.customer ?? []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [errandId]);

  const contactsFieldArray = useFieldArray({
    control,
    keyName: 'arrayId',
    name: 'contacts',
  });

  const { fields: contactsFields } = contactsFieldArray;

  const onRemove = async (c: SupportStakeholderFormModel) => {
    const customer = stakeholderCustomers.filter((cus) => cus.internalId !== c.internalId);
    const contacts = stakeholderContacts.filter((con) => con.internalId !== c.internalId);

    const data = { customer, contacts };
    const stakeholders = buildStakeholdersList(data);

    setValue('stakeholders', stakeholders);
    setValue('contacts', contacts, { shouldDirty: true });
    setValue('customer', customer, { shouldDirty: true });
    setStakeholderContacts(contacts);
    setStakeholderCustomers(customer);
  };

  const onMakeOwner = async (stakeholder: SupportStakeholderFormModel) => {
    stakeholder.role = 'PRIMARY';

    const customer = stakeholderCustomers;
    const contacts = stakeholderContacts.filter((con) => con.internalId !== stakeholder.internalId);
    customer.push(stakeholder);

    setValue('contacts', contacts, { shouldDirty: true });
    setValue('customer', customer, { shouldDirty: true });
    setStakeholderContacts(contacts);
    setStakeholderCustomers(customer);
  };

  const renderContact = (contact: SupportStakeholderFormModel, index: number, header: string) => {
    const locked = isSupportErrandLocked(supportErrand!);
    const migratedContact = contact.parameters?.find((param) => param.key === 'corrected')?.displayName;

    const actions: StakeholderCardAction[] = locked
      ? []
      : [
          {
            label: 'Redigera uppgifter',
            dataCy: `edit-stakeholder-button-${contact.role}-${index}`,
            onClick: () => setSelectedContact(contact),
          },
          {
            label: 'Ta bort',
            dataCy: 'delete-stakeholder-button',
            onClick: () => {
              deleteConfirm
                .showConfirmation(
                  'Ta bort?',
                  `Vill du ta bort denna ${header?.toLowerCase() || 'intressent'}?`,
                  'Ja',
                  'Nej',
                  'info',
                  'info'
                )
                .then((confirmed) => {
                  if (confirmed) {
                    onRemove(contact);
                  }
                });
            },
          },
          ...(contact.role === 'CONTACT' && stakeholderCustomers.length === 0
            ? [
                {
                  label: 'Gör till ärendeägare',
                  dataCy: 'make-stakeholder-owner-button',
                  onClick: () => {
                    updateConfirm
                      .showConfirmation(
                        'Gör till ärendeägare?',
                        'Vill du göra denna ärendeintressent till ärendeägare?',
                        'Ja',
                        'Nej',
                        'info',
                        'info'
                      )
                      .then((confirmed) => {
                        if (confirmed) {
                          onMakeOwner(contact);
                        }
                      });
                  },
                },
              ]
            : []),
        ];

    return (
      <StakeholderCard
        key={`rendered-${contact.internalId}-${contact.role}-${index}`}
        dataCy={`rendered-${contact.role}`}
        header={header}
        headerSuffix={migratedContact}
        contact={toStakeholderCardContact(contact)}
        actions={actions}
        index={index}
        editForm={
          selectedContact && selectedContact.internalId === contact.internalId ? (
            <SupportSimplifiedContactForm
              disabled={locked}
              setUnsaved={props.setUnsaved}
              contact={contact}
              editing={true}
              label={header}
              onSave={(e) => {
                const existingStakeholders = [...stakeholderCustomers, ...stakeholderContacts];
                const matchingIndex = existingStakeholders.findIndex(
                  (stakeholder) => stakeholder.internalId === e.internalId
                );
                if (matchingIndex !== -1) {
                  existingStakeholders[matchingIndex] = e;
                  const newContacts = existingStakeholders.filter((stakeholder) => stakeholder.role !== 'PRIMARY');
                  const newCustomers = existingStakeholders.filter((stakeholder) => stakeholder.role === 'PRIMARY');
                  setValue('stakeholders', existingStakeholders, { shouldDirty: true });
                  setStakeholderContacts(newContacts);
                  setStakeholderCustomers(newCustomers);
                  setValue('contacts', newContacts, { shouldDirty: true });
                  setValue('customer', newCustomers, { shouldDirty: true });
                }
              }}
              onClose={() => setSelectedContact(undefined)}
              id="edit"
            />
          ) : null
        }
        onAddPhone={() => setSelectedContact(contact)}
        onAddEmail={() => setSelectedContact(contact)}
        addDisabled={locked}
        footer={renderCardFooter(contact)}
      />
    );
  };

  const renderCardFooter = (contact: SupportStakeholderFormModel) => {
    const isOwner =
      contact.externalId &&
      supportErrand?.stakeholders?.some((s) => s.role === 'PRIMARY' && s.externalId === contact.externalId);
    if (!isOwner) return null;

    if (appConfig.features.useCustomerView) {
      return (
        <CustomerViewFooter
          partyId={contact.externalId!}
          organizationNumber={
            contact.externalIdType === ExternalIdType.COMPANY ? contact.organizationNumber : undefined
          }
          contact={toStakeholderCardContact(contact)}
          assetTypes={appConfig.features.useServices ? KC_ASSET_TYPES : []}
          activeStatuses={appConfig.features.useServices ? [...ACTIVE_PARTY_STATUSES] : []}
        />
      );
    }
    if (appConfig.features.useServices) {
      return <PartyAssetsSection partyId={contact.externalId!} />;
    }
    return null;
  };

  const addStakeholder = (stakeholder: SupportStakeholderFormModel) => {
    if (stakeholder.role === 'PRIMARY') {
      stakeholderCustomers.push(stakeholder);
      setValue('customer', stakeholderCustomers, { shouldDirty: true });
    } else {
      stakeholderContacts.push(stakeholder);
      setValue('contacts', stakeholderContacts, { shouldDirty: true });
    }
  };

  return (
    <>
      <div className="mt-md">
        <Disclosure variant="alt" initalOpen>
          <Disclosure.Header>
            <Disclosure.Icon icon={<Users />} />
            <Disclosure.Title>Ärendeägare</Disclosure.Title>
            <Disclosure.Button />
          </Disclosure.Header>
          <Disclosure.Content>
            <div data-cy="registered-applicants">
              {stakeholderCustomers.length === 0 && appConfig.features.useMyPages && (
                <div className="flex h-auto w-full gap-12 rounded-[1.6rem] bg-warning-background-100 p-12 mb-[2.5rem] border-1 border-warning-surface-primary">
                  <Info className="text-primary w-20 h-20 shrink-0" />
                  <span className="text-primary text-md leading-[1.8rem] font-normal font-sans break-words flex-1 min-w-0">
                    <p className="mt-0">
                      Om du lägger till ett personnummer här, visas ärendet på den personens Mina sidor.
                    </p>
                    <p className="mt-sm mb-0">Undvik personnummer för VOF-ärenden, t ex anmälningar.</p>
                  </span>
                </div>
              )}
              <div className="flex flex-row gap-12 flex-wrap">
                {stakeholderCustomers.map((stakeholder, idx) => renderContact(stakeholder, idx, 'Ärendeägare'))}
              </div>
              <div className="w-full">
                {stakeholderCustomers.length === 0 ? (
                  <SupportSimplifiedContactForm
                    disabled={isSupportErrandLocked(supportErrand!)}
                    setUnsaved={props.setUnsaved}
                    onSave={(contact) => addStakeholder(contact)}
                    contact={{ ...emptyContact, role: 'PRIMARY' }}
                    editing={false}
                    label="Ärendeägare"
                    id="owner"
                  />
                ) : null}
              </div>
            </div>
          </Disclosure.Content>
        </Disclosure>
      </div>
      <div className="mt-md">
        <Disclosure variant="alt" initalOpen>
          <Disclosure.Header>
            <Disclosure.Icon icon={<Users />} />
            <Disclosure.Title>Övriga parter</Disclosure.Title>
            <Disclosure.Button />
          </Disclosure.Header>
          <Disclosure.Content>
            <div data-cy="registered-contacts">
              <div className="w-full mt-md">
                {appConfig.features.useMyPages && (
                  <div className="pb-[2.5rem]">
                    <span className="text-dark-secondary">
                      Lägg till andra personer eller organisationer som är berörda av ärendet. Övriga parter kan inte se
                      ärendet på Mina sidor.
                    </span>
                  </div>
                )}
                <SupportSimplifiedContactForm
                  disabled={isSupportErrandLocked(supportErrand!)}
                  setUnsaved={props.setUnsaved}
                  contact={{ ...emptyContact, role: 'CONTACT' }}
                  editing={false}
                  onSave={(contact) => addStakeholder(contact)}
                  label="Övrig part"
                  id="person"
                />
              </div>

              {contactsFields.length !== 0 ? (
                <FormControl className="mt-40 w-full">
                  <FormLabel>Tillagda parter</FormLabel>
                  <div className="flex flex-row gap-12 flex-wrap">
                    {stakeholderContacts.map((stakeholder, idx) => {
                      const role = supportMetadata?.roles?.find((r) => r.name === stakeholder.role)?.displayName;
                      return role ? renderContact(stakeholder, idx, role) : null;
                    })}
                  </div>
                </FormControl>
              ) : null}
            </div>
          </Disclosure.Content>
        </Disclosure>
      </div>
    </>
  );
};
