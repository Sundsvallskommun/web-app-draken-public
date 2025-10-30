import { CasedataOwnerOrContact } from '@casedata/interfaces/stakeholder';
import { FormLabel, Input, RadioButton } from '@sk-web-gui/react';
import { UseFieldArrayReplace, UseFormReturn } from 'react-hook-form';

interface SearchModeSelectorProps {
  inName: string;
  searchMode: string;
  form: UseFormReturn<CasedataOwnerOrContact>;
  id: string;
  label: string;
  setSearchMode: React.Dispatch<React.SetStateAction<string>>;
  setSearchResult: React.Dispatch<React.SetStateAction<boolean>>;
  replacePhonenumbers: UseFieldArrayReplace<CasedataOwnerOrContact, 'phoneNumbers'>;
}

export const SearchModeSelector: React.FC<SearchModeSelectorProps> = ({
  inName,
  searchMode,
  form,
  id,
  label,
  setSearchMode,
  setSearchResult,
  replacePhonenumbers,
}) => {
  const { register, setValue, clearErrors, watch } = form;
  const stakeholderType = watch(`stakeholderType`);

  const clearCommonFields = () => {
    replacePhonenumbers([]);
    setValue('city', '');
    setValue('zip', '');
    setValue('careof', '');
    setValue('street', '');
    clearErrors(['phoneNumbers']);
    setSearchResult(false);
  };

  const clearFields = (type: 'PERSON' | 'ORGANIZATION') => {
    clearCommonFields();
    setTimeout(() => {
      if (type === 'PERSON') {
        clearErrors(['organizationNumber']);
        setValue('organizationName', '', { shouldDirty: false });
        setValue('organizationNumber', '', { shouldDirty: false });
        setValue('stakeholderType', 'PERSON', { shouldDirty: true });
      } else {
        clearErrors(['personalNumber']);
        setValue('personalNumber', '', { shouldDirty: false });
        setValue('personId', '', { shouldDirty: false });
        setValue('firstName', '', { shouldDirty: false });
        setValue('lastName', '', { shouldDirty: false });
        setValue('stakeholderType', 'ORGANIZATION', { shouldDirty: true });
      }
    }, 0);
  };

  return (
    <fieldset className="flex mt-ms mb-md gap-lg justify-start">
      <Input type="hidden" {...register(`stakeholderType`)} />
      <div className="flex flex-col">
        <FormLabel className="mb-12">Välj typ av {label.toLocaleLowerCase()}</FormLabel>
        <RadioButton.Group inline>
          <RadioButton
            data-cy={`search-person-${inName}`}
            size="sm"
            className="mr-sm"
            value={'PERSON'}
            key={'PERSON'}
            checked={searchMode === 'person'}
            onChange={() => {}}
            onClick={(e) => {
              setSearchMode('person');
              if (stakeholderType === 'ORGANIZATION') {
                clearFields('PERSON');
              }
            }}
          >
            Privat
          </RadioButton>
          <RadioButton
            data-cy={`search-enterprise-${id}-${inName}`}
            size="sm"
            className="mr-sm"
            value={'ENTERPRISE'}
            key={'ENTERPRISE'}
            onChange={() => {}}
            checked={searchMode === 'enterprise'}
            onClick={(e) => {
              setSearchMode('enterprise');
              if (stakeholderType === 'PERSON') {
                clearFields('ORGANIZATION');
              }
            }}
          >
            Företag
          </RadioButton>
          <RadioButton
            data-cy={`search-organization-${inName}`}
            size="sm"
            className="mr-sm"
            value={'ORGANIZATION'}
            key={'ORGANIZATION'}
            onChange={() => {}}
            checked={searchMode === 'organization'}
            onClick={(e) => {
              setSearchMode('organization');
              if (stakeholderType === 'PERSON') {
                clearFields('ORGANIZATION');
              }
            }}
          >
            Förening
          </RadioButton>
        </RadioButton.Group>
      </div>
    </fieldset>
  );
};
