import CommonNestedEmailArrayV2 from '@common/components/commonNestedEmailArrayV2';
import CommonNestedPhoneArrayV2 from '@common/components/commonNestedPhoneArrayV2';
import {
  AddressResult,
  fetchPersonId,
  isValidOrgNumber,
  searchADUser,
  searchADUserByPersonNumber,
  searchOrganization,
  searchPerson,
} from '@common/services/adress-service';
import {
  invalidOrgNumberMessage,
  invalidPhoneMessage,
  invalidSsnMessage,
  invalidUsernameMessage,
  luhnCheck,
  newNumberPhonePattern,
  orgNumberPattern,
  phonePattern,
  ssnPattern,
  usernamePattern,
} from '@common/services/helper-service';
import { yupResolver } from '@hookform/resolvers/yup';

import { appConfig } from '@config/appconfig';
import { AppContextInterface, useAppContext } from '@contexts/app.context';
import LucideIcon from '@sk-web-gui/lucide-icon';
import {
  Button,
  cx,
  FormControl,
  FormErrorMessage,
  FormLabel,
  Input,
  isArray,
  Modal,
  RadioButton,
  SearchField,
  Select,
} from '@sk-web-gui/react';
import {
  emptyContact,
  ExternalIdType,
  SupportStakeholderFormModel,
  SupportStakeholderTypeEnum,
} from '@supportmanagement/services/support-errand-service';
import { getSupportMetadata } from '@supportmanagement/services/support-metadata-service';
import React, { useEffect, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { v4 as uuidv4 } from 'uuid';
import * as yup from 'yup';

export const SupportSimplifiedContactForm: React.FC<{
  allowOrganization?: boolean;
  allowRelation?: boolean;
  contact: SupportStakeholderFormModel;
  editing: boolean;
  setUnsaved: (unsaved: boolean) => void;
  disabled?: boolean;
  onSave?: (data: any) => void;
  onClose?: () => void;
  label: string;
  id: string;
}> = (props) => {
  const {
    allowOrganization = false,
    allowRelation = false,
    contact = emptyContact,
    setUnsaved = () => {},
    onClose = () => {},
    onSave = () => {},
    label = '',
    id,
  } = props;

  const yupContact = yup.object().shape(
    {
      id: yup.string(),
      personNumber: allowOrganization
        ? yup.string().when('stakeholderType', {
            is: (type: string) => type === 'PERSON',
            then: yup
              .string()
              .trim()
              .matches(ssnPattern, invalidSsnMessage)
              .test('luhncheck', invalidSsnMessage, (ssn) => luhnCheck(ssn) || !ssn),
          })
        : yup.string().when('stakeholderType', {
            is: (type: string) => {
              return (
                type === 'PERSON' &&
                searchMode === 'employee' &&
                !personNumber?.toString().startsWith('1') &&
                !personNumber?.toString().startsWith('2')
              );
            },
            then: (schema) => schema.matches(usernamePattern, invalidUsernameMessage),
            otherwise: (schema) =>
              schema
                .trim()
                .matches(ssnPattern, invalidSsnMessage)
                .test('luhncheck', invalidSsnMessage, (ssn) => luhnCheck(ssn) || !ssn),
          }),

      personId: yup.string(),
      stakeholderType: yup.string(),
      organizationName: yup.string().when(['stakeholderType', 'lastName'], {
        is: (sType: string, lastName: string) =>
          sType === 'ORGANIZATION' && (searchMode === 'organization' || searchMode === 'enterprise'),
        then: yup.string().required('Organisationsnamn måste anges'),
      }),
      organizationNumber: yup.string().when('stakeholderType', {
        is: (type: string) => type === 'ORGANIZATION',
        then: yup
          .string()
          .trim()
          .matches(orgNumberPattern, invalidOrgNumberMessage)
          .test('isValidOrgNr', invalidOrgNumberMessage, (orgNr) => isValidOrgNumber(orgNr) || !orgNr),
      }),
      firstName: yup.string().when('organizationName', {
        is: (_: string) => searchMode === 'person' || searchMode === 'employee',
        then: yup.string().required('Förnamn måste anges'),
      }),
      lastName: yup.string().when('organizationName', {
        is: (sType: string) => searchMode === 'person' || searchMode === 'employee',
        then: yup.string().required('Efternamn måste anges'),
      }),
      address: yup.string(),
      careOf: yup.string(),
      zipCode: yup.string(),
      city: yup.string(),
      username: yup.string(),
      administrationCode: yup.string(),
      administrationName: yup.string(),
      newPhoneNumber: yup
        .string()
        .trim()
        .transform((val) => val && val.replace('-', ''))
        .matches(newNumberPhonePattern, invalidPhoneMessage),
      phoneNumbers: yup.array().of(
        yup.object().shape({
          value: yup
            .string()
            .trim()
            .transform((val) => val.replace('-', ''))
            .matches(phonePattern, invalidPhoneMessage),
        })
      ),
      newEmail: yup.string().trim().email('E-postadress har fel format'),
      emails: yup.array().of(
        yup.object().shape({
          value: yup.string().trim().email('E-postadress har fel format'),
        })
      ),
      primaryContact: yup.boolean(),
      messageAllowed: yup.boolean(),
      role: yup.string(),
    },
    [
      ['emails', 'phoneNumbers'],
      ['firstName', 'organizationName'],
      ['lastName', 'organizationName'],
    ]
  );

  const { supportErrand, supportMetadata, municipalityId, setSupportMetadata }: AppContextInterface = useAppContext();
  const [searchMode, setSearchMode] = useState('person');
  const [searching, setSearching] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [manual, setManual] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [searchResult, setSearchResult] = useState(false);
  const [loading, setIsLoading] = useState(false);
  const [searchResultArray, setSearchResultArray] = useState<AddressResult[]>([]);
  const [selectedUser, setSelectedUser] = useState<AddressResult>();
  const [query, setQuery] = useState('');

  const closeHandler = () => {
    setModalOpen(false);
    setManual(false);
    onClose();
  };

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState,
    clearErrors,
    trigger,
    reset,
    formState: { errors },
  } = useForm<SupportStakeholderFormModel>({
    resolver: yupResolver(yupContact),
    defaultValues: contact,
    mode: 'onChange', // NOTE: Needed if we want to disable submit until valid
  });

  const externalId = watch(`externalId`);
  const externalIdType = watch(`externalIdType`);
  const username = watch('username');
  const administrationName = watch('administrationName');
  const firstName = watch(`firstName`);
  const lastName = watch(`lastName`);
  const address = watch(`address`);
  const careOf = watch(`careOf`);
  const zipCode = watch(`zipCode`);
  const city = watch(`city`);
  const organizationName = watch(`organizationName`);
  const emails = watch(`emails`);
  const phoneNumbers = watch(`phoneNumbers`);
  const personNumber = watch(`personNumber`);
  const organizationNumber = watch(`organizationNumber`);
  const stakeholderType = watch(`stakeholderType`);

  const { append: appendPhonenumber, replace: replacePhonenumbers } = useFieldArray({
    control,
    name: `phoneNumbers`,
  });

  const { append: appendEmail, replace: replaceEmails } = useFieldArray({ control, name: 'emails' });

  // Restricted editing means that personNumber, firstName, lastName,
  // organizationName and orgName cannot be changed.
  const editing = props.editing;
  const restrictedEditing = editing;

  const resetPersonNumber = () => {
    setValue(`personNumber`, '', { shouldDirty: false });
  };

  useEffect(() => {
    if (manual && !editing) {
      resetPersonNumber();
    }
  }, [manual]);

  useEffect(() => {
    if (allowOrganization) {
      setSearchMode(contact.stakeholderType === SupportStakeholderTypeEnum.PERSON ? 'person' : 'enterprise');
    } else {
      setSearchMode('employee');
    }
    if (!contact.internalId) {
      setValue(`stakeholderType`, contact.stakeholderType);
    }
  }, []);

  const validEmailOrPhonenumberExists = () =>
    (emails && emails.length > 0 && !errors.emails) || (phoneNumbers && phoneNumbers.length > 0);

  useEffect(() => {
    if (
      (manual || editing) &&
      (formState.dirtyFields?.firstName || formState.dirtyFields?.lastName || formState.dirtyFields?.organizationName)
    ) {
      resetPersonNumber();
    }
  }, [firstName, lastName, organizationName]);

  useEffect(() => {
    if (searchResult) {
      setSearchResult(false);
      reset({}, { keepErrors: true });
    }
  }, [organizationNumber, personNumber]);

  useEffect(() => {
    appConfig.isSupportManagement &&
      municipalityId &&
      getSupportMetadata(municipalityId).then((res) => setSupportMetadata(res.metadata));
  }, [municipalityId]);

  const onSubmit = async (e: SupportStakeholderFormModel) => {
    if (!editing) {
      e.internalId = uuidv4();
    }
    setIsLoading(true);
    onSave(e);
    setModalOpen(false);
    setManual(false);
    setSearchResult(false);
    if (allowOrganization) {
      setSearchMode('person');
    } else {
      setSearchMode('employee');
    }
    onClose();
    setIsLoading(false);
    reset();
    resetPersonNumber();
  };

  const onError = () => {};

  const doSearch = (val: string) => {
    setSearchResult(false);
    let search: (val: string) => Promise<AddressResult | AddressResult[]>;

    if (searchMode === 'person') {
      setValue('personNumber', val);
      search = searchPerson;
    } else if (searchMode === 'employee') {
      if (!luhnCheck(val)) {
        search = searchADUser;
      } else {
        search = searchADUserByPersonNumber;
      }
    } else if (searchMode === 'enterprise' || searchMode === 'organization') {
      search = () => searchOrganization(val);
    }
    setSearching(true);
    setNotFound(false);
    search &&
      search(val)
        .then((res) => {
          if (!isArray(res)) {
            setValue(`externalId`, res.personId, { shouldDirty: true });
            setValue(`firstName`, res.firstName, { shouldDirty: true });
            setValue(`lastName`, res.lastName, { shouldDirty: true });
            setValue(`organizationName`, res.organizationName, {
              shouldDirty: true,
            });
            setValue(`address`, res.street, { shouldDirty: true });
            setValue(`careOf`, res.careof, { shouldDirty: true });
            setValue(`zipCode`, res.zip, { shouldDirty: true });
            setValue(`city`, res.city, { shouldDirty: true });
            if (res.phone) {
              appendPhonenumber({ value: res.phone });
            }
            if (res.workPhone) {
              appendPhonenumber({ value: res.workPhone });
            }
            if (res.email) {
              appendEmail({ value: res.email });
            }
            if (res.loginName) {
              setValue('username', res.loginName);
            }
            setValue('administrationCode', res.administrationCode);
            setValue('administrationName', res.administrationName);

            if (searchMode === 'enterprise') {
              setValue(`organizationName`, res.organizationName);
            }

            //moved to here so it doesnt select when empty (giving empty card, false email and phone data)
            clearErrors([`firstName`, `lastName`, `organizationName`]);
            setUnsaved(true);
            setSearching(false);
            setSearchResult(true);
          } else {
            clearErrors([`firstName`, `lastName`, `organizationName`]);
            setUnsaved(true);
            setSearching(false);
            setSearchResultArray(res as AddressResult[]);
          }
        })
        .catch(() => {
          setSearching(false);
          setNotFound(true);
          setSearchResult(false);
        });
  };

  const searchModeSelector = (inName) => (
    <fieldset
      className="flex mx-md mt-ms mb-md gap-lg justify-start"
      data-cy={`searchmode-selector-${inName}`}
      disabled={props.disabled}
    >
      <legend className="text-md my-sm contents"></legend>
      <Input type="hidden" {...register(`stakeholderType`)} />

      {appConfig.features.useEmployeeSearch ? (
        <RadioButton
          data-cy={`search-employee-${inName}-${contact.role}`}
          size="lg"
          className="mr-sm"
          name={`stakeholderType-${id}`}
          id={`searchEmployee-${id}-${inName}`}
          value={'EMPLOYEE'}
          checked={searchMode === 'employee'}
          onChange={() => {
            setSearchMode('employee');
            replacePhonenumbers([]);
            setValue('city', '');
            setValue('zipCode', '');
            setValue('careOf', '');
            setValue('address', '');
            clearErrors(['organizationNumber']);
            setSearchResult(undefined);
            setSelectedUser(undefined);
            setValue(`externalIdType`, ExternalIdType.EMPLOYEE);
            setTimeout(() => {
              setValue(`organizationName`, '', { shouldDirty: false });
              setValue(`organizationNumber`, '', { shouldDirty: false });
              setValue(`stakeholderType`, SupportStakeholderTypeEnum.PERSON, { shouldDirty: true });
              clearErrors(['phoneNumbers']);
            }, 0);
          }}
        >
          Anställd
        </RadioButton>
      ) : null}

      <RadioButton
        data-cy={`search-person-${inName}-${contact.role}`}
        size="lg"
        className="mr-sm"
        name={`stakeholderType-${id}`}
        id={`searchPerson-${id}-${inName}`}
        value={'PERSON'}
        checked={searchMode === 'person'}
        onChange={() => {
          setSearchMode('person');
          replacePhonenumbers([]);
          setValue('city', '');
          setValue('zipCode', '');
          setValue('careOf', '');
          setValue('address', '');
          clearErrors(['organizationNumber']);
          setSearchResult(undefined);
          setSearchResultArray([]);
          setSelectedUser(undefined);
          setValue(`externalIdType`, ExternalIdType.PRIVATE);
          setTimeout(() => {
            setValue(`organizationName`, '', { shouldDirty: false });
            setValue(`organizationNumber`, '', { shouldDirty: false });
            setValue(`stakeholderType`, SupportStakeholderTypeEnum.PERSON, { shouldDirty: true });
            clearErrors(['phoneNumbers']);
          }, 0);
        }}
      >
        Privat
      </RadioButton>

      {allowOrganization ? (
        <>
          <RadioButton
            data-cy={`search-enterprise-${inName}-${contact.role}`}
            size="lg"
            className="mr-sm"
            name={`stakeholderType-${id}`}
            id={`searchEnterprise-${id}-${inName}`}
            value={'ENTERPRISE'}
            checked={searchMode === 'enterprise'}
            onChange={() => {
              setSearchMode('enterprise');
              setValue('city', '');
              setValue('zipCode', '');
              setValue('careOf', '');
              setValue('address', '');
              replacePhonenumbers([]);
              setSearchResult(undefined);
              setSearchResultArray([]);
              setSelectedUser(undefined);
              setValue(`externalIdType`, ExternalIdType.COMPANY);
              if (stakeholderType === 'PERSON') {
                clearErrors(['personNumber']);
                setTimeout(() => {
                  setValue(`personNumber`, '', { shouldDirty: false });
                  setValue(`personId`, '', { shouldDirty: false });
                  setValue(`firstName`, '', { shouldDirty: false });
                  setValue(`lastName`, '', { shouldDirty: false });
                  setValue(`stakeholderType`, SupportStakeholderTypeEnum.ORGANIZATION, { shouldDirty: true });
                  clearErrors(['phoneNumbers']);
                }, 0);
              }
            }}
          >
            Företag
          </RadioButton>
          <RadioButton
            data-cy={`search-organization-${inName}-${contact.role}`}
            size="lg"
            className="mr-sm"
            name={`stakeholderType-${id}`}
            id={`searchOrganization-${id}-${inName}`}
            value={'ORGANIZATION'}
            checked={searchMode === 'organization'}
            onChange={() => {
              setSearchMode('organization');
              setValue('city', '');
              setValue('zipCode', '');
              setValue('careOf', '');
              setValue('address', '');
              replacePhonenumbers([]);
              clearErrors(['personNumber']);
              setSearchResult(undefined);
              setSearchResultArray([]);
              setSelectedUser(undefined);
              setValue(`externalIdType`, ExternalIdType.COMPANY);
              if (stakeholderType === 'PERSON') {
                setTimeout(() => {
                  setValue(`personNumber`, '', { shouldDirty: false });
                  setValue(`personId`, '', { shouldDirty: false });
                  setValue(`firstName`, '', { shouldDirty: false });
                  setValue(`lastName`, '', { shouldDirty: false });
                  setValue(`stakeholderType`, SupportStakeholderTypeEnum.ORGANIZATION, { shouldDirty: true });
                  clearErrors(['phoneNumbers']);
                }, 0);
              }
            }}
          >
            Förening
          </RadioButton>
        </>
      ) : null}
    </fieldset>
  );

  const onSelectUserHandler = (e) => {
    const user = searchResultArray?.find((data) => `${data.firstName} ${data.lastName}` === e.target.value);
    setSelectedUser(user);
    setSearchResultArray([]);
    setQuery('');
  };

  useEffect(() => {
    if (selectedUser) {
      setValue(`externalId`, selectedUser.personId, { shouldDirty: true });
      setValue(`firstName`, selectedUser.firstName, { shouldDirty: true });
      setValue(`lastName`, selectedUser.lastName, { shouldDirty: true });
      setValue(`organizationName`, selectedUser.organizationName, {
        shouldDirty: true,
      });
      setValue(`address`, selectedUser.street, { shouldDirty: true });
      setValue(`careOf`, selectedUser.careof, { shouldDirty: true });
      setValue(`zipCode`, selectedUser.zip, { shouldDirty: true });
      setValue(`city`, selectedUser.city, { shouldDirty: true });
      setValue(`administrationCode`, selectedUser.administrationCode, { shouldDirty: true });
      setValue(`administrationName`, selectedUser.administrationName, { shouldDirty: true });
      if (selectedUser.phone) {
        appendPhonenumber({ value: selectedUser.phone });
      }
      if (selectedUser.workPhone) {
        appendPhonenumber({ value: selectedUser.workPhone });
      }
      if (selectedUser.email) {
        appendEmail({ value: selectedUser.email });
      }
      if (selectedUser.loginName) {
        setValue('username', selectedUser.loginName);
      }

      setSearchResult(true);
    }
  }, [selectedUser]);

  return (
    <div data-cy={`contact-form`} key={contact.internalId}>
      <div className="hidden">
        <FormControl id={`id`}>
          <Input data-cy={`contact-externalId-${id}`} {...register(`externalId`)} type="hidden" />
          <Input data-cy={`contact-externalIdType-${id}`} {...register(`externalIdType`)} type="hidden" />
          <Input data-cy={`contact-id-${id}`} {...register(`internalId`)} type="hidden" />
          <Input data-cy={`contact-role-${id}`} {...register(`role`)} />
        </FormControl>
      </div>

      {!editing ? searchModeSelector('form') : null}

      {!restrictedEditing ? (
        <div className="flex gap-lg">
          <FormControl className="w-full">
            {allowOrganization ? (
              <FormLabel>
                Sök på {searchMode === 'person' ? 'personnummer (ååååmmddxxxx)' : 'organisationsnummer (kkllmm-nnnn)'}
              </FormLabel>
            ) : (
              <FormLabel>
                Sök på{' '}
                {searchMode === 'person'
                  ? 'personnummer (ååååmmddxxxx)'
                  : 'personnummer (ååååmmddxxxx) eller användarnamn'}
              </FormLabel>
            )}

            <div>
              <Input
                data-cy={`contact-personId`}
                {...register(`personId`)}
                type="hidden"
                readOnly
                className="w-full my-sm"
              />
              {searchMode === 'person' ? (
                <>
                  <Input.Group size="md" className="rounded-12" disabled={props.disabled || manual}>
                    <Input.LeftAddin icon>
                      <LucideIcon name="search" />
                    </Input.LeftAddin>
                    <Input
                      disabled={props.disabled}
                      aria-disabled={props.disabled}
                      readOnly={manual}
                      className="read-only:cursor-not-allowed"
                      onChange={() => setUnsaved(true)}
                      data-cy={`contact-personNumber-${id}`}
                      onBlur={() => {
                        personNumber &&
                          personNumber !== '' &&
                          fetchPersonId(personNumber).then((res) => {
                            setValue(`personId`, res.personId, { shouldDirty: true });
                            trigger(`personNumber`);
                          });
                      }}
                      {...register(`personNumber`)}
                    />
                    <Input.RightAddin icon>
                      {searchResult ? (
                        <Button
                          iconButton
                          variant="primary"
                          disabled={props.disabled || manual}
                          inverted
                          onClick={() => {
                            reset();
                            setValue('personNumber', '');
                            setSearchResultArray([]);
                            setSearchResult(false);
                            setValue('stakeholderType', 'PERSON');
                          }}
                        >
                          <LucideIcon name="x" />
                        </Button>
                      ) : (
                        <Button
                          variant="primary"
                          size="sm"
                          disabled={
                            props.disabled ||
                            (searchMode === 'person' && manual) ||
                            !!formState.errors?.personNumber ||
                            personNumber === ''
                          }
                          data-cy={`search-button-${id}`}
                          onClick={() => doSearch(personNumber)}
                          loading={searching}
                          loadingText="Söker"
                        >
                          Sök
                        </Button>
                      )}
                    </Input.RightAddin>
                  </Input.Group>
                </>
              ) : searchMode === 'employee' ? (
                <>
                  <SearchField
                    data-cy={`contact-personNumber-${id}`}
                    {...register('personNumber')}
                    size={'md'}
                    value={query}
                    onBlur={() => {
                      trigger(`personNumber`);
                    }}
                    onSearch={(e) => {
                      setSearching(true);
                      doSearch(e);
                    }}
                    onReset={() => {
                      reset();
                      setQuery('');
                      setSelectedUser(undefined);
                      setValue('personNumber', '');
                      setSearchResultArray([]);
                      setSearchResult(false);
                      setValue('stakeholderType', 'PERSON');
                    }}
                    searchLabel={searching ? 'Söker' : 'Sök'}
                  />

                  {searchResultArray.length ? (
                    <div className="mt-8 flex w-full">
                      <Select onChange={(e) => onSelectUserHandler(e)} className="w-full">
                        <Select.Option>Välj person</Select.Option>
                        {searchResultArray.map((data, index) => (
                          <Select.Option
                            className={cx('w-full')}
                            key={index}
                            value={`${data.firstName} ${data.lastName}`}
                          >
                            {[`${data.firstName} ${data.lastName}`, data.company, data.email]
                              .filter((s) => s && s !== '')
                              .join(', ')}
                          </Select.Option>
                        ))}
                      </Select>
                    </div>
                  ) : null}
                </>
              ) : (
                <>
                  <Input.Group size="md" disabled={props.disabled || manual}>
                    <Input.LeftAddin icon>
                      <LucideIcon name="search" />
                    </Input.LeftAddin>
                    <Input
                      disabled={props.disabled}
                      aria-disabled={props.disabled}
                      readOnly={manual}
                      className="read-only:cursor-not-allowed"
                      onChange={() => {
                        setUnsaved(true);
                      }}
                      data-cy={`contact-orgNumber-${id}`}
                      {...register(`organizationNumber`)}
                    />
                    <Input.RightAddin icon>
                      {searchResult ? (
                        <Button
                          iconButton
                          variant="primary"
                          disabled={props.disabled || manual}
                          inverted
                          onClick={() => {
                            reset();
                            setValue('organizationNumber', '');
                            setSearchResult(false);
                            setValue('stakeholderType', 'ORGANIZATION');
                          }}
                        >
                          <LucideIcon name="x" />
                        </Button>
                      ) : (
                        <Button
                          variant="primary"
                          size="sm"
                          disabled={
                            props.disabled ||
                            manual ||
                            !!formState.errors?.organizationNumber ||
                            organizationNumber === ''
                          }
                          data-cy={`search-button-${id}`}
                          onClick={() => doSearch(organizationNumber)}
                          loading={searching}
                          loadingText="Söker"
                        >
                          Sök
                        </Button>
                      )}
                    </Input.RightAddin>
                  </Input.Group>
                </>
              )}
            </div>

            {notFound || formState.errors.personNumber || formState.errors.organizationNumber ? (
              <div className="my-sm text-error">
                {notFound ? (
                  <FormErrorMessage className="text-error" data-cy="not-found-error-message">
                    Sökningen gav ingen träff
                  </FormErrorMessage>
                ) : (
                  <>
                    {formState.errors.personNumber && (
                      <FormErrorMessage className="text-error" data-cy="personal-number-error-message">
                        {formState.errors.personNumber?.message as string}
                      </FormErrorMessage>
                    )}
                    {formState.errors.organizationNumber && (
                      <FormErrorMessage className="text-error" data-cy="org-number-error-message">
                        {formState.errors.organizationNumber?.message as string}
                      </FormErrorMessage>
                    )}
                  </>
                )}
              </div>
            ) : null}
          </FormControl>
        </div>
      ) : null}
      {searchResult ? (
        <>
          <div data-cy={`search-result`} className="bg-content-main border rounded-16 p-16 my-sm relative">
            {(searchMode === 'person' || 'employee') && (firstName || lastName) ? (
              <>
                {firstName || lastName ? (
                  <p className="my-xs mt-0" data-cy={`stakeholder-name`}>
                    {`${firstName} ${lastName}`}
                  </p>
                ) : null}
                <p className="my-xs mt-0" data-cy={`stakeholder-ssn`}>
                  {personNumber || '(personnummer saknas)'}
                </p>
                {administrationName ? (
                  <p className="my-xs mt-0" data-cy={`stakeholder-administrationName`}>
                    {administrationName}
                  </p>
                ) : null}
                {username ? (
                  <p className="my-xs mt-0" data-cy={`stakeholder-username`}>
                    {username}
                  </p>
                ) : null}

                <p className="my-xs mt-0" data-cy={`stakeholder-adress`}>
                  {address || zipCode ? `${address} ${zipCode} ${city}` : '(adress saknas)'}
                </p>
                <p className="my-xs w-1/2" data-cy={`stakeholder-phone`}>
                  {phoneNumbers?.length === 0 ? <em>Telefonnummer saknas</em> : null}
                </p>
              </>
            ) : (searchMode === 'organization' || searchMode === 'enterprise') && organizationName && !selectedUser ? (
              <>
                <p className="my-xs mt-0">{organizationName}</p>
                <p className="my-xs mt-0" data-cy={`stakeholder-ssn`}>
                  {organizationNumber || '(orgnummer saknas)'}
                </p>
                <p className="my-xs mt-0">
                  {address}, {zipCode} {city}
                </p>
              </>
            ) : null}

            <>
              <div className="my-md">
                <CommonNestedEmailArrayV2
                  required={false}
                  errand={supportErrand}
                  addingStakeholder={true}
                  disabled={props.disabled}
                  error={!!formState.errors.emails}
                  key={`nested-email-array`}
                  {...{ control, register, errors, watch, setValue, trigger }}
                />
              </div>
              <div className="my-md">
                <CommonNestedPhoneArrayV2
                  disabled={props.disabled}
                  error={!!formState.errors.phoneNumbers}
                  key={`nested-phone-array`}
                  {...{ control, register, errors, watch, setValue, trigger }}
                />
              </div>
              {(formState.errors.emails || formState.errors.phoneNumbers) && (
                <div className="flex gap-lg my-sm text-error">
                  <FormErrorMessage>
                    {formState.errors.emails?.message || formState.errors.phoneNumbers?.message}
                  </FormErrorMessage>
                </div>
              )}

              <Button
                variant="primary"
                size="sm"
                loading={loading}
                loadingText="Sparar"
                className="mt-20"
                disabled={!formState.isValid}
                onClick={handleSubmit(onSubmit, onError)}
                data-cy="submit-contact-person-button"
              >
                Lägg till {label.toLowerCase()}
              </Button>
            </>
          </div>
        </>
      ) : null}

      {editing || searchResult ? null : (
        <div className="">
          <Button
            disabled={props.disabled}
            className="my-20"
            data-cy={`add-manually-button-${id}`}
            color="vattjom"
            inverted
            variant="link"
            onClick={() => {
              reset({}, { keepErrors: false });
              setValue(
                'externalIdType',
                searchMode === 'person' || searchMode === 'employee' ? ExternalIdType.PRIVATE : ExternalIdType.COMPANY
              );
              setManual(true);
            }}
          >
            Lägg till manuellt
          </Button>
        </div>
      )}

      <Modal
        show={manual || editing}
        className="w-[56rem]"
        onClose={closeHandler}
        label={manual ? `Lägg till ${label.toLowerCase()}` : `Redigera ${label.toLowerCase()}`}
      >
        <Modal.Content className="p-0">
          <>
            {allowOrganization && !editing ? searchModeSelector('modal') : null}
            {searchMode === 'person' || searchMode === 'employee' ? (
              <>
                <div className="flex gap-lg">
                  <FormControl id={`contact-personnumber`} className="w-1/2">
                    <FormLabel>Personnummer</FormLabel>
                    <Input
                      size="sm"
                      disabled={props.disabled}
                      readOnly
                      data-cy={`contact-personNumber`}
                      className={cx(
                        formState.errors.personNumber ? 'border-2 border-error' : null,
                        'read-only:bg-gray-lighter read-only:cursor-not-allowed'
                      )}
                      {...register(`personNumber`)}
                    />

                    {errors && formState.errors.personNumber && (
                      <div className="my-sm text-error">
                        <FormErrorMessage>{formState.errors.personNumber?.message}</FormErrorMessage>
                      </div>
                    )}
                  </FormControl>
                  {allowRelation ? (
                    <FormControl id={`contact-relation`} size="sm" className="w-1/2">
                      <FormLabel>Roll</FormLabel>
                      <Select
                        data-cy={`role-select`}
                        disabled={props.disabled}
                        {...register(`role`)}
                        className={cx(formState.errors.role ? 'border-2 border-error' : null, 'w-full')}
                      >
                        <Select.Option key="" value="">
                          Välj roll
                        </Select.Option>
                        {supportMetadata &&
                          Object.entries(supportMetadata.roles)
                            .filter(
                              ([, relation]) => !(contact.role === 'CONTACT' && ['PRIMARY'].includes(relation.name))
                            )
                            .sort((a, b) => (a[1].displayName > b[1].displayName ? 1 : -1))
                            .map(([key, relation]) => (
                              <Select.Option key={key} value={relation.name}>
                                {relation.displayName}
                              </Select.Option>
                            ))}
                      </Select>

                      {errors && formState.errors.role && (
                        <div className="my-sm text-error">
                          <FormErrorMessage>{formState.errors.role?.message}</FormErrorMessage>
                        </div>
                      )}
                    </FormControl>
                  ) : (
                    <div className="w-1/2"></div>
                  )}
                </div>
                <div className="flex gap-lg">
                  <FormControl id={`firstName`} className="w-1/2">
                    <FormLabel>
                      Förnamn<span aria-hidden="true">*</span>
                    </FormLabel>
                    <Input
                      size="sm"
                      disabled={props.disabled}
                      className={cx(
                        formState.errors.firstName ? 'border-2 border-error' : null,
                        'read-only:bg-gray-lighter read-only:cursor-not-allowed'
                      )}
                      data-cy={`contact-firstName`}
                      {...register(`firstName`)}
                    />

                    {errors?.firstName && (
                      <div className="my-sm text-error">
                        <FormErrorMessage>{errors.firstName?.message}</FormErrorMessage>
                      </div>
                    )}
                  </FormControl>

                  <FormControl id={`lastName`} className="w-1/2">
                    <FormLabel>
                      Efternamn{' '}
                      {contact.externalIdType !== ExternalIdType.COMPANY ? <span aria-hidden="true">*</span> : null}
                    </FormLabel>
                    <Input
                      size="sm"
                      disabled={props.disabled}
                      className={cx(
                        formState.errors.lastName ? 'border-2 border-error' : null,
                        'read-only:bg-gray-lighter read-only:cursor-not-allowed'
                      )}
                      data-cy={`contact-lastName`}
                      {...register(`lastName`)}
                    />

                    {formState.errors.lastName && (
                      <div className="my-sm text-error">
                        <FormErrorMessage>{formState.errors.lastName?.message}</FormErrorMessage>
                      </div>
                    )}
                  </FormControl>
                </div>
              </>
            ) : (
              <div className="flex gap-lg">
                <FormControl id={`contact-organizationNumber`} className="w-1/2">
                  <FormLabel>Organisationsnummer</FormLabel>
                  <Input
                    size="sm"
                    disabled={props.disabled}
                    readOnly
                    data-cy={`contact-organizationNumber`}
                    className={cx(
                      formState.errors.personNumber ? 'border-2 border-error' : null,
                      'read-only:bg-gray-lighter read-only:cursor-not-allowed'
                    )}
                    {...register(`externalId`)}
                  />

                  {errors && formState.errors.personNumber && (
                    <div className="my-sm text-error">
                      <FormErrorMessage>{formState.errors.personNumber?.message}</FormErrorMessage>
                    </div>
                  )}
                </FormControl>

                <FormControl id={`organizationName`} className="w-1/2">
                  <FormLabel>
                    Organisationsnamn<span aria-hidden="true">*</span>
                  </FormLabel>
                  <Input
                    size="sm"
                    disabled={props.disabled}
                    className={cx(
                      formState.errors.firstName ? 'border-2 border-error' : null,
                      'read-only:bg-gray-lighter read-only:cursor-not-allowed'
                    )}
                    data-cy={`contact-organizationName`}
                    {...register(`organizationName`)}
                  />

                  {errors?.organizationName && (
                    <div className="my-sm text-error">
                      <FormErrorMessage>{errors.organizationName?.message}</FormErrorMessage>
                    </div>
                  )}
                </FormControl>
              </div>
            )}
          </>
          <>
            <div className="flex gap-lg">
              <FormControl id={`street`} className="w-1/2">
                <FormLabel>Adress</FormLabel>
                <Input
                  size="sm"
                  disabled={props.disabled}
                  aria-disabled={props.disabled}
                  className={cx(`readonly:bg-gray-lighter readonly:cursor-not-allowed`)}
                  data-cy={`contact-address`}
                  {...register(`address`)}
                />

                {formState.errors.address && (
                  <div className="my-sm text-error">
                    <FormErrorMessage>{formState.errors.address?.message}</FormErrorMessage>
                  </div>
                )}
              </FormControl>
              <FormControl id={`careOf`} className="w-1/2">
                <FormLabel>C/o-adress</FormLabel>
                <Input
                  size="sm"
                  disabled={props.disabled}
                  aria-disabled={props.disabled}
                  className={cx(`readonly:bg-gray-lighter readonly:cursor-not-allowed`)}
                  data-cy={`contact-careOf`}
                  {...register(`careOf`)}
                />
                {formState.errors.careOf && (
                  <div className="my-sm text-error">
                    <FormErrorMessage>{formState.errors.careOf?.message}</FormErrorMessage>
                  </div>
                )}
              </FormControl>
            </div>
            <div className="flex gap-lg">
              <FormControl id={`zip`} className="w-1/2">
                <FormLabel>Postnummer</FormLabel>
                <Input
                  size="sm"
                  disabled={props.disabled}
                  aria-disabled={props.disabled}
                  className={cx(`readonly:bg-gray-lighter readonly:cursor-not-allowed`)}
                  data-cy={`contact-zipCode`}
                  {...register(`zipCode`)}
                />

                {formState.errors.zipCode && (
                  <div className="my-sm text-error">
                    <FormErrorMessage>{formState.errors.zipCode?.message}</FormErrorMessage>
                  </div>
                )}
              </FormControl>
              <FormControl id={`zip`} className="w-1/2">
                <FormLabel>Stad</FormLabel>
                <Input
                  size="sm"
                  disabled={props.disabled}
                  aria-disabled={props.disabled}
                  className={cx(`readonly:bg-gray-lighter readonly:cursor-not-allowed`)}
                  data-cy={`contact-city`}
                  {...register(`city`)}
                />

                {formState.errors.city && (
                  <div className="my-sm text-error">
                    <FormErrorMessage>{formState.errors.city?.message}</FormErrorMessage>
                  </div>
                )}
              </FormControl>
            </div>
          </>
          <CommonNestedEmailArrayV2
            required={false}
            errand={supportErrand}
            addingStakeholder={true}
            disabled={props.disabled}
            error={!!formState.errors.emails}
            key={`nested-email-array`}
            {...{ control, register, errors, watch, setValue, trigger }}
          />
          <CommonNestedPhoneArrayV2
            disabled={props.disabled}
            error={!!formState.errors.phoneNumbers}
            key={`nested-phone-array`}
            {...{ control, register, errors, watch, setValue, trigger }}
          />
          {(formState.errors.emails || formState.errors.phoneNumbers) && (
            <div className="flex gap-lg my-sm text-error">
              <FormErrorMessage>
                {formState.errors.emails?.message || formState.errors.phoneNumbers?.message}
              </FormErrorMessage>
            </div>
          )}
          <div className="mt-md flex gap-lg justify-start">
            <div>
              <Button type="button" className="w-full" variant="secondary" color="primary" onClick={closeHandler}>
                Avbryt
              </Button>
            </div>
            <div>
              <Button
                type="button"
                data-cy="submit-contact-button"
                loading={loading}
                loadingText="Sparar"
                className="w-full"
                disabled={!formState.isValid}
                variant="primary"
                color="primary"
                onClick={handleSubmit(onSubmit, onError)}
              >
                {editing ? 'Ändra uppgifter' : 'Lägg till uppgifter'}
              </Button>
            </div>
          </div>
        </Modal.Content>
      </Modal>
    </div>
  );
};
