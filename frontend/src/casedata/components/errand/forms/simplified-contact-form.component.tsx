import { Channels } from '@casedata/interfaces/channels';
import { MEXRelation, PTRelation, Role } from '@casedata/interfaces/role';

import { CasedataOwnerOrContact } from '@casedata/interfaces/stakeholder';
import { getErrand } from '@casedata/services/casedata-errand-service';
import { addStakeholder, editStakeholder } from '@casedata/services/casedata-stakeholder-service';
import CommonNestedEmailArrayV2 from '@common/components/commonNestedEmailArrayV2';
import CommonNestedPhoneArrayV2 from '@common/components/commonNestedPhoneArrayV2';
import { useAppContext } from '@common/contexts/app.context';
import {
  AddressResult,
  fetchPersonId,
  isValidOrgNumber,
  searchOrganization,
  searchPerson,
} from '@common/services/adress-service';
import { isMEX, isPT } from '@common/services/application-service';
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
import { yupResolver } from '@hookform/resolvers/yup';
import LucideIcon from '@sk-web-gui/lucide-icon';
import {
  Button,
  FormControl,
  FormErrorMessage,
  FormLabel,
  Input,
  Modal,
  RadioButton,
  Select,
  cx,
  isArray,
  useSnackbar,
} from '@sk-web-gui/react';
import { useEffect, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import * as yup from 'yup';

export const emptyContact: CasedataOwnerOrContact = {
  id: undefined,
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
  newPhoneNumber: '+46',
  phoneNumbers: [],
  newEmail: '',
  emails: [],
};

export const SimplifiedContactForm: React.FC<{
  allowOrganization?: boolean;
  allowRelation?: boolean;
  contact: CasedataOwnerOrContact;
  setUnsaved: (unsaved: boolean) => void;
  disabled?: boolean;
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
    label = '',
    id,
  } = props;

  const yupContact = yup.object().shape(
    {
      id: yup.string(),
      personalNumber: yup.string().when('stakeholderType', {
        is: (type: string) => type === 'PERSON',
        then: yup
          .string()
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
        is: (_: string) => searchMode === 'person',
        then: yup.string().required('Förnamn måste anges'),
      }),
      lastName: yup.string().when('organizationName', {
        is: (_: string) => searchMode === 'person',
        then: yup.string().required('Efternamn måste anges'),
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
      phoneNumbers: isPT()
        ? yup.array().of(
            yup.object().shape({
              value: yup
                .string()
                .trim()
                .transform((val) => val.replace('-', ''))
                .matches(phonePattern, invalidPhoneMessage),
            })
          )
        : yup
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
            .min(1, 'Ange minst en e-postadress och ett telefonnummer'),

      newEmail: yup.string().trim().email('E-postadress har fel format'),
      emails: isPT()
        ? yup.array().of(
            yup.object().shape({
              value: yup.string().trim().email('E-postadress har fel format'),
            })
          )
        : yup
            .array()
            .of(
              yup.object().shape({
                value: yup.string().trim().email('E-postadress har fel format'),
              })
            )
            .min(1, 'Ange minst en e-postadress och ett telefonnummer'),
      primaryContact: yup.boolean(),
      messageAllowed: yup.boolean(),
      roles: yup.array().of(yup.string()),
    },
    [
      ['emails', 'phoneNumbers'],
      ['firstName', 'organizationName'],
      ['lastName', 'organizationName'],
    ]
  );

  const { municipalityId, errand, setErrand, user } = useAppContext();
  const [searchMode, setSearchMode] = useState('person');
  const [searching, setSearching] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [manual, setManual] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [searchResult, setSearchResult] = useState(false);
  const [loading, setIsLoading] = useState(false);

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
    getValues,
    clearErrors,
    trigger,
    reset,
    formState: { errors },
  } = useForm<CasedataOwnerOrContact>({
    resolver: yupResolver(yupContact),
    defaultValues: contact,
    mode: 'onChange', // NOTE: Needed if we want to disable submit until valid
  });

  const personId = watch(`personId`);
  const firstName = watch(`firstName`);
  const lastName = watch(`lastName`);
  const street = watch(`street`);
  const careof = watch(`careof`);
  const zip = watch(`zip`);
  const city = watch(`city`);
  const organizationName = watch(`organizationName`);
  const emails = watch(`emails`);
  const newPhoneNumber = watch(`newPhoneNumber`);
  const phoneNumbers = watch(`phoneNumbers`);
  const personalNumber = watch(`personalNumber`);
  const organizationNumber = watch(`organizationNumber`);
  const stakeholderType = watch(`stakeholderType`);
  const toastMessage = useSnackbar();

  const { append: appendPhonenumber, replace: replacePhonenumbers } = useFieldArray({
    control,
    name: `phoneNumbers`,
  });

  // Restricted editing means that personalNumber, firstName, lastName,
  // organizationNam and orgName cannot be changed.
  const editing = !!contact.id;
  const restrictedEditing = editing && errand.channel !== Channels.WEB_UI;

  const resetPersonNumber = () => {
    setValue(`personalNumber`, '', { shouldDirty: false });
    setValue(`personId`, '', { shouldDirty: false });
  };

  useEffect(() => {
    if (manual && !editing) {
      resetPersonNumber();
    }
  }, [manual]);

  useEffect(() => {
    setSearchMode(contact.stakeholderType === 'PERSON' ? 'person' : 'enterprise');
    if (!contact.id) {
      setValue(`stakeholderType`, contact.stakeholderType);
    }
    setValue(`newRole`, contact.roles[0]);
  }, [errand, contact]);

  const validEmailOrPhonenumberExists = () =>
    (emails && emails.length > 0 && !errors.emails) || (phoneNumbers && phoneNumbers.length > 0);

  useEffect(() => {
    if (!validEmailOrPhonenumberExists()) {
      // setValue(`messageAllowed`, false);
    }
  }, [emails, phoneNumbers]);

  useEffect(() => {
    if (
      (manual || editing) &&
      (formState.dirtyFields?.firstName || formState.dirtyFields?.lastName || formState.dirtyFields?.organizationName)
    ) {
      resetPersonNumber();
    }
  }, [firstName, lastName, organizationName]);

  const onSubmit = () => {
    setIsLoading(true);
    let apiCall;
    if (contact.id) {
      apiCall = editStakeholder;
    } else {
      apiCall = addStakeholder;
    }
    apiCall(municipalityId, errand.id.toString(), getValues())
      .then((res) => {
        getErrand(municipalityId, errand.id.toString()).then((res) => {
          setErrand(res.errand);
          toastMessage({
            position: 'bottom',
            closeable: false,
            message: 'Ärendepersonen sparades',
            status: 'success',
          });
          onClose();
          setModalOpen(false);
          setManual(false);
          reset();
          setValue('personalNumber', '');
          setValue('organizationNumber', '');
          setSearchResult(false);
          setSearchMode('person');
          setIsLoading(false);
        });
      })
      .catch((error) => {
        console.error('Error:', error);
        toastMessage({
          message: 'Något gick fel när ärendeintressenten sparades',
          status: 'error',
        });
        setIsLoading(false);
      });
  };

  const onError = () => {};

  const doSearch = (e) => {
    let search: () => Promise<AddressResult | AddressResult[]>;
    search =
      searchMode === 'person'
        ? () => searchPerson(personalNumber)
        : searchMode === 'enterprise' || searchMode === 'organization'
        ? () => searchOrganization(organizationNumber)
        : undefined;
    setSearching(true);
    setSearchResult(false);
    setNotFound(false);
    search &&
      search()
        .then((res) => {
          if (!isArray(res)) {
            setValue(`personId`, res.personId, { shouldDirty: true });
            setValue(`firstName`, res.firstName, { shouldDirty: true });
            setValue(`lastName`, res.lastName, { shouldDirty: true });
            setValue(`organizationName`, res.organizationName, {
              shouldDirty: true,
            });
            setValue(`street`, res.street, { shouldDirty: true });
            setValue(`careof`, res.careof, { shouldDirty: true });
            setValue(`zip`, res.zip, { shouldDirty: true });
            setValue(`city`, res.city, { shouldDirty: true });
            if (res.phone) {
              appendPhonenumber({ value: res.phone });
            }
            clearErrors([`firstName`, `lastName`, `organizationName`]);
            setSearching(false);
            setSearchResult(true);
          } else {
            clearErrors([`firstName`, `lastName`, `organizationName`]);
            setUnsaved(true);
            setSearching(false);
          }
        })
        .catch((e) => {
          setSearching(false);
          setNotFound(true);
          setSearchResult(false);
        });
  };

  const searchModeSelector = (inName) => (
    <fieldset className="flex mt-ms mb-md gap-lg justify-start">
      <legend className="text-md my-sm contents"></legend>
      <Input type="hidden" {...register(`stakeholderType`)} />
      <RadioButton
        data-cy={`search-person-${inName}`}
        size="lg"
        className="mr-sm"
        name={`stakeholderType-${id}`}
        id={`searchPerson-${id}-${inName}`}
        value={'PERSON'}
        checked={searchMode === 'person'}
        onChange={() => {}}
        onClick={(e) => {
          setSearchMode('person');
          replacePhonenumbers([]);
          setValue('city', '');
          setValue('zip', '');
          setValue('careof', '');
          setValue('street', '');
          clearErrors(['organizationNumber']);
          setTimeout(() => {
            setValue(`organizationName`, '', { shouldDirty: false });
            setValue(`organizationNumber`, '', { shouldDirty: false });
            setValue(`stakeholderType`, 'PERSON', { shouldDirty: true });
            setSearchResult(false);
            clearErrors(['phoneNumbers']);
          }, 0);
        }}
      >
        Privat
      </RadioButton>
      <RadioButton
        data-cy={`search-enterprise-${id}-${inName}`}
        size="lg"
        className="mr-sm"
        name={`stakeholderType-${id}`}
        id={`searchEnterprise-${id}-${inName}`}
        value={'ENTERPRISE'}
        onChange={() => {}}
        checked={searchMode === 'enterprise'}
        onClick={(e) => {
          setSearchMode('enterprise');
          if (stakeholderType === 'PERSON') {
            replacePhonenumbers([]);
            setValue('city', '');
            setValue('zip', '');
            setValue('careof', '');
            setValue('street', '');
            clearErrors(['personalNumber']);
            setTimeout(() => {
              setValue(`personalNumber`, '', { shouldDirty: false });
              setValue(`personId`, '', { shouldDirty: false });
              setValue(`firstName`, '', { shouldDirty: false });
              setValue(`lastName`, '', { shouldDirty: false });
              setValue(`stakeholderType`, 'ORGANIZATION', { shouldDirty: true });
              clearErrors(['phoneNumbers']);
              setSearchResult(false);
            }, 0);
          }
        }}
      >
        Företag
      </RadioButton>
      <RadioButton
        data-cy={`search-organization-${inName}`}
        size="lg"
        className="mr-sm"
        name={`stakeholderType-${id}`}
        id={`searchOrganization-${id}-${inName}`}
        value={'ORGANIZATION'}
        onChange={() => {}}
        checked={searchMode === 'organization'}
        onClick={(e) => {
          setSearchMode('organization');
          replacePhonenumbers([]);
          setValue('city', '');
          setValue('zip', '');
          setValue('careof', '');
          setValue('street', '');
          clearErrors(['personalNumber']);
          if (stakeholderType === 'PERSON') {
            setTimeout(() => {
              setValue(`personalNumber`, '', { shouldDirty: false });
              setValue(`personId`, '', { shouldDirty: false });
              setValue(`firstName`, '', { shouldDirty: false });
              setValue(`lastName`, '', { shouldDirty: false });
              setValue(`stakeholderType`, 'ORGANIZATION', { shouldDirty: true });
              clearErrors(['phoneNumbers']);
              setSearchResult(false);
            }, 0);
          }
        }}
      >
        Förening
      </RadioButton>
    </fieldset>
  );

  return (
    <div data-cy={`contact-form`} key={contact.id}>
      <div className="invisible">
        <FormControl id={`id`}>
          <Input data-cy={`contact-id`} {...register(`id`)} type="hidden" />
        </FormControl>
      </div>

      {allowOrganization ? searchModeSelector('form') : null}

      {!restrictedEditing ? (
        <div className="flex gap-lg">
          {!editing ? (
            <FormControl className="w-full">
              <FormLabel>
                Sök på {searchMode === 'person' ? 'personnummer (ååååmmddxxxx)' : 'organisationsnummer (kkllmm-nnnn)'}
              </FormLabel>
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
                      <Input
                        placeholder=""
                        disabled={props.disabled}
                        aria-disabled={props.disabled}
                        readOnly={manual}
                        className="read-only:cursor-not-allowed"
                        onChange={() => setUnsaved(true)}
                        data-cy={`contact-personalNumber-${id}`}
                        onBlur={() => {
                          personalNumber &&
                            personalNumber !== '' &&
                            fetchPersonId(personalNumber).then((res) => {
                              setValue(`personId`, res.personId, { shouldDirty: true });
                              trigger(`personalNumber`);
                            });
                        }}
                        {...register(`personalNumber`)}
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
                              setValue('personalNumber', '');
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
                              !!formState.errors?.personalNumber ||
                              personalNumber === ''
                            }
                            data-cy={`search-button-${id}`}
                            onClick={doSearch}
                            loading={searching}
                            loadingText="Söker"
                          >
                            Sök
                          </Button>
                        )}
                      </Input.RightAddin>
                    </Input.Group>
                  </>
                ) : (
                  <>
                    <Input.Group size="md" disabled={props.disabled || manual}>
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
                            onClick={doSearch}
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

              {notFound || formState.errors.personalNumber || formState.errors.organizationNumber ? (
                <div className="my-sm text-error">
                  {notFound && (
                    <FormErrorMessage className="text-error" data-cy="not-found-error-message">
                      Sökningen gav ingen träff
                    </FormErrorMessage>
                  )}
                  {formState.errors.personalNumber && (
                    <FormErrorMessage className="text-error" data-cy="personal-number-error-message">
                      {formState.errors.personalNumber?.message as string}
                    </FormErrorMessage>
                  )}
                  {formState.errors.organizationNumber && (
                    <FormErrorMessage className="text-error" data-cy={`org-number-error-message-${id}`}>
                      {formState.errors.organizationNumber?.message as string}
                    </FormErrorMessage>
                  )}
                </div>
              ) : null}
            </FormControl>
          ) : null}
        </div>
      ) : null}

      {searchResult ? (
        <>
          <div data-cy={`organization-search-result`} className="bg-content-main border rounded-16 p-16 mt-20 relative">
            {searchMode === 'person' && (firstName || lastName) ? (
              <>
                {firstName || lastName ? (
                  <p className="my-xs mt-0 font-bold" data-cy={`stakeholder-name`}>
                    {`${firstName} ${lastName}`}
                  </p>
                ) : null}
                {organizationName ? (
                  <p className="my-xs mt-0" data-cy={`stakeholder-orgname`}>
                    {organizationName}
                  </p>
                ) : null}
                <p className="my-xs mt-0" data-cy={`stakeholder-ssn`}>
                  {personalNumber || '(personnummer saknas)'}
                </p>
                <p className="my-xs mt-0" data-cy={`stakeholder-adress`}>
                  {street || zip || city ? `${street} ${zip} ${city}` : '(address saknas)'}
                </p>
                <p className="my-xs w-1/2" data-cy={`stakeholder-phone`}>
                  {phoneNumbers?.length === 0 ? <em>Telefonnummer saknas</em> : null}
                </p>
              </>
            ) : (searchMode === 'organization' || searchMode === 'enterprise') && organizationName ? (
              <>
                <p className="my-xs mt-0">{organizationName}</p>
                <p className="my-xs mt-0" data-cy={`stakeholder-ssn`}>
                  {organizationNumber || '(orgnummer saknas)'}
                </p>
                <p className="my-xs mt-0">
                  {street}, {zip} {city}
                </p>
              </>
            ) : null}
            <>
              <div className="my-md">
                <CommonNestedEmailArrayV2
                  addingStakeholder={true}
                  errand={errand}
                  disabled={props.disabled}
                  required={!isPT()}
                  error={!!formState.errors.emails}
                  key={`nested-email-array`}
                  {...{ control, register, errors, watch, setValue, trigger }}
                />
              </div>
              <div className="my-md">
                <CommonNestedPhoneArrayV2
                  disabled={props.disabled}
                  required={!isPT()}
                  error={!!formState.errors.phoneNumbers}
                  key={`nested-phone-array`}
                  {...{ control, register, errors, watch, setValue, trigger }}
                />
              </div>

              {allowRelation ? (
                <FormControl id={`contact-relation`} size="sm" className="w-full">
                  <FormLabel>Roll</FormLabel>
                  <Select
                    data-cy={`roll-select`}
                    disabled={props.disabled}
                    {...register(`relation`)}
                    className={cx(formState.errors.relation ? 'border-2 border-error' : null, 'w-full')}
                  >
                    <Select.Option key="" value="">
                      Välj roll
                    </Select.Option>
                    {Object.entries(isMEX() ? MEXRelation : isPT() ? PTRelation : [])
                      .sort((a, b) => (a[1] > b[1] ? 1 : -1))
                      .map(([key, relation]) => {
                        return (
                          <Select.Option key={key} value={key}>
                            {relation}
                          </Select.Option>
                        );
                      })}
                  </Select>

                  {errors && formState.errors.relation && (
                    <div className="my-sm text-error">
                      <FormErrorMessage>{formState.errors.relation?.message}</FormErrorMessage>
                    </div>
                  )}
                </FormControl>
              ) : (
                <div className="w-1/2"></div>
              )}

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
                leftIcon={<LucideIcon name="plus"></LucideIcon>}
              >
                {label}
              </Button>
            </>
          </div>
        </>
      ) : null}

      {editing ? null : (
        <div className="">
          <Button
            className="mt-20"
            color="vattjom"
            variant="link"
            onClick={() => setManual(true)}
            disabled={props.disabled}
          >
            {label} manuellt
          </Button>
        </div>
      )}

      <Modal show={manual || editing} className="w-[56rem]" onClose={closeHandler} label={label}>
        <Modal.Content className="p-0">
          {allowOrganization ? searchModeSelector('modal') : null}
          {searchMode === 'person' ? (
            <>
              <div className="flex gap-lg">
                <FormControl id={`contact-personnumber`} className="w-1/2">
                  <FormLabel>Personnummer</FormLabel>
                  <Input
                    size="sm"
                    disabled={props.disabled}
                    readOnly
                    data-cy={`contact-personalNumber`}
                    className={cx(
                      formState.errors.personalNumber ? 'border-2 border-error' : null,
                      'read-only:bg-gray-lighter read-only:cursor-not-allowed'
                    )}
                    {...register(`personalNumber`)}
                  />

                  {errors && formState.errors.personalNumber && (
                    <div className="my-sm text-error">
                      <FormErrorMessage>{formState.errors.personalNumber?.message}</FormErrorMessage>
                    </div>
                  )}
                </FormControl>
                {allowRelation ? (
                  <FormControl id={`contact-relation`} className="w-1/2" size="sm">
                    <FormLabel>Roll</FormLabel>
                    <Select
                      data-cy={`roll-select`}
                      disabled={props.disabled}
                      {...register(`relation`)}
                      className="w-full"
                    >
                      <Select.Option key="" value="">
                        Välj roll
                      </Select.Option>
                      {Object.entries(isMEX() ? MEXRelation : isPT() ? PTRelation : [])
                        .sort((a, b) => (a[1] > b[1] ? 1 : -1))
                        .map(([key, relation]) => {
                          return (
                            <Select.Option key={key} value={key}>
                              {relation}
                            </Select.Option>
                          );
                        })}
                    </Select>

                    {errors && formState.errors.relation && (
                      <div className="my-sm text-error">
                        <FormErrorMessage>{formState.errors.relation?.message}</FormErrorMessage>
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
                    Efternamn<span aria-hidden="true">*</span>
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
            <>
              <div className="flex gap-lg">
                <FormControl id={`organizationNumber`} className="w-1/2">
                  <FormLabel>Organisationsnummer</FormLabel>
                  <Input
                    size="sm"
                    disabled={props.disabled}
                    data-cy={`contact-organizationNumber`}
                    className={cx(
                      formState.errors.organizationNumber ? 'border-2 border-error' : null,
                      'read-only:bg-gray-lighter read-only:cursor-not-allowed'
                    )}
                    {...register(`organizationNumber`)}
                  />

                  {formState.errors.organizationNumber && (
                    <div className="my-sm text-error">
                      <FormErrorMessage>{formState.errors.organizationNumber?.message}</FormErrorMessage>
                    </div>
                  )}
                </FormControl>
                {allowRelation ? (
                  <FormControl id={`contact-relation`} className="w-1/2" size="sm">
                    <FormLabel>Roll</FormLabel>
                    <Select
                      data-cy={`roll-select`}
                      disabled={props.disabled}
                      {...register(`relation`)}
                      className={cx(formState.errors.relation ? 'border-2 border-error' : null, 'w-full')}
                    >
                      <Select.Option key="" value="">
                        Välj roll
                      </Select.Option>
                      {Object.entries(isMEX() ? MEXRelation : isPT() ? PTRelation : [])
                        .sort((a, b) => (a[1] > b[1] ? 1 : -1))
                        .map(([key, relation]) => {
                          return (
                            <Select.Option key={key} value={key}>
                              {relation}
                            </Select.Option>
                          );
                        })}
                    </Select>

                    {errors && formState.errors.relation && (
                      <div className="my-sm text-error">
                        <FormErrorMessage>{formState.errors.relation?.message}</FormErrorMessage>
                      </div>
                    )}
                  </FormControl>
                ) : (
                  <div className="w-1/2"></div>
                )}
              </div>
              <FormControl id={`organizationName`} className="w-full">
                <FormLabel>Organisationsnamn</FormLabel>
                <Input
                  size="sm"
                  disabled={props.disabled}
                  readOnly={editing && restrictedEditing}
                  data-cy={`contact-organizationName`}
                  className={cx(
                    formState.errors.organizationName ? 'border-2 border-error' : null,
                    'read-only:bg-gray-lighter read-only:cursor-not-allowed'
                  )}
                  {...register(`organizationName`)}
                />

                {formState.errors.organizationName && (
                  <div className="my-sm text-error">
                    <FormErrorMessage>{formState.errors.organizationName?.message}</FormErrorMessage>
                  </div>
                )}
              </FormControl>
            </>
          )}
          <>
            <div className="flex gap-lg">
              <FormControl id={`street`} className="w-1/2">
                <FormLabel>Adress</FormLabel>
                <Input
                  size="sm"
                  disabled={props.disabled}
                  aria-disabled={props.disabled}
                  className={cx(`readonly:bg-gray-lighter readonly:cursor-not-allowed`)}
                  data-cy={`contact-street`}
                  {...register(`street`)}
                />

                {formState.errors.street && (
                  <div className="my-sm text-error">
                    <FormErrorMessage>{formState.errors.street?.message}</FormErrorMessage>
                  </div>
                )}
              </FormControl>
              <FormControl id={`careof`} className="w-1/2">
                <FormLabel>C/o-adress</FormLabel>
                <Input
                  size="sm"
                  disabled={props.disabled}
                  aria-disabled={props.disabled}
                  className={cx(`readonly:bg-gray-lighter readonly:cursor-not-allowed`)}
                  data-cy={`contact-careof`}
                  {...register(`careof`)}
                />
                {formState.errors.careof && (
                  <div className="my-sm text-error">
                    <FormErrorMessage>{formState.errors.careof?.message}</FormErrorMessage>
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
                  data-cy={`contact-zip`}
                  {...register(`zip`)}
                />

                {formState.errors.zip && (
                  <div className="my-sm text-error">
                    <FormErrorMessage>{formState.errors.zip?.message}</FormErrorMessage>
                  </div>
                )}
              </FormControl>
              <FormControl id={`city`} className="w-1/2">
                <FormLabel>Ort</FormLabel>
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
            addingStakeholder={true}
            errand={errand}
            disabled={props.disabled}
            required={!isPT()}
            error={!!formState.errors.emails}
            key={`nested-email-array`}
            {...{ control, register, errors, watch, setValue, trigger }}
          />
          <CommonNestedPhoneArrayV2
            disabled={props.disabled}
            required={!isPT()}
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
                loading={loading}
                loadingText="Sparar"
                className="w-full"
                variant="primary"
                color="primary"
                onClick={handleSubmit(onSubmit, onError)}
                data-cy="contact-form-save-button"
              >
                {editing ? 'Spara uppgifter' : label}
              </Button>
            </div>
          </div>
        </Modal.Content>
      </Modal>
    </div>
  );
};
