import {
  emptyContact,
  SimplifiedContactForm,
} from '@casedata/components/errand/forms/simplified-contact-form.component';
import { IErrand } from '@casedata/interfaces/errand';
import { MEXRelation, PTRelation, Role } from '@casedata/interfaces/role';
import { CasedataOwnerOrContact } from '@casedata/interfaces/stakeholder';
import { getErrand, isErrandLocked } from '@casedata/services/casedata-errand-service';
import {
  editStakeholder,
  getFellowApplicants,
  getOwnerStakeholder,
  getStakeholderRelation,
  removeStakeholder,
} from '@casedata/services/casedata-stakeholder-service';
import { useAppContext } from '@common/contexts/app.context';
import { isPT } from '@common/services/application-service';
import {
  Avatar,
  Button,
  Divider,
  FormControl,
  FormLabel,
  LucideIcon as Icon,
  useConfirm,
  useSnackbar,
} from '@sk-web-gui/react';
import { useEffect, useState } from 'react';
import { useFieldArray, useFormContext, UseFormReturn } from 'react-hook-form';

interface CasedataContactsProps {
  setUnsaved: (unsaved: boolean) => void;
  update: () => void;
  registeringNewErrand?: boolean;
}

export const CasedataContactsComponent: React.FC<CasedataContactsProps> = (props) => {
  const [addContact, setAddContact] = useState(false);
  const [addApplicant, setAddApplicant] = useState(false);
  const [selectedContact, setSelectedContact] = useState<CasedataOwnerOrContact>();
  const { municipalityId, errand, setErrand, user } = useAppContext();
  // const message = useMessage();
  const deleteConfirm = useConfirm();
  const updateConfirm = useConfirm();
  const toastMessage = useSnackbar();

  const avatarColorArray = ['vattjom', 'juniskar', 'gronsta', 'bjornstigen'];

  useEffect(() => {
    setAddApplicant(false);
    setAddContact(errand.status !== 'Ärende avslutat');
    setSelectedContact(undefined);
  }, [errand]);

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
  }, [errand]);

  const onRemoveContact: (stakeholderId: string, index: number) => Promise<boolean> = (stakeholderId, index) => {
    return removeStakeholder(municipalityId, errand?.id.toString(), stakeholderId)
      .then((res) => {
        getErrand(municipalityId, errand.id.toString()).then((res) => {
          setErrand(res.errand);
          toastMessage({
            position: 'bottom',
            closeable: false,
            message: 'Intressenten togs bort',
            status: 'success',
          });
        });
        return !!res;
      })
      .catch((e) => {
        toastMessage({
          position: 'bottom',
          closeable: false,
          message: 'Intressenten kunde inte tas bort',
          status: 'error',
        });
        return false;
      });
  };

  const onMakeOwner: (stakeholder: CasedataOwnerOrContact, index: number) => Promise<boolean> = (
    stakeholder,
    index
  ) => {
    stakeholder.newRole = Role.APPLICANT;
    return editStakeholder(municipalityId, errand?.id.toString(), stakeholder)
      .then((res) => {
        getErrand(municipalityId, errand.id.toString()).then((res) => {
          setErrand(res.errand);
          toastMessage({
            position: 'bottom',
            closeable: false,
            message: 'Ändringen sparades',
            status: 'success',
          });
        });
        return res ? true : false;
      })
      .catch((e) => {
        toastMessage({
          position: 'bottom',
          closeable: false,
          message: `Något gick fel när ändringen sparades`,
          status: 'error',
        });
        return false;
      });
  };

  const renderContact = (contact: CasedataOwnerOrContact, index, label) => {
    return (
      <div className="w-full" key={`contact-${index}`}>
        {selectedContact?.id === contact.id ? (
          <SimplifiedContactForm
            disabled={isErrandLocked(errand)}
            allowRelation={true}
            setUnsaved={props.setUnsaved}
            contact={contact}
            label={`Redigera ${label.toLowerCase()}`}
            onClose={() => setSelectedContact(undefined)}
            id="edit"
          />
        ) : null}

        <div
          key={`rendered-${contact.id}-${contact.roles[0]}-${index}`}
          data-cy={`rendered-${contact.roles[0]}`}
          className="bg-background-content border rounded-button "
        >
          <div className="bg-vattjom-background-200 px-16 py-8 flex justify-between">
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
              <Button
                disabled={isErrandLocked(errand)}
                data-cy="delete-stakeholder-button"
                variant="link"
                className="text-body"
                onClick={() => {
                  return deleteConfirm
                    .showConfirmation('Ta bort?', 'Vill du ta bort denna intressent?', 'Ja', 'Nej', 'info', 'info')
                    .then((confirmed) => {
                      if (confirmed) {
                        onRemoveContact(contact.id, index);
                      }
                    });
                }}
              >
                Ta bort
              </Button>
              {!contact.roles.includes(Role.APPLICANT) &&
              !stakeholdersFields.some((s) => s.roles.includes(Role.APPLICANT)) ? (
                <Button
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
                          onMakeOwner(contact, index);
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

  return (
    <>
      <div className="mt-md">
        <Divider.Section>
          <div className="flex gap-sm items-center">
            <Icon name="user"></Icon>
            <h2 className="text-h4-sm md:text-h4-md">Ärendeägare</h2>
          </div>
        </Divider.Section>
        <div data-cy="registered-applicants" className="my-lg px-0 md:px-24 lg:px-40 pb-40 pt-0">
          <div className="w-full">
            {stakeholdersFields.filter((stakeholder, idx) => stakeholder.roles.includes(Role.APPLICANT)).length ===
            0 ? (
              <SimplifiedContactForm
                disabled={isErrandLocked(errand)}
                allowRelation={true}
                allowOrganization={!isPT()}
                setUnsaved={props.setUnsaved}
                contact={{ ...emptyContact, roles: [Role.APPLICANT] }}
                label="Lägg till ärendeägare"
                id="owner"
              />
            ) : null}
          </div>

          <div className="flex flex-row gap-md flex-wrap mt-20">
            {[...(getOwnerStakeholder(errand) ? [getOwnerStakeholder(errand)] : [])].map((caseData, idx) =>
              renderContact(caseData, idx, 'Ärendeägare')
            )}
          </div>
        </div>

        <Divider.Section>
          <div className="flex gap-sm items-center">
            <Icon name="users"></Icon>
            <h2 className="text-h4-sm md:text-h4-md">Övriga ärendeintressenter</h2>
          </div>
        </Divider.Section>
        <div data-cy="registered-contacts" className="my-lg px-0 md:px-24 lg:px-40 pb-40 pt-0">
          {addContact ? (
            <div className="w-full mt-md">
              <SimplifiedContactForm
                disabled={isErrandLocked(errand)}
                allowRelation={true}
                allowOrganization={!isPT()}
                setUnsaved={props.setUnsaved}
                contact={{ ...emptyContact, roles: [Role.CONTACT_PERSON] }}
                label="Lägg till ärendeintressent"
                id="person"
              />
            </div>
          ) : null}

          {stakeholdersFields.map((stakehodler) => stakehodler.roles.includes(Role.CONTACT_PERSON)).length !== 0 ? (
            <FormControl className="mt-40 w-full">
              <FormLabel>Tillagda parter</FormLabel>
              <div className="flex flex-row gap-md flex-wrap">
                {stakeholdersFields.map((caseData, idx) =>
                  caseData.roles.includes(Role.CONTACT_PERSON) ? renderContact(caseData, idx, 'Ärendeintressent') : null
                )}
              </div>
            </FormControl>
          ) : null}
        </div>
        <div className="h-xl"></div>
      </div>
    </>
  );
};
