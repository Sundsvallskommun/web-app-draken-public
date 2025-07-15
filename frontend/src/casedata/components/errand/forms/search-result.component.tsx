import { CasedataOwnerOrContact } from '@casedata/interfaces/stakeholder';
import CommonNestedEmailArrayV2 from '@common/components/commonNestedEmailArrayV2';
import CommonNestedPhoneArrayV2 from '@common/components/commonNestedPhoneArrayV2';
import { isPT } from '@common/services/application-service';
import { useAppContext } from '@contexts/app.context';
import LucideIcon from '@sk-web-gui/lucide-icon';
import { Button, FormErrorMessage } from '@sk-web-gui/react';
import { UseFormReturn } from 'react-hook-form';
import { ContactRelationSelect } from './contact-relation-select.component';

interface SearchResultProps {
  contact: CasedataOwnerOrContact;
  searchMode: string;
  disabled: boolean;
  form: UseFormReturn<CasedataOwnerOrContact>;
  loading: boolean;
  onSubmit: () => void;
  label: string;
}

export const SearchResult: React.FC<SearchResultProps> = ({
  contact,
  searchMode,
  disabled,
  form,
  loading,
  onSubmit,
  label,
}) => {
  const { errand } = useAppContext();
  const { control, register, formState, watch, setValue, trigger } = form;
  const errors = formState.errors;

  const firstName = form.watch(`firstName`);
  const lastName = form.watch(`lastName`);
  const city = form.watch(`city`);
  const organizationName = form.watch(`organizationName`);
  const phoneNumbers = form.watch(`phoneNumbers`);
  const organizationNumber = form.watch(`organizationNumber`);
  const street = watch(`street`);
  const zip = watch(`zip`);
  const personalNumber = watch(`personalNumber`);

  return (
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
      <div className="my-md">
        <CommonNestedEmailArrayV2
          addingStakeholder={true}
          errand={errand}
          disabled={disabled}
          required={!isPT()}
          error={!!formState.errors.emails}
          key={`nested-email-array`}
          {...{ control, register, errors, watch, setValue, trigger }}
        />
      </div>
      <div className="my-md">
        <CommonNestedPhoneArrayV2
          disabled={disabled}
          required={!isPT()}
          error={!!formState.errors.phoneNumbers}
          key={`nested-phone-array`}
          {...{ control, register, errors, watch, setValue, trigger }}
        />
      </div>

      <ContactRelationSelect
        contact={contact}
        register={register}
        errors={errors}
        disabled={disabled}
        className="w-full"
      />

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
        onClick={onSubmit}
        leftIcon={<LucideIcon name="plus"></LucideIcon>}
      >
        Lägg till {label.toLowerCase()}
      </Button>
    </div>
  );
};
