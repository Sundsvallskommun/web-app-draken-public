import {
  createEmptyContact,
  SimplifiedContactForm,
} from '@casedata/components/errand/forms/simplified-contact-form.component';
import { Channels } from '@casedata/interfaces/channels';
import { IErrand } from '@casedata/interfaces/errand';
import { MEXRelation, PTRelation, Role } from '@casedata/interfaces/role';
import { CasedataOwnerOrContact } from '@casedata/interfaces/stakeholder';
import { isErrandLocked } from '@casedata/services/casedata-errand-service';
import { getStakeholderRelation, toStakeholderCardContact } from '@casedata/services/casedata-stakeholder-service';
import { StakeholderCard, StakeholderCardAction } from '@common/components/stakeholder-card/stakeholder-card.component';
import { appConfig } from '@config/appconfig';
import { Disclosure, FormControl, FormLabel, useConfirm } from '@sk-web-gui/react';
import { useCasedataStore } from '@stores/index';
import { Info, User, Users } from 'lucide-react';
import { FC, useEffect, useState } from 'react';
import { useFieldArray, useFormContext, UseFormReturn } from 'react-hook-form';
import { v4 as uuidv4 } from 'uuid';

interface CasedataContactsProps {
  setUnsaved: (unsaved: boolean) => void;
  update: () => void;
  registeringNewErrand?: boolean;
}

export const CasedataContactsComponent: FC<CasedataContactsProps> = (props) => {
  const [addContact, setAddContact] = useState(false);
  const [selectedContact, setSelectedContact] = useState<CasedataOwnerOrContact>();
  const errand = useCasedataStore((s) => s.errand);
  const deleteConfirm = useConfirm();
  const updateConfirm = useConfirm();
  const isStakeholderModificationLocked = (stakeholder: CasedataOwnerOrContact) =>
    (errand ? isErrandLocked(errand) : false) ||
    (errand?.channel === Channels.ESERVICE_KATLA && stakeholder.roles.includes(Role.APPLICANT));

  useEffect(() => {
    setAddContact(errand?.status?.statusType !== 'Ärende avslutat');
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
    const errandLocked = errand ? isErrandLocked(errand) : false;
    const relation = getStakeholderRelation(contact);

    const actions: StakeholderCardAction[] = [
      {
        label: 'Redigera uppgifter',
        dataCy: 'edit-stakeholder-button',
        disabled: errandLocked,
        onClick: () => setSelectedContact(contact),
      },
      ...(!stakeholderModificationLocked
        ? [
            {
              label: 'Ta bort',
              dataCy: 'delete-stakeholder-button',
              onClick: () => {
                deleteConfirm
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
              },
            },
          ]
        : []),
      ...(!contact.roles.includes(Role.APPLICANT) && !stakeholdersFields.some((s) => s.roles.includes(Role.APPLICANT))
        ? [
            {
              label: 'Gör till ärendeägare',
              dataCy: 'make-stakeholder-owner-button',
              disabled: stakeholderModificationLocked,
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
      <div className="w-full" key={`rendered-${contact.id || contact.clientId || index}`}>
        {selectedContact && isMatchingSelectedContact(selectedContact, contact) && (
          <SimplifiedContactForm
            key={`form-${contact.id || contact.clientId || index}`}
            disabled={errandLocked}
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
            }}
            onClose={() => setSelectedContact(undefined)}
            id="edit"
          />
        )}

        <StakeholderCard
          dataCy={`rendered-${contact.roles[0]}`}
          header={
            relation
              ? (MEXRelation as Record<string, string>)[relation] || (PTRelation as Record<string, string>)[relation]
              : label
          }
          contact={toStakeholderCardContact(contact)}
          actions={actions}
          index={index}
          onAddPhone={() => setSelectedContact(contact)}
          onAddEmail={() => setSelectedContact(contact)}
          addDisabled={errandLocked}
        />
      </div>
    );
  };

  const watchedStakeholders = watch('stakeholders');

  return (
    <>
      <Disclosure variant="alt" initalOpen>
        <Disclosure.Header>
          <Disclosure.Icon icon={<User />} />
          <Disclosure.Title>Ärendeägare</Disclosure.Title>
          <Disclosure.Button />
        </Disclosure.Header>
        <Disclosure.Content>
          <div data-cy="registered-applicants" className="my-lg px-0 pt-0">
            <div className="w-full">
              {watchedStakeholders?.filter((s) => s.roles.includes(Role.APPLICANT) && !s.removed).length === 0 ? (
                <>
                  {appConfig.features.useMyPages && (
                    <div className="flex h-auto w-full gap-12 rounded-[1.6rem] bg-warning-background-100 p-12 mb-[2.5rem] border-1 border-warning-surface-primary">
                      <Info className="text-primary w-20 h-20 shrink-0" />
                      <span className="text-primary text-md leading-[1.8rem] font-normal font-sans break-words flex-1 min-w-0">
                        <p className="mt-0">
                          Om du lägger till ett personnummer här, visas ärendet på den personens Mina sidor.
                        </p>
                      </span>
                    </div>
                  )}
                  <SimplifiedContactForm
                    allowOrganization={appConfig.features.useOrganizationStakeholders}
                    disabled={errand ? isErrandLocked(errand) : false}
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
        </Disclosure.Content>
      </Disclosure>

      <Disclosure variant="alt" initalOpen>
        <Disclosure.Header>
          <Disclosure.Icon icon={<Users />} />
          <Disclosure.Title>Övriga parter</Disclosure.Title>
          <Disclosure.Button />
        </Disclosure.Header>
        <Disclosure.Content>
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
                  key="new-contact-form"
                  allowOrganization={appConfig.features.useOrganizationStakeholders}
                  disabled={errand ? isErrandLocked(errand) : false}
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
                        <div key={`stakeholder-${stakeholder.id || stakeholder.clientId || idx}`}>
                          {renderContact(stakeholder, idx, 'Kontaktperson')}
                        </div>
                      );
                    })}
                </div>
              </FormControl>
            )}
          </div>
        </Disclosure.Content>
      </Disclosure>
    </>
  );
};
