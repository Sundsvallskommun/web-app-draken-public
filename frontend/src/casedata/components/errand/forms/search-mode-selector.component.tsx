import { CasedataOwnerOrContact } from '@casedata/interfaces/stakeholder';
import { Input, RadioButton } from '@sk-web-gui/react';
import { UseFieldArrayReplace, UseFormReturn } from 'react-hook-form';

interface SearchModeSelectorProps {
  inName: string;
  searchMode: string;
  form: UseFormReturn<CasedataOwnerOrContact>;
  id: string;
  setSearchMode: React.Dispatch<React.SetStateAction<string>>;
  setSearchResult: React.Dispatch<React.SetStateAction<boolean>>;
  replacePhonenumbers: UseFieldArrayReplace<CasedataOwnerOrContact, 'phoneNumbers'>;
}

export const SearchModeSelector: React.FC<SearchModeSelectorProps> = ({
  inName,
  searchMode,
  form,
  id,
  setSearchMode,
  setSearchResult,
  replacePhonenumbers,
}) => {
  const { register, setValue, clearErrors, watch } = form;
  const stakeholderType = watch(`stakeholderType`);

  return (
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
};
