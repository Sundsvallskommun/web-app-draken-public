import {
  AddressResult,
  searchADUser,
  searchADUserByPersonNumber,
  searchOrganization,
  searchPerson,
} from '@common/services/adress-service';
import { luhnCheck } from '@common/services/helper-service';
import { appConfig } from '@config/appconfig';
import { cx, FormControl, FormErrorMessage, FormLabel, Input, isArray, SearchField, Select } from '@sk-web-gui/react';
import { SupportStakeholderFormModel } from '@supportmanagement/services/support-errand-service';
import { UseFieldArrayAppend, UseFormReturn } from 'react-hook-form';

interface SupportSearchFieldProps {
  searchMode: string;
  disabled: boolean;
  form: UseFormReturn<SupportStakeholderFormModel>;
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
          <div>
            <FormLabel>Sök på {searchMode === 'person' ? 'personnummer ' : 'organisationsnummer '}</FormLabel>
            <span>(Ange {searchMode === 'person' ? '12 siffror: ååååmmddxxxx' : '10 siffror: kkllmm-nnnn'})</span>
          </div>
        ) : (
          <div>
            <FormLabel>Sök på personnummer </FormLabel>
            <span>(Ange 12 siffror: ååååmmddxxxx{searchMode === 'employee' ? ' eller användarnamn' : ''})</span>
          </div>
        )}

        <div>
          <Input
            data-cy={`contact-personId`}
            {...form.register(`personId`)}
            type="hidden"
            readOnly
            className="w-full my-sm"
          />
          {searchMode === 'person' || searchMode === 'employee' ? (
            <>
              <SearchField
                className="max-w-[52rem]"
                disabled={disabled}
                data-cy={`contact-personNumber-${id}`}
                {...form.register('personNumber')}
                size={'md'}
                value={query}
                onBlur={() => {
                  form.trigger(`personNumber`);
                }}
                onSearch={(e) => {
                  if (form.formState.errors.personNumber) return;
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
            <SearchField
              className="max-w-[52rem]"
              disabled={disabled}
              data-cy={`contact-orgNumber-${id}`}
              {...form.register('organizationNumber')}
              size={'md'}
              value={query}
              onBlur={() => {
                form.trigger(`organizationNumber`);
              }}
              onSearch={(e) => {
                if (form.formState.errors.organizationNumber) return;
                setSearching(true);
                doSearch(e);
              }}
              onReset={() => {
                form.reset();
                setQuery('');
                setSelectedUser(undefined);
                form.setValue('organizationNumber', '');
                setSearchResultArray([]);
                setSearchResult(false);
                form.setValue('stakeholderType', 'ORGANIZATION');
              }}
              searchLabel={searching ? 'Söker' : 'Sök'}
            />
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
