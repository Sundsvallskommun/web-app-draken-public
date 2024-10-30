import { useAppContext } from '@common/contexts/app.context';
import { User } from '@common/interfaces/user';
import { isLOP } from '@common/services/application-service';
import {
  Avatar,
  Button,
  Disclosure,
  FormControl,
  FormLabel,
  LucideIcon,
  useConfirm,
  useSnackbar,
} from '@sk-web-gui/react';
import { SupportAttachment } from '@supportmanagement/services/support-attachment-service';
import {
  ExternalIdType,
  SupportErrand,
  SupportStakeholderFormModel,
  SupportStakeholderRole,
  emptyContact,
  isSupportErrandLocked,
} from '@supportmanagement/services/support-errand-service';
import { SupportMetadata } from '@supportmanagement/services/support-metadata-service';
import { buildStakeholdersList } from '@supportmanagement/services/support-stakeholder-service';
import { useEffect, useState } from 'react';
import { UseFormReturn, useFieldArray, useFormContext } from 'react-hook-form';
import { SupportSimplifiedContactForm } from './support-simplified-contact-form.component';

interface SupportContactsProps {
  setUnsaved: (unsaved: boolean) => void;
  update: () => void;
  registeringNewErrand?: boolean;
}

export const SupportContactsComponent: React.FC<SupportContactsProps> = (props) => {
  const [addContact, setAddContact] = useState(false);
  const [addApplicant, setAddApplicant] = useState(false);
  const [selectedContact, setSelectedContact] = useState<SupportStakeholderFormModel>();
  const {
    supportErrand,
    setSupportErrand,
    municipalityId,
    user,
  }: {
    user: User;
    municipalityId: string;
    supportErrand: SupportErrand;
    setSupportErrand: any;
    supportMetadata: SupportMetadata;
    supportAttachments: SupportAttachment[];
  } = useAppContext();
  const deleteConfirm = useConfirm();
  const updateConfirm = useConfirm();
  const toastMessage = useSnackbar();

  const { setStakeholderContacts, stakeholderContacts, setStakeholderCustomers, stakeholderCustomers } =
    useAppContext();
  const avatarColorArray = ['vattjom', 'juniskar', 'gronsta', 'bjornstigen'];

  useEffect(() => {
    setAddApplicant(false);
    setAddContact(false);
    setSelectedContact(undefined);
    reset(supportErrand);
  }, [user, supportErrand]);

  useEffect(() => {
    setStakeholderContacts(supportErrand.contacts);
    setStakeholderCustomers(supportErrand.customer);
    console.log(supportErrand.contacts);
  }, []);

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    trigger,
    reset,
    getValues,
    formState,
    formState: { errors },
  }: UseFormReturn<SupportErrand, any, undefined> = useFormContext();

  const customerFieldArray = useFieldArray({
    control,
    keyName: 'arrayId',
    name: 'customer',
  });

  const {
    fields: customerFields,
    append: appendCustomerItem,
    remove: removeCustomerItem,
    update: updateCustomerItem,
  } = customerFieldArray;

  const contactsFieldArray = useFieldArray({
    control,
    keyName: 'arrayId',
    name: 'contacts',
  });

  const {
    fields: contactsFields,
    append: appendContactItem,
    remove: removeContactItem,
    update: updateContactItem,
  } = contactsFieldArray;

  const allowsOrganization = !isLOP();

  const onRemove = async (c: SupportStakeholderFormModel) => {
    const customer = stakeholderCustomers.filter((cus) => JSON.stringify(cus) !== JSON.stringify(c));
    const contacts = stakeholderContacts.filter((con) => JSON.stringify(con) !== JSON.stringify(c));

    const data = { customer, contacts };
    const stakeholders = buildStakeholdersList(data);

    setValue('stakeholders', stakeholders);
    setValue('contacts', contacts, { shouldDirty: true });
    setValue('customer', customer, { shouldDirty: true });
    setStakeholderContacts(contacts);
    setStakeholderCustomers(customer);
  };

  const onMakeOwner = async (stakeholder: SupportStakeholderFormModel) => {
    stakeholder.role = SupportStakeholderRole.PRIMARY;

    const customer = stakeholderCustomers;
    const contacts = stakeholderContacts.filter((con) => con.internalId !== stakeholder.internalId);
    customer.push(stakeholder);

    setValue('contacts', contacts, { shouldDirty: true });
    setValue('customer', customer, { shouldDirty: true });
    setStakeholderContacts(contacts);
    setStakeholderCustomers(customer);
  };

  const renderContact = (contact: SupportStakeholderFormModel, index, header) => {
    return (
      <div
        key={`rendered-${contact.internalId}-${contact.role}-${index}`}
        data-cy={`rendered-${contact.role}`}
        className="w-full bg-background-content border rounded-button"
      >
        {JSON.stringify(selectedContact) === JSON.stringify(contact) ? (
          <SupportSimplifiedContactForm
            disabled={isSupportErrandLocked(supportErrand)}
            setUnsaved={props.setUnsaved}
            contact={contact}
            editing={true}
            label={header}
            onSave={(e) => {
              console.log('e: ', e);
              if (e.role === SupportStakeholderRole.PRIMARY) {
                let stakeholderIndex = stakeholderCustomers.findIndex((custom) => custom.internalId === e.internalId);

                if (JSON.stringify(stakeholderCustomers[stakeholderIndex]) !== JSON.stringify(e)) {
                  stakeholderCustomers[stakeholderIndex] = e;
                  setValue('customer', stakeholderCustomers, { shouldDirty: true });
                }
              } else if (e.role === SupportStakeholderRole.CONTACT) {
                console.log('stakeholderContacts: ', stakeholderContacts.internalId);

                let stakeholderIndex = stakeholderContacts.findIndex((contact) => contact.internalId === e.internalId);
                console.log('stakeholderContacts: ', stakeholderIndex);

                if (JSON.stringify(stakeholderContacts[stakeholderIndex]) !== JSON.stringify(e)) {
                  stakeholderContacts[stakeholderIndex] = e;
                  setValue('contacts', stakeholderContacts, { shouldDirty: true });
                }
              }
            }}
            onClose={() => setSelectedContact(undefined)}
            allowOrganization={allowsOrganization}
            id="edit"
          />
        ) : null}

        <div className="bg-vattjom-background-200 px-16 py-8 flex justify-between rounded-t-button">
          <div className="font-bold text-small">{header}</div>

          {!isSupportErrandLocked(supportErrand) && (
            <div className="flex flex-wrap gap-16 text-small">
              <Button
                disabled={isSupportErrandLocked(supportErrand)}
                data-cy="edit-stakeholder-button"
                variant="link"
                className="text-body"
                onClick={() => {
                  setSelectedContact(contact);
                }}
              >
                Redigera uppgifter
              </Button>

              <Button
                disabled={isSupportErrandLocked(supportErrand)}
                data-cy="delete-stakeholder-button"
                variant="link"
                className="text-body"
                onClick={() => {
                  return deleteConfirm
                    .showConfirmation(
                      'Ta bort?',
                      `Vill du ta bort denna ${header.toLowerCase()}?`,
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
                }}
              >
                Ta bort
              </Button>

              {contact.role === SupportStakeholderRole.CONTACT && stakeholderCustomers.length === 0 ? (
                <Button
                  disabled={isSupportErrandLocked(supportErrand)}
                  data-cy="make-stakeholder-owner-button"
                  variant="link"
                  className="text-body"
                  onClick={() => {
                    return updateConfirm
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
                  }}
                >
                  Gör till ärendeägare
                </Button>
              ) : null}
            </div>
          )}
        </div>

        <div className="md:flex md:gap-24 px-16 py-12">
          <div className="md:w-1/3 flex gap-8 items-center break-all">
            <Avatar
              rounded
              color={(avatarColorArray[index % 4] as 'vattjom') || 'juniskar' || 'gronsta' || 'bjornstigen'}
              size={'sm'}
              initials={contact.firstName?.[0] || contact.organizationName?.[0] || '?'}
            />
            <div>
              <div>
                {contact.externalIdType === ExternalIdType.COMPANY ? (
                  <>
                    <p className="my-xs mt-0 text-small" data-cy={`stakeholder-name`}>
                      <strong>{`${contact.organizationName ? contact.organizationName : ''}`}</strong>
                    </p>
                    <p
                      className={`my-xs mt-0 flex flex-col text-small ${
                        contact.externalId || contact.organizationNumber ? null : 'text-dark-disabled'
                      }`}
                      data-cy={`stakeholder-ssn`}
                    >
                      {contact.externalId || contact.organizationNumber || '(organisationsnummer saknas)'}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="my-xs mt-0 text-small" data-cy={`stakeholder-name`}>
                      <strong>{`${contact.firstName ? contact.firstName : ''} ${
                        contact.lastName ? contact.lastName : ''
                      }`}</strong>
                    </p>
                    <p
                      className={`my-xs mt-0 flex flex-col text-small ${
                        contact.personNumber ? null : 'text-dark-disabled'
                      }`}
                      data-cy={`stakeholder-ssn`}
                    >
                      {contact.personNumber || '(personnummer saknas)'}
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="md:w-1/3 md:mt-0 mt-md break-all">
            <p
              className={`my-xs mt-0 flex flex-col text-small ${
                contact.address || contact.zipCode || contact.city ? null : 'text-dark-disabled'
              }`}
              data-cy={`stakeholder-adress`}
            >
              {contact.address || contact.zipCode || contact.city
                ? `${contact.address} ${contact.zipCode} ${contact.city || ''}`
                : '(adress saknas)'}
            </p>
          </div>
          <div className="md:w-1/3 md:mt-0 mt-md">
            <div data-cy={`stakeholder-phone`} className="text-small">
              {contact.phoneNumbers?.map((n) => n.value).join(', ') || (
                <Button
                  disabled={isSupportErrandLocked(supportErrand)}
                  color="vattjom"
                  variant="link"
                  onClick={() => {
                    setSelectedContact(contact);
                  }}
                >
                  Lägg till telefonnummer
                </Button>
              )}
            </div>

            <div>
              <div data-cy={`stakeholder-email`} className="text-small">
                {contact.emails?.map((n) => n.value).join(', ') || (
                  <Button
                    disabled={isSupportErrandLocked(supportErrand)}
                    color="vattjom"
                    variant="link"
                    onClick={() => {
                      setSelectedContact(contact);
                    }}
                  >
                    Lägg till e-post
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const addStakeholder = (stakeholder) => {
    if (stakeholder.role === SupportStakeholderRole.PRIMARY) {
      stakeholderCustomers.push(stakeholder);
      setValue('customer', stakeholderCustomers, { shouldDirty: true });
    } else if (stakeholder.role === SupportStakeholderRole.CONTACT) {
      stakeholderContacts.push(stakeholder);
      setValue('contacts', stakeholderContacts, { shouldDirty: true });
    }
    console.log('stakeholderContacts: ', stakeholderContacts);
  };

  return (
    <>
      <div className="mt-md">
        <Disclosure variant="alt" icon={<LucideIcon name="users" />} header="Ärendeägare" initalOpen={true}>
          <div data-cy="registered-applicants">
            <div className="flex flex-row gap-12 flex-wrap">
              {stakeholderCustomers.map((stakeholder, idx) => renderContact(stakeholder, idx, 'Ärendeägare'))}
            </div>
            <div className="w-full">
              {stakeholderCustomers.length === 0 ? (
                <SupportSimplifiedContactForm
                  disabled={isSupportErrandLocked(supportErrand)}
                  allowOrganization={allowsOrganization}
                  setUnsaved={props.setUnsaved}
                  onSave={(contact) => addStakeholder(contact)}
                  contact={{ ...emptyContact, role: SupportStakeholderRole.PRIMARY }}
                  editing={false}
                  label="Ärendeägare"
                  id="owner"
                />
              ) : null}
            </div>
          </div>
        </Disclosure>
      </div>
      <div className="mt-md">
        <Disclosure variant="alt" icon={<LucideIcon name="users" />} header="Övriga parter" initalOpen={true}>
          <div data-cy="registered-contacts">
            <div className="w-full mt-md">
              <SupportSimplifiedContactForm
                disabled={isSupportErrandLocked(supportErrand)}
                allowOrganization={allowsOrganization}
                setUnsaved={props.setUnsaved}
                contact={{ ...emptyContact, role: SupportStakeholderRole.CONTACT }}
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
                  {stakeholderContacts.map((stakeholder, idx) => renderContact(stakeholder, idx, 'Övrig part'))}
                </div>
              </FormControl>
            ) : null}
          </div>
        </Disclosure>
      </div>
    </>
  );
};
