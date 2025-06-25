import { AddressResult } from '@common/services/adress-service';
import { appConfig } from '@config/appconfig';
import { Input, RadioButton } from '@sk-web-gui/react';
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
  id: string;
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
  id,
  setSearchMode,
  setSelectedUser,
  setSearchResult,
  setSearchResultArray,
  replacePhonenumbers,
}) => {
  const stakeholderType = form.watch(`stakeholderType`);

  return (
    <fieldset
      className="flex mx-md mt-ms mb-md gap-lg justify-start"
      data-cy={`searchmode-selector-${inName}`}
      disabled={disabled}
    >
      <legend className="text-md my-sm contents"></legend>
      <Input type="hidden" {...form.register(`stakeholderType`)} />

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
            form.setValue('city', '');
            form.setValue('zipCode', '');
            form.setValue('careOf', '');
            form.setValue('address', '');
            form.clearErrors(['organizationNumber']);
            setSearchResult(undefined);
            setSelectedUser(undefined);
            form.setValue(`externalIdType`, ExternalIdType.EMPLOYEE);
            setTimeout(() => {
              form.setValue(`organizationName`, '', { shouldDirty: false });
              form.setValue(`organizationNumber`, '', { shouldDirty: false });
              form.setValue(`stakeholderType`, SupportStakeholderTypeEnum.PERSON, { shouldDirty: true });
              form.clearErrors(['phoneNumbers']);
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
          form.setValue('city', '');
          form.setValue('zipCode', '');
          form.setValue('careOf', '');
          form.setValue('address', '');
          form.clearErrors(['organizationNumber']);
          setSearchResult(undefined);
          setSearchResultArray([]);
          setSelectedUser(undefined);
          form.setValue(`externalIdType`, ExternalIdType.PRIVATE);
          setTimeout(() => {
            form.setValue(`organizationName`, '', { shouldDirty: false });
            form.setValue(`organizationNumber`, '', { shouldDirty: false });
            form.setValue(`stakeholderType`, SupportStakeholderTypeEnum.PERSON, { shouldDirty: true });
            form.clearErrors(['phoneNumbers']);
          }, 0);
        }}
      >
        Privat
      </RadioButton>

      {appConfig.features.useOrganizationStakeholders ? (
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
              form.setValue('city', '');
              form.setValue('zipCode', '');
              form.setValue('careOf', '');
              form.setValue('address', '');
              replacePhonenumbers([]);
              setSearchResult(undefined);
              setSearchResultArray([]);
              setSelectedUser(undefined);
              form.setValue(`externalIdType`, ExternalIdType.COMPANY);
              if (stakeholderType === 'PERSON') {
                form.clearErrors(['personNumber']);
                setTimeout(() => {
                  form.setValue(`personNumber`, '', { shouldDirty: false });
                  form.setValue(`personId`, '', { shouldDirty: false });
                  form.setValue(`firstName`, '', { shouldDirty: false });
                  form.setValue(`lastName`, '', { shouldDirty: false });
                  form.setValue(`stakeholderType`, SupportStakeholderTypeEnum.ORGANIZATION, { shouldDirty: true });
                  form.clearErrors(['phoneNumbers']);
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
              form.setValue('city', '');
              form.setValue('zipCode', '');
              form.setValue('careOf', '');
              form.setValue('address', '');
              replacePhonenumbers([]);
              form.clearErrors(['personNumber']);
              setSearchResult(undefined);
              setSearchResultArray([]);
              setSelectedUser(undefined);
              form.setValue(`externalIdType`, ExternalIdType.COMPANY);
              if (stakeholderType === 'PERSON') {
                setTimeout(() => {
                  form.setValue(`personNumber`, '', { shouldDirty: false });
                  form.setValue(`personId`, '', { shouldDirty: false });
                  form.setValue(`firstName`, '', { shouldDirty: false });
                  form.setValue(`lastName`, '', { shouldDirty: false });
                  form.setValue(`stakeholderType`, SupportStakeholderTypeEnum.ORGANIZATION, { shouldDirty: true });
                  form.clearErrors(['phoneNumbers']);
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
};
