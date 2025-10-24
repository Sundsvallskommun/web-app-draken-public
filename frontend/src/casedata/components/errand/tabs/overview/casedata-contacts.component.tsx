import {
  createEmptyContact,
  SimplifiedContactForm,
} from '@casedata/components/errand/forms/simplified-contact-form.component';
import { Channels } from '@casedata/interfaces/channels';
import { IErrand } from '@casedata/interfaces/errand';
import { MEXRelation, PTRelation, Role } from '@casedata/interfaces/role';
import { CasedataOwnerOrContact } from '@casedata/interfaces/stakeholder';
import { isErrandLocked } from '@casedata/services/casedata-errand-service';
import { getStakeholderRelation } from '@casedata/services/casedata-stakeholder-service';
import { useAppContext } from '@common/contexts/app.context';
import { appConfig } from '@config/appconfig';
import LucideIcon from '@sk-web-gui/lucide-icon';
import { Avatar, Button, Disclosure, FormControl, FormLabel, useConfirm } from '@sk-web-gui/react';
import { useEffect, useState } from 'react';
import { useFieldArray, useFormContext, UseFormReturn } from 'react-hook-form';
import { v4 as uuidv4 } from 'uuid';

interface CasedataContactsProps {
  setUnsaved: (unsaved: boolean) => void;
  update: () => void;
}

