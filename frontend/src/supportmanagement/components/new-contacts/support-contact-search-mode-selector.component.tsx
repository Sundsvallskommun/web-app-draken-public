import { AddressResult } from '@common/services/adress-service';
import { appConfig } from '@config/appconfig';
import { FormLabel, RadioButton } from '@sk-web-gui/react';
import {
  ExternalIdType,
  SupportStakeholderFormModel,
  SupportStakeholderTypeEnum,
} from '@supportmanagement/services/support-errand-service';
import { UseFieldArrayReplace, UseFormReturn } from 'react-hook-form';

interface SupportContactSearchModeSelectorProps {
  inName: string;
  searchMode: string;
  disabled: boolean;
  form: UseFormReturn<SupportStakeholderFormModel>;
  contact: SupportStakeholderFormModel;
  label: string;
  setSearchMode: React.Dispatch<React.SetStateAction<string>>;
  setSelectedUser: React.Dispatch<React.SetStateAction<AddressResult>>;
  setSearchResult: React.Dispatch<React.SetStateAction<boolean>>;
  setSearchResultArray: React.Dispatch<React.SetStateAction<AddressResult[]>>;
  replacePhonenumbers: UseFieldArrayReplace<SupportStakeholderFormModel, 'phoneNumbers'>;
}

export const SupportContactSearchModeSelector: React.FC<SupportContactSearchModeSelectorProps> = ({
  inName,
  searchMode,
  disabled,
  form,
  contact,
  label,
  setSearchMode,
  setSelectedUser,
  setSearchResult,
  setSearchResultArray,
  replacePhonenumbers,
}) => {
  const clearCommonFields = () => {
    replacePhonenumbers([]);
    form.setValue('city', '');
    form.setValue('zipCode', '');
    form.setValue('careOf', '');
    form.setValue('address', '');
    setSearchResult(undefined);
    setSearchResultArray([]);
    setSelectedUser(undefined);
  };

  const clearFields = (type: 'PERSON' | 'ORGANIZATION') => {
    clearCommonFields();
    setTimeout(() => {
      form.clearErrors(['phoneNumbers']);
      form.setValue(`personId`, '', { shouldDirty: false });
      form.setValue(`personNumber`, '', { shouldDirty: false });
      if (type === 'PERSON') {
        form.setValue(`organizationName`, '', { shouldDirty: false });
        form.setValue(`organizationNumber`, '', { shouldDirty: false });
        form.setValue(`stakeholderType`, SupportStakeholderTypeEnum.PERSON, { shouldDirty: true });
      } else {
        form.setValue(`firstName`, '', { shouldDirty: false });
        form.setValue(`lastName`, '', { shouldDirty: false });
        form.setValue(`stakeholderType`, SupportStakeholderTypeEnum.ORGANIZATION, { shouldDirty: true });
      }
      form.clearErrors();
    }, 0);
  };

  return (
    <fieldset
      className="flex mt-ms mb-md gap-lg justify-start"
      data-cy={`searchmode-selector-${inName}`}
      disabled={disabled}
    >
      <div className="flex flex-col">
        <FormLabel className="mb-12">Välj typ av {label.toLocaleLowerCase()}</FormLabel>
        {/* TODO: Refactor to only use to externalIdType instead of searchMode */}
        <RadioButton.Group size="sm" inline>
          {appConfig.features.useEmployeeSearch ? (
            <RadioButton
              data-cy={`search-employee-${inName}-${contact.role}`}
              className="mr-sm"
              value={'EMPLOYEE'}
              key={'EMPLOYEE'}
              checked={searchMode === 'employee'}
              onChange={() => {
                setSearchMode('employee');
                form.setValue(`externalIdType`, ExternalIdType.EMPLOYEE);
                clearFields('PERSON');
              }}
            >
              Anställd
            </RadioButton>
          ) : null}
          <RadioButton
            data-cy={`search-person-${inName}-${contact.role}`}
            className="mr-sm"
            value={'PERSON'}
            key={'PERSON'}
            checked={searchMode === 'person'}
            onChange={() => {
              setSearchMode('person');
              form.setValue(`externalIdType`, ExternalIdType.PRIVATE);
              clearFields('PERSON');
            }}
          >
            Privat
          </RadioButton>

          {appConfig.features.useOrganizationStakeholders ? (
            <RadioButton
              data-cy={`search-enterprise-${inName}-${contact.role}`}
              className="mr-sm"
              value={'ENTERPRISE'}
              key={'ENTERPRISE'}
              checked={searchMode === 'enterprise'}
              onChange={() => {
                setSearchMode('enterprise');
                form.setValue(`externalIdType`, ExternalIdType.COMPANY);
                clearFields('ORGANIZATION');
              }}
            >
              Företag
            </RadioButton>
          ) : null}
          {appConfig.features.useOrganizationStakeholders ? (
            <RadioButton
              data-cy={`search-organization-${inName}-${contact.role}`}
              className="mr-sm"
              value={'ORGANIZATION'}
              key={'ORGANIZATION'}
              checked={searchMode === 'organization'}
              onChange={() => {
                setSearchMode('organization');
                form.setValue(`externalIdType`, ExternalIdType.COMPANY);
                clearFields('ORGANIZATION');
              }}
            >
              Förening
            </RadioButton>
          ) : null}
        </RadioButton.Group>
      </div>
    </fieldset>
  );
};
