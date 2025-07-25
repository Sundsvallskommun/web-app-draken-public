import { useAppContext } from '@common/contexts/app.context';
import { User } from '@common/interfaces/user';
import LucideIcon from '@sk-web-gui/lucide-icon';
import { Avatar, Button, Disclosure, FormControl, FormLabel, useConfirm, useSnackbar } from '@sk-web-gui/react';
import { SupportAttachment } from '@supportmanagement/services/support-attachment-service';
import {
  ExternalIdType,
  SupportErrand,
  SupportStakeholderFormModel,
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
  const [selectedContact, setSelectedContact] = useState<SupportStakeholderFormModel>();
  const {
    supportErrand,
    user,
    supportMetadata,
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
    setSelectedContact(undefined);
    reset(supportErrand);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, supportErrand]);

  useEffect(() => {
    setStakeholderContacts(supportErrand.contacts);
    setStakeholderCustomers(supportErrand.customer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const {
    control,
    setValue,
    reset,
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

  const renderContact = (contact: SupportStakeholderFormModel, index, header) => {
    const administrationName =
      contact.administrationName ||
      contact.parameters?.find((param) => param.key === 'administrationName')?.values[0] ||
      null;
    const title = contact.title || contact.parameters?.find((param) => param.key === 'title')?.values[0] || null;
    const referenceNumber =
      contact.referenceNumber ||
      contact.parameters?.find((param) => param.key === 'referenceNumber')?.values[0] ||
      null;
    const department =
      contact.department || contact.parameters?.find((param) => param.key === 'department')?.values[0] || null;
    const username =
      contact.username ||
      contact.parameters?.find((param) => param.key === 'username' || param.key === 'userId')?.values[0] ||
      null;
    return (
      <div
        key={`rendered-${contact.internalId}-${contact.role}-${index}`}
        data-cy={`rendered-${contact.role}`}
        className="w-full bg-background-content border rounded-button"
      >
        {selectedContact && selectedContact.internalId === contact.internalId ? (
          <SupportSimplifiedContactForm
            disabled={isSupportErrandLocked(supportErrand)}
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
        ) : null}

        <div className="bg-vattjom-background-200 px-16 py-8 flex justify-between rounded-t-button">
          <div className="font-bold text-small">{header}</div>

          {!isSupportErrandLocked(supportErrand) && (
            <div className="flex flex-wrap gap-16 text-small">
              <Button
                disabled={isSupportErrandLocked(supportErrand)}
                data-cy={`edit-stakeholder-button-${contact.role}-${index}`}
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
                }}
              >
                Ta bort
              </Button>

              {contact.role === 'CONTACT' && stakeholderCustomers.length === 0 ? (
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
        {/* Left side of errand Disclosure */}
        <div className="md:flex md:gap-24 px-16 py-12">
          <div className={`md:w-1/3 flex gap-8 break-all ${administrationName ? `items-start` : `items-center`}`}>
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
                    <p className={`my-xs mt-0 flex flex-col text-small`} data-cy={`stakeholder-title`}>
                      {title}
                    </p>
                    <p className={`my-xs mt-0 flex flex-col text-small`} data-cy={`stakeholder-administrationName`}>
                      {administrationName}
                    </p>
                    <p className={`my-xs mt-0 flex flex-col text-small`} data-cy={`stakeholder-department`}>
                      {department}
                    </p>
                    <p className={`my-xs mt-0 flex flex-col text-small`} data-cy={`stakeholder-referenceNumber`}>
                      {referenceNumber}
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
          {/* Middle of errand Disclosure */}
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
          {/* Right side of errand Disclosure */}
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
              {username ? (
                <div className="text-small my-xs mt-0" data-cy={`stakeholder-username`}>
                  <p className="flex flex-col">{username}</p>
                </div>
              ) : null}
              <div></div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const addStakeholder = (stakeholder) => {
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
        <Disclosure variant="alt" icon={<LucideIcon name="users" />} header="Ärendeägare" initalOpen={true}>
          <div data-cy="registered-applicants">
            <div className="flex flex-row gap-12 flex-wrap">
              {stakeholderCustomers.map((stakeholder, idx) => renderContact(stakeholder, idx, 'Ärendeägare'))}
            </div>
            <div className="w-full">
              {stakeholderCustomers.length === 0 ? (
                <SupportSimplifiedContactForm
                  disabled={isSupportErrandLocked(supportErrand)}
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
        </Disclosure>
      </div>
      <div className="mt-md">
        <Disclosure variant="alt" icon={<LucideIcon name="users" />} header="Övriga parter" initalOpen={true}>
          <div data-cy="registered-contacts">
            <div className="w-full mt-md">
              <SupportSimplifiedContactForm
                disabled={isSupportErrandLocked(supportErrand)}
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
        </Disclosure>
      </div>
    </>
  );
};
