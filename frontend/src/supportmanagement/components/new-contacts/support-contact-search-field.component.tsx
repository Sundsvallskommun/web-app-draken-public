import {
  AddressResult,
  fetchPersonId,
  searchADUser,
  searchADUserByPersonNumber,
  searchOrganization,
  searchPerson,
} from '@common/services/adress-service';
import { luhnCheck } from '@common/services/helper-service';
import { appConfig } from '@config/appconfig';
import LucideIcon from '@sk-web-gui/lucide-icon';
import {
  Button,
  cx,
  FormControl,
  FormErrorMessage,
  FormLabel,
  Input,
  isArray,
  SearchField,
  Select,
} from '@sk-web-gui/react';
import { SupportStakeholderFormModel } from '@supportmanagement/services/support-errand-service';
import { UseFieldArrayAppend, UseFormReturn } from 'react-hook-form';

interface SupportSearchFieldProps {
  searchMode: string;
  disabled: boolean;
  form: UseFormReturn<SupportStakeholderFormModel>;
  manual: boolean;
  searchResult: boolean;
  notFound: boolean;
  setUnsaved: (unsaved: boolean) => void;
  id: string;
  setSearchResultArray: React.Dispatch<React.SetStateAction<AddressResult[]>>;
  setSelectedUser: React.Dispatch<React.SetStateAction<AddressResult>>;
  setSearchResult: React.Dispatch<React.SetStateAction<boolean>>;
  setQuery: React.Dispatch<React.SetStateAction<string>>;
  query: string;
  searching: boolean;
  searchResultArray: AddressResult[];
  setSearching: React.Dispatch<React.SetStateAction<boolean>>;
  setNotFound: React.Dispatch<React.SetStateAction<boolean>>;
  appendPhonenumber: UseFieldArrayAppend<SupportStakeholderFormModel, 'phoneNumbers'>;
  appendEmail: UseFieldArrayAppend<SupportStakeholderFormModel, 'emails'>;
}

