import { ContactModal } from '@casedata/components/errand/forms/contact-modal.component';
import { Channels } from '@casedata/interfaces/channels';
import { Role } from '@casedata/interfaces/role';
import { CasedataOwnerOrContact } from '@casedata/interfaces/stakeholder';
import { useAppContext } from '@common/contexts/app.context';
import { isValidOrgNumber } from '@common/services/adress-service';
import {
  invalidOrgNumberMessage,
  invalidPhoneMessage,
  invalidSsnMessage,
  luhnCheck,
  newNumberPhonePattern,
  orgNumberPattern,
  phonePattern,
  ssnPattern,
} from '@common/services/helper-service';
import { appConfig } from '@config/appconfig';
import { yupResolver } from '@hookform/resolvers/yup';
import LucideIcon from '@sk-web-gui/lucide-icon';
import { Button, FormControl, Input } from '@sk-web-gui/react';
import { useEffect, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { v4 as uuidv4 } from 'uuid';
import * as yup from 'yup';
import { ContactSearchField } from './contact-search-field.component';
import { SearchModeSelector } from './search-mode-selector.component';
import { SearchResult } from './search-result.component';

const emptyContact: CasedataOwnerOrContact = {
  id: '',
  stakeholderType: 'PERSON',
  roles: [],
  newRole: Role.CONTACT_PERSON,
  personalNumber: undefined,
  personId: '',
  organizationName: '',
  organizationNumber: undefined,
  relation: '',
  firstName: '',
  lastName: '',
  street: '',
  careof: '',
  zip: '',
  city: '',
  newPhoneNumber: '',
  phoneNumbers: [],
  newEmail: '',
  emails: [],
  extraInformation: '',
  clientId: '',
};

export const createEmptyContact = (role: Role = Role.CONTACT_PERSON): CasedataOwnerOrContact => ({
  ...emptyContact,
  roles: [role],
  newRole: role,
  clientId: uuidv4(),
});

export const SimplifiedContactForm: React.FC<{
  allowOrganization?: boolean;
  contact: CasedataOwnerOrContact;
  setUnsaved: (unsaved: boolean) => void;
  disabled?: boolean;
  onClose?: () => void;
  onSave?: (data: any) => void;
  label: string;
  id: string;
  editing?: boolean;
}> = (props) => {
  const {
    allowOrganization = false,
    contact = emptyContact,
    setUnsaved = () => {},
    onClose = () => {},
    onSave = () => {},
    label = '',
    id,
    editing = false,
  } = props;

  const yupContact = yup.object().shape(
    {
      id: yup.string(),
      personalNumber: yup.string().when(['stakeholderType'], {
        is: (type: string) => type === 'PERSON',
        then: (schema) =>
          schema
            .trim()
            .matches(ssnPattern, invalidSsnMessage)
            .test('luhncheck', invalidSsnMessage, (ssn) => luhnCheck(ssn) || !ssn),
        otherwise: (schema) => schema,
      }),
      personId: yup.string(),
      stakeholderType: yup.string(),
      organizationName: yup.string().when(['stakeholderType', 'lastName'], ([sType, lastName], schema) => {
        if (sType === 'ORGANIZATION' && (searchMode === 'organization' || searchMode === 'enterprise')) {
          return schema.required('Organisationsnamn måste anges');
        }
        return schema;
      }),
      organizationNumber: yup.string().when(['stakeholderType'], {
        is: (type: string) => type === 'ORGANIZATION',
        then: (schema) =>
          schema
            .trim()
            .matches(orgNumberPattern, invalidOrgNumberMessage)
            .test('isValidOrgNr', invalidOrgNumberMessage, (orgNr) => !orgNr || isValidOrgNumber(orgNr)),
        otherwise: (schema) => schema,
      }),

      firstName: yup.string().when(['organizationName'], {
        is: (_: string) => searchMode === 'person',
        then: (schema) => schema.required('Förnamn måste anges'),
        otherwise: (schema) => schema,
      }),
      lastName: yup.string().when(['organizationName'], {
        is: (_: string) => searchMode === 'person',
        then: (schema) => schema.required('Efternamn måste anges'),
        otherwise: (schema) => schema,
      }),
      relation: yup.string(),

      street: yup.string(),
      careof: yup.string(),
      zip: yup.string(),
      city: yup.string(),
      newPhoneNumber: yup
        .string()
        .trim()
        .transform((val) => val && val.replace('-', ''))
        .matches(newNumberPhonePattern, invalidPhoneMessage),
      newEmail: yup.string().trim().email('E-postadress har fel format'),
      phoneNumbers: yup
        .array()
        .of(
          yup.object().shape({
            value: yup
              .string()
              .trim()
              .transform((val) => val.replace('-', ''))
              .matches(phonePattern, invalidPhoneMessage),
          })
        )
        .test(
          'contact-channel-required-phone',
          'Ange minst en godkänd e-postadress eller ett telefonnummer',
          function (phoneNumbers) {
            if (!appConfig.features.useRequireContactChannel) return true;
            const emails = this.parent.emails || [];
            const hasValidPhone = (phoneNumbers || []).some(
              (p) => p.value && yup.string().matches(phonePattern).isValidSync(p.value)
            );
            const hasValidEmail = (emails || []).some(
              (e: { value?: string }) => e.value && yup.string().email().isValidSync(e.value)
            );
            return hasValidEmail || hasValidPhone;
          }
        ),
      emails: yup
        .array()
        .of(
          yup.object().shape({
            value: yup.string().trim().email('E-postadress har fel format'),
          })
        )
        .test(
          'contact-channel-required',
          'Ange minst en godkänd e-postadress eller ett telefonnummer',
          function (emails) {
            if (!appConfig.features.useRequireContactChannel) return true;
            const phoneNumbers = this.parent.phoneNumbers || [];
            const hasValidEmail = (emails || []).some((e) => e.value && yup.string().email().isValidSync(e.value));
            const hasValidPhone = (phoneNumbers || []).some(
              (p: { value?: string }) => p.value && yup.string().matches(phonePattern).isValidSync(p.value)
            );
            return hasValidEmail || hasValidPhone;
          }
        ),
      roles: yup.array().of(yup.string()),
    },
    [
      ['emails', 'phoneNumbers'],
      ['firstName', 'organizationName'],
      ['lastName', 'organizationName'],
    ]
  );

  const { errand } = useAppContext();
  const [searchMode, setSearchMode] = useState('person');
  const [searching, setSearching] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [manual, setManual] = useState(false);
  const [searchResult, setSearchResult] = useState(false);
  const [loading, setIsLoading] = useState(false);

  const searchProps = {
    searchResult,
    setSearchResult,
    searching,
    setSearching,
    notFound,
    setNotFound,
    searchMode,
    setUnsaved,
    setSearchMode,
  };

  const closeHandler = () => {
    setManual(false);
    onClose();
  };

  const form = useForm<CasedataOwnerOrContact>({
    resolver: yupResolver(yupContact) as any,
    defaultValues: {
      ...contact,
      relation: contact.roles?.[contact.roles.length - 1] ?? '',
    },
    mode: 'onChange', // NOTE: Needed if we want to disable submit until valid
  });

  const { register, control, handleSubmit, watch, setValue, formState, getValues, reset } = form;

  const firstName = watch(`firstName`);
  const lastName = watch(`lastName`);
  const organizationName = watch(`organizationName`);

  const { append: appendPhonenumber, replace: replacePhonenumbers } = useFieldArray({
    control,
    name: `phoneNumbers`,
  });

  // Restricted editing means that personalNumber, firstName, lastName,
  // organizationNam and orgName cannot be changed.

  const restrictedEditing = editing && errand.channel !== Channels.WEB_UI;

  const resetPersonNumber = () => {
    setValue(`personalNumber`, '', { shouldDirty: false });
    setValue(`personId`, '', { shouldDirty: false });
  };

  useEffect(() => {
    if (manual && !editing) {
      resetPersonNumber();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manual]);

  useEffect(() => {
    setSearchMode(contact.stakeholderType === 'PERSON' ? 'person' : 'enterprise');
    if (!contact.id) {
      setValue(`stakeholderType`, contact.stakeholderType);
    }
    setValue(`newRole`, contact.roles[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [errand, contact]);

  useEffect(() => {
    if (
      (manual || editing) &&
      (formState.dirtyFields?.firstName || formState.dirtyFields?.lastName || formState.dirtyFields?.organizationName)
    ) {
      resetPersonNumber();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firstName, lastName, organizationName]);

  const onSubmit = () => {
    const { newRole, relation } = getValues();

    if (newRole === Role.APPLICANT && relation === newRole) {
      setValue('relation', '');
    } else if (newRole === Role.CONTACT_PERSON && relation === newRole) {
      setValue('relation', '');
    }

    setValue('roles', [newRole, relation as Role], { shouldDirty: true });

    setIsLoading(true);

    onSave(getValues());

    setManual(false);
    setValue('personalNumber', '');
    setValue('organizationNumber', '');
    setSearchResult(false);
    setSearchMode('person');
    reset();
    onClose();
    setIsLoading(false);
  };

  const onError = () => {};

  return (
    <div data-cy={`contact-form`} key={contact.id}>
      <div className="invisible">
        <FormControl id={`id`}>
          <Input data-cy={`contact-id`} {...register(`id`)} type="hidden" />
        </FormControl>

        <FormControl id={`clientId`}>
          <Input data-cy={`contact-client-id`} {...register(`clientId`)} type="hidden" />
        </FormControl>
      </div>

      {allowOrganization ? (
        <SearchModeSelector
          id={id}
          inName="form"
          form={form}
          searchMode={searchMode}
          setSearchMode={setSearchMode}
          replacePhonenumbers={replacePhonenumbers}
          setSearchResult={setSearchResult}
          label={label}
        />
      ) : null}

      {!restrictedEditing && !editing ? (
        <ContactSearchField
          searchMode={searchMode}
          disabled={props.disabled}
          form={form}
          notFound={notFound}
          setNotFound={setNotFound}
          searching={searching}
          setSearching={setSearching}
          setUnsaved={setUnsaved}
          id={id}
          setSearchResult={setSearchResult}
          appendPhonenumber={appendPhonenumber}
        />
      ) : null}

      {searchResult ? (
        <SearchResult
          contact={contact}
          searchMode={searchMode}
          disabled={props.disabled}
          form={form}
          loading={loading}
          onSubmit={onSubmit}
          label={label}
        />
      ) : null}

      {editing ? null : (
        <div className="">
          <Button
            className="mt-20"
            color="vattjom"
            inverted
            size="sm"
            onClick={() => setManual(true)}
            disabled={props.disabled}
            leftIcon={<LucideIcon name="pen" />}
          >
            Lägg till manuellt
          </Button>
        </div>
      )}

      <ContactModal
        allowOrganization={allowOrganization}
        restrictedEditing={restrictedEditing}
        manual={manual}
        editing={editing}
        closeHandler={closeHandler}
        onSubmit={handleSubmit(onSubmit, onError)}
        label={label}
        disabled={props.disabled}
        loading={loading}
        contact={contact}
        form={form}
        id={id}
        replacePhonenumbers={replacePhonenumbers}
        {...searchProps}
      />
    </div>
  );
};