export const CasedataContactsComponent: React.FC<CasedataContactsProps> = (props) => {
  const [addContact, setAddContact] = useState(false);
  const [selectedContact, setSelectedContact] = useState<CasedataOwnerOrContact>();
  const { errand } = useAppContext();
  const deleteConfirm = useConfirm();
  const updateConfirm = useConfirm();
  const avatarColorArray = ['vattjom', 'juniskar', 'gronsta', 'bjornstigen'];
  const isStakeholderModificationLocked = (stakeholder: CasedataOwnerOrContact) =>
    isErrandLocked(errand) ||
    (errand?.channel === Channels.ESERVICE_KATLA && stakeholder.roles.includes(Role.APPLICANT));

  useEffect(() => {
    setAddContact(errand.status?.statusType !== 'Ärende avslutat');
    setSelectedContact(undefined);
  }, [errand]);

  const {
    control,
    setValue,
    getValues,
    reset,
    watch,
    formState: { errors },
  }: UseFormReturn<IErrand, any, undefined> = useFormContext();

  const stakeholdersFieldArray = useFieldArray({
    control,
    keyName: 'arrayId',
    name: 'stakeholders',
  });

  const {
    fields: stakeholdersFields,
    append: appendStakeholderItem,
    remove: removeStakeholderItem,
    update: updateStakeholderItem,
  } = stakeholdersFieldArray;

  useEffect(() => {
    reset(errand);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [errand]);

  const onRemoveContact = (stakeholderId: string) => {
    const currentStakeholders = getValues('stakeholders');
    const updatedStakeholders = currentStakeholders.map((s) => (s.id === stakeholderId ? { ...s, removed: true } : s));
    setValue('stakeholders', updatedStakeholders, {
      shouldDirty: true,
      shouldValidate: true,
    });
    props.update();
  };

  const onMakeOwner = (stakeholder: CasedataOwnerOrContact): void => {
    const updatedStakeholder: CasedataOwnerOrContact = {
      ...stakeholder,
      roles: stakeholder.roles.filter((role) => role !== Role.CONTACT_PERSON).concat(Role.APPLICANT),
      newRole: Role.APPLICANT,
    };
    const index = stakeholdersFields.findIndex((s) => s.id === stakeholder.id);
    if (index === -1) return;
    const updatedStakeholders = [...getValues('stakeholders')];
    updatedStakeholders[index] = updatedStakeholder;
    setValue('stakeholders', updatedStakeholders, {
      shouldDirty: true,
      shouldValidate: true,
    });
    props.update();
  };

  const isMatchingSelectedContact = (a: CasedataOwnerOrContact, b: CasedataOwnerOrContact) => {
    if (a.id && b.id) return a.id === b.id;
    return !a.id && !b.id && a.clientId && b.clientId && a.clientId === b.clientId;
  };

  const renderContact = (contact: CasedataOwnerOrContact, index: number, label: string) => {
    if (contact.removed) return null;
    const stakeholderModificationLocked = isStakeholderModificationLocked(contact);

    return (
      <div className="w-full" key={`rendered-${contact.clientId ?? contact.id ?? index}`}>
        {selectedContact && isMatchingSelectedContact(selectedContact, contact) && (
          <SimplifiedContactForm
            key={`form-${contact.clientId ?? contact.id ?? index}`}
            disabled={isErrandLocked(errand)}
            setUnsaved={props.setUnsaved}
            contact={contact}
            label={`${label.toLowerCase()}`}
            editing={true}
            onSave={(e) => {
              let contactWithId = {
                ...e,
                clientId: e.clientId ?? uuidv4(),
              };
              if (stakeholdersFields.some((x) => x.clientId === contactWithId.clientId && x.id !== contactWithId.id)) {
                contactWithId.clientId = uuidv4();
              }
              const matchingIndex = stakeholdersFields.findIndex((stakeholder) => {
                if (contactWithId.id && stakeholder.id) return contactWithId.id === stakeholder.id;
                if (!contactWithId.id && stakeholder.clientId && contactWithId.clientId)
                  return stakeholder.clientId === contactWithId.clientId;
                return false;
              });

              if (matchingIndex !== -1) {
                const updated = { ...contactWithId };
                if (updated.id) delete updated.clientId;
                updateStakeholderItem(matchingIndex, updated);
              }
              props.setUnsaved(true);
              setSelectedContact(undefined);
            }}
            onClose={() => setSelectedContact(undefined)}
            id="edit"
          />
        )}

        <div
          key={`rendered-${contact.id}-${contact.roles[0]}-${index}`}
          data-cy={`rendered-${contact.roles[0]}`}
          className="bg-background-content border rounded-button "
        >
          <div className="bg-vattjom-background-200 px-16 py-8 flex justify-between rounded-t-button">
            <div className="font-bold text-small">
              {getStakeholderRelation(contact)
                ? MEXRelation[getStakeholderRelation(contact)] || PTRelation[getStakeholderRelation(contact)]
                : label}
            </div>
            <div className="flex flex-wrap gap-16 text-small">
              <Button
                disabled={isErrandLocked(errand)}
                data-cy="edit-stakeholder-button"
                variant="link"
                className="text-body"
                onClick={() => {
                  setSelectedContact(contact);
                }}
              >
                Redigera uppgifter
              </Button>
              {!stakeholderModificationLocked && (
                <Button
                  data-cy="delete-stakeholder-button"
                  variant="link"
                  className="text-body"
                  onClick={() => {
                    return deleteConfirm
                      .showConfirmation(
                        'Ta bort?',
                        `Vill du ta bort denna ${label?.toLowerCase() || 'intressent'}?`,
                        'Ja',
                        'Nej',
                        'info',
                        'info'
                      )
                      .then((confirmed) => {
                        if (confirmed) {
                          onRemoveContact(contact.id);
                        }
                      });
                  }}
                >
                  Ta bort
                </Button>
              )}

              {!contact.roles.includes(Role.APPLICANT) &&
              !stakeholdersFields.some((s) => s.roles.includes(Role.APPLICANT)) ? (
                <Button
                  disabled={stakeholderModificationLocked}
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
          </div>
          <div className="md:flex md:gap-24 px-16 py-12">
            <div className="md:w-1/3 flex gap-8 items-center break-all">
              <Avatar
                rounded
                color={(avatarColorArray[index % 4] as 'vattjom') || 'juniskar' || 'gronsta' || 'bjornstigen'}
                size={'sm'}
                initials={contact.stakeholderType === 'PERSON' ? contact.firstName[0] : contact.organizationName[0]}
              />
              <div>
                {contact.stakeholderType === 'PERSON' && (contact.firstName || contact.lastName) ? (
                  <p className="my-xs mt-0 text-small" data-cy={`stakeholder-name`}>
                    <strong>{`${contact.firstName} ${contact.lastName}`}</strong>
                  </p>
                ) : contact.stakeholderType === 'ORGANIZATION' && contact.organizationName ? (
                  <p className="my-xs mt-0 text-small" data-cy={`stakeholder-name`}>
                    <strong>{`${contact.organizationName}`}</strong>
                  </p>
                ) : null}

                {contact.stakeholderType === 'PERSON' && contact.personalNumber ? (
                  <p className="my-xs mt-0 flex flex-col text-small" data-cy={`stakeholder-ssn`}>
                    {contact.personalNumber}
                  </p>
                ) : contact.stakeholderType === 'ORGANIZATION' && contact.organizationNumber ? (
                  <p className="my-xs mt-0 flex flex-col text-small" data-cy={`stakeholder-ssn`}>
                    {contact.organizationNumber}
                  </p>
                ) : (
                  <p className="my-xs mt-0 flex flex-col text-small text-dark-disabled" data-cy={`stakeholder-ssn`}>
                    (person/orgnummer saknas)
                  </p>
                )}
              </div>
            </div>
            <div className="md:w-1/3 md:mt-0 mt-md break-all">
              {contact.street || contact.zip || contact.city ? (
                <p className="my-xs mt-0 text-small" data-cy={`stakeholder-adress`}>
                  {`${contact.street} ${contact.zip} ${contact.city}`}
                </p>
              ) : (
                <p className="my-xs mt-0 text-small text-dark-disabled">(adress saknas)</p>
              )}
            </div>
            <div className="md:w-1/3 md:mt-0 mt-md text-small">
              <p data-cy={`stakeholder-phone`}>
                {contact.phoneNumbers?.map((n) => n.value).join(', ') || (
                  <Button
                    disabled={isErrandLocked(errand)}
                    color="vattjom"
                    variant="link"
                    onClick={() => {
                      setSelectedContact(contact);
                    }}
                  >
                    Lägg till telefonummer
                  </Button>
                )}
              </p>
              <p data-cy={`stakeholder-phone`}>
                {contact.emails?.map((n) => n.value).join(', ') || (
                  <Button
                    disabled={isErrandLocked(errand)}
                    color="vattjom"
                    variant="link"
                    onClick={() => {
                      setSelectedContact(contact);
                    }}
                  >
                    Lägg till e-post
                  </Button>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const watchedStakeholders = watch('stakeholders');

  return (
    <>
      <Disclosure variant="alt" header="Ärendeägare" icon={<LucideIcon name="user" />} initalOpen={true}>
        <div data-cy="registered-applicants" className="my-lg px-0 pt-0">
          <div className="w-full">
            {watchedStakeholders?.filter((s) => s.roles.includes(Role.APPLICANT) && !s.removed).length === 0 ? (
              <>
                {appConfig.features.useMyPages && (
                  <div className="flex h-auto w-full gap-12 rounded-[1.6rem] bg-warning-background-100 p-12 mb-[2.5rem] border-1 border-warning-surface-primary">
                    <LucideIcon color="primary" name="info" className="w-20 h-20 shrink-0" />
                    <span className="text-primary text-md leading-[1.8rem] font-normal font-sans break-words flex-1 min-w-0">
                      <p className="mt-0">
                        Om du lägger till ett personnummer här, visas ärendet på den personens Mina sidor.
                      </p>
                    </span>
                  </div>
                )}
                <SimplifiedContactForm
                  allowOrganization={appConfig.features.useOrganizationStakeholders}
                  disabled={isErrandLocked(errand)}
                  setUnsaved={props.setUnsaved}
                  contact={createEmptyContact(Role.APPLICANT)}
                  onSave={(e) => {
                    if (!e.clientId) {
                      e.clientId = uuidv4();
                    }
                    appendStakeholderItem(e);
                  }}
                  label="Ärendeägare"
                  id="owner"
                />
              </>
            ) : null}
          </div>
          <div className="flex flex-row gap-md flex-wrap mt-20">
            {stakeholdersFields
              .filter((s) => s.roles.includes(Role.APPLICANT) && !s.removed)
              .map((caseData, idx) => renderContact(caseData, idx, 'Ärendeägare'))}
          </div>
        </div>
      </Disclosure>

      <Disclosure variant="alt" header="Övriga parter" icon={<LucideIcon name="user" />} initalOpen={true}>
        <div data-cy="registered-contacts" className="my-lg px-0 pt-0">
          {addContact && (
            <div className="w-full mt-md">
              {appConfig.features.useMyPages && (
                <div className="pb-[2.5rem]">
                  <span className="text-dark-secondary">
                    Lägg till andra personer eller organisationer som är berörda av ärendet. Övriga parter kan inte se
                    ärendet på Mina sidor.
                  </span>
                </div>
              )}
              <SimplifiedContactForm
                key={Math.random()}
                allowOrganization={appConfig.features.useOrganizationStakeholders}
                disabled={isErrandLocked(errand)}
                setUnsaved={props.setUnsaved}
                contact={createEmptyContact(Role.CONTACT_PERSON)}
                onSave={(savedContact) => {
                  if (!savedContact.clientId) {
                    savedContact.clientId = uuidv4();
                  }
                  appendStakeholderItem(savedContact);
                }}
                label="Övrig part"
                id="person"
              />
            </div>
          )}
          {stakeholdersFields.filter(
            (s) => !s.removed && !s.roles.includes(Role.APPLICANT) && !s.roles.includes(Role.ADMINISTRATOR)
          ).length > 0 && (
            <FormControl className="mt-40 w-full">
              <FormLabel>Tillagda parter</FormLabel>
              <div className="flex flex-col gap-md">
                {stakeholdersFields
                  .filter(
                    (s) => !s.removed && !s.roles.includes(Role.APPLICANT) && !s.roles.includes(Role.ADMINISTRATOR)
                  )
                  .map((stakeholder, idx) => {
                    return (
                      <div key={`stakeholder-${stakeholder.clientId ?? stakeholder.id ?? idx}`}>
                        {renderContact(stakeholder, idx, 'Kontaktperson')}
                      </div>
                    );
                  })}
              </div>
            </FormControl>
          )}
        </div>
      </Disclosure>
    </>
  );
};