export const SupportContactSearchField: React.FC<SupportSearchFieldProps> = ({
  searchMode,
  disabled,
  form,
  manual,
  searchResult,
  notFound,
  setUnsaved = () => {},
  id,
  setSearchResultArray,
  setSearchResult,
  setQuery,
  query,
  searching,
  searchResultArray,
  setSearching,
  setNotFound,
  setSelectedUser,
  appendPhonenumber,
  appendEmail,
}) => {
  const personNumber = form.watch(`personNumber`);
  const organizationNumber = form.watch(`organizationNumber`);

  const doSearch = (val: string) => {
    setSearchResult(false);
    let search: (val: string) => Promise<AddressResult | AddressResult[]>;

    if (searchMode === 'person') {
      form.setValue('personNumber', val);
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
            form.setValue(`externalId`, res.personId, { shouldDirty: true });
            form.setValue(`firstName`, res.firstName, { shouldDirty: true });
            form.setValue(`lastName`, res.lastName, { shouldDirty: true });
            form.setValue(`organizationName`, res.organizationName, {
              shouldDirty: true,
            });
            form.setValue(`address`, res.street, { shouldDirty: true });
            form.setValue(`careOf`, res.careof, { shouldDirty: true });
            form.setValue(`zipCode`, res.zip, { shouldDirty: true });
            form.setValue(`city`, res.city, { shouldDirty: true });
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
              form.setValue('username', res.loginName);
            }
            form.setValue('administrationCode', res.administrationCode);
            form.setValue('administrationName', res.administrationName);
            form.setValue('department', res.department);
            form.setValue('title', res.title);
            form.setValue('referenceNumber', res.referenceNumber);

            if (searchMode === 'enterprise') {
              form.setValue(`organizationName`, res.organizationName);
            }

            //moved to here so it doesnt select when empty (giving empty card, false email and phone data)
            form.clearErrors([`firstName`, `lastName`, `organizationName`]);
            setUnsaved(true);
            setSearching(false);
            setSearchResult(true);
          } else {
            form.clearErrors([`firstName`, `lastName`, `organizationName`]);
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

  const onSelectUserHandler = (e) => {
    const user = searchResultArray?.find((data) => `${data.firstName} ${data.lastName}` === e.target.value);
    setSelectedUser(user);
    setSearchResultArray([]);
    setQuery('');
  };

  return (
    <div className="flex gap-lg">
      <FormControl className="w-full">
        {appConfig.features.useOrganizationStakeholders ? (
          <FormLabel>
            Sök på {searchMode === 'person' ? 'personnummer (ååååmmddxxxx)' : 'organisationsnummer (kkllmm-nnnn)'}
          </FormLabel>
        ) : (
          <FormLabel>
            Sök på{' '}
            {searchMode === 'person' ? 'personnummer (ååååmmddxxxx)' : 'personnummer (ååååmmddxxxx) eller användarnamn'}
          </FormLabel>
        )}

        <div>
          <Input
            data-cy={`contact-personId`}
            {...form.register(`personId`)}
            type="hidden"
            readOnly
            className="w-full my-sm"
          />
          {searchMode === 'person' ? (
            <>
              <Input.Group size="md" className="rounded-12" disabled={disabled || manual}>
                <Input.LeftAddin icon>
                  <LucideIcon name="search" />
                </Input.LeftAddin>
                <Input
                  disabled={disabled}
                  aria-disabled={disabled}
                  readOnly={manual}
                  className="read-only:cursor-not-allowed"
                  data-cy={`contact-personNumber-${id}`}
                  {...form.register(`personNumber`, {
                    onChange: () => {
                      setUnsaved(true);
                    },
                  })}
                />
                <Input.RightAddin icon>
                  {searchResult ? (
                    <Button
                      iconButton
                      variant="primary"
                      disabled={disabled || manual}
                      inverted
                      onClick={() => {
                        form.reset();
                        form.setValue('personNumber', '');
                        setSearchResultArray([]);
                        setSearchResult(false);
                        form.setValue('stakeholderType', 'PERSON');
                      }}
                    >
                      <LucideIcon name="x" />
                    </Button>
                  ) : (
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={
                        disabled ||
                        (searchMode === 'person' && manual) ||
                        !!form.formState.errors?.personNumber ||
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
                {...form.register('personNumber')}
                size={'md'}
                value={query}
                onBlur={() => {
                  form.trigger(`personNumber`);
                }}
                onSearch={(e) => {
                  setSearching(true);
                  doSearch(e);
                }}
                onReset={() => {
                  form.reset();
                  setQuery('');
                  setSelectedUser(undefined);
                  form.setValue('personNumber', '');
                  setSearchResultArray([]);
                  setSearchResult(false);
                  form.setValue('stakeholderType', 'PERSON');
                }}
                searchLabel={searching ? 'Söker' : 'Sök'}
              />

              {searchResultArray.length ? (
                <div className="mt-8 flex w-full">
                  <Select onChange={(e) => onSelectUserHandler(e)} className="w-full">
                    <Select.Option>Välj person</Select.Option>
                    {searchResultArray.map((data, index) => (
                      <Select.Option className={cx('w-full')} key={index} value={`${data.firstName} ${data.lastName}`}>
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
              <Input.Group size="md" disabled={disabled || manual}>
                <Input.LeftAddin icon>
                  <LucideIcon name="search" />
                </Input.LeftAddin>
                <Input
                  disabled={disabled}
                  aria-disabled={disabled}
                  readOnly={manual}
                  className="read-only:cursor-not-allowed"
                  onChange={() => {
                    setUnsaved(true);
                  }}
                  data-cy={`contact-orgNumber-${id}`}
                  {...form.register(`organizationNumber`)}
                />
                <Input.RightAddin icon>
                  {searchResult ? (
                    <Button
                      iconButton
                      variant="primary"
                      disabled={disabled || manual}
                      inverted
                      onClick={() => {
                        form.reset();
                        form.setValue('organizationNumber', '');
                        setSearchResult(false);
                        form.setValue('stakeholderType', 'ORGANIZATION');
                      }}
                    >
                      <LucideIcon name="x" />
                    </Button>
                  ) : (
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={
                        disabled || manual || !!form.formState.errors?.organizationNumber || organizationNumber === ''
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

        {notFound || form.formState.errors.personNumber || form.formState.errors.organizationNumber ? (
          <div className="my-sm text-error">
            {notFound ? (
              <FormErrorMessage className="text-error" data-cy="not-found-error-message">
                Sökningen gav ingen träff
              </FormErrorMessage>
            ) : (
              <>
                {form.formState.errors.personNumber && (
                  <FormErrorMessage className="text-error" data-cy="personal-number-error-message">
                    {form.formState.errors.personNumber?.message as string}
                  </FormErrorMessage>
                )}
                {form.formState.errors.organizationNumber && (
                  <FormErrorMessage className="text-error" data-cy="org-number-error-message">
                    {form.formState.errors.organizationNumber?.message as string}
                  </FormErrorMessage>
                )}
              </>
            )}
          </div>
        ) : null}
      </FormControl>
    </div>
  );
};
