import { CasedataOwnerOrContact } from '@casedata/interfaces/stakeholder';
import { AddressResult, searchOrganization, searchPerson } from '@common/services/adress-service';
import LucideIcon from '@sk-web-gui/lucide-icon';
import { Button, FormControl, FormErrorMessage, FormLabel, Input, isArray, SearchField } from '@sk-web-gui/react';
import { useState } from 'react';
import { UseFieldArrayAppend, UseFormReturn } from 'react-hook-form';

interface SearchFieldProps {
  searchMode: string;
  disabled?: boolean;
  form: UseFormReturn<CasedataOwnerOrContact>;
  notFound: boolean;
  setUnsaved: (unsaved: boolean) => void;
  id: string;
  setSearchResult: React.Dispatch<React.SetStateAction<boolean>>;
  searching: boolean;
  setSearching: React.Dispatch<React.SetStateAction<boolean>>;
  setNotFound: React.Dispatch<React.SetStateAction<boolean>>;
  appendPhonenumber: UseFieldArrayAppend<CasedataOwnerOrContact, 'phoneNumbers'>;
}

export const ContactSearchField: React.FC<SearchFieldProps> = ({
  searchMode,
  disabled,
  form,
  notFound,
  setUnsaved = () => {},
  id,
  setSearchResult,
  searching,
  setSearching,
  setNotFound,
  appendPhonenumber,
}) => {
  const { register, formState, setValue, reset, clearErrors } = form;
  const personalNumber = form.watch(`personalNumber`);
  const organizationNumber = form.watch(`organizationNumber`);

  const doSearch = () => {
    let search: () => Promise<AddressResult | AddressResult[]>;
    search =
      searchMode === 'person' && personalNumber
        ? () => searchPerson(personalNumber)
        : (searchMode === 'enterprise' || searchMode === 'organization') && organizationNumber
        ? () => searchOrganization(organizationNumber)
        : async () => [];
    setSearching(true);
    setSearchResult(false);
    setNotFound(false);
    search?.()
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

  return (
    <div className="flex gap-lg">
      <FormControl className="w-full">
        <div>
          <FormLabel>Sök på {searchMode === 'person' ? 'personnummer ' : 'organisationsnummer '}</FormLabel>
          <span>(Ange {searchMode === 'person' ? '12 siffror: ååååmmddxxxx' : '10 siffror: kkllmm-nnnn'})</span>
        </div>
        <div>
          <Input
            data-cy={`contact-personId`}
            {...register(`personId`)}
            type="hidden"
            readOnly
            className="w-full my-sm"
          />
          {searchMode === 'person' ? (
            <SearchField
              className="max-w-[52rem]"
              disabled={disabled}
              data-cy={`contact-personalNumber-${id}`}
              {...form.register('personalNumber')}
              size={'md'}
              value={''}
              onBlur={() => {
                form.trigger(`personalNumber`);
              }}
              onSearch={() => {
                if (form.formState.errors.personalNumber) return;
                doSearch();
              }}
              onReset={() => {
                reset();
                setValue('personalNumber', '');
                setSearchResult(false);
                setValue('stakeholderType', 'PERSON');
              }}
              searchLabel={searching ? 'Söker' : 'Sök'}
            />
          ) : (
            <SearchField
              className="max-w-[52rem]"
              disabled={disabled}
              data-cy={`contact-personalNumber-${id}`}
              {...form.register('organizationNumber')}
              size={'md'}
              value={''}
              onBlur={() => {
                form.trigger(`organizationNumber`);
              }}
              onSearch={() => {
                if (form.formState.errors.organizationNumber) return;
                doSearch();
              }}
              onReset={() => {
                reset();
                setValue('organizationNumber', '');
                setSearchResult(false);
                setValue('stakeholderType', 'ORGANIZATION');
              }}
              searchLabel={searching ? 'Söker' : 'Sök'}
            />
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
    </div>
  );
};
