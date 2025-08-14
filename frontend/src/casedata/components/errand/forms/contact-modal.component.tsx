import { SearchModeSelector } from '@casedata/components/errand/forms/search-mode-selector.component';
import { CasedataOwnerOrContact } from '@casedata/interfaces/stakeholder';
import CommonNestedEmailArrayV2 from '@common/components/commonNestedEmailArrayV2';
import CommonNestedPhoneArrayV2 from '@common/components/commonNestedPhoneArrayV2';
import { appConfig } from '@config/appconfig';
import { useAppContext } from '@contexts/app.context';
import { Button, cx, FormControl, FormErrorMessage, FormLabel, Input, Modal } from '@sk-web-gui/react';
import { UseFieldArrayReplace, UseFormReturn } from 'react-hook-form';
import { ContactRelationSelect } from './contact-relation-select.component';

interface ContactModalProps {
  allowOrganization: boolean;
  restrictedEditing?: boolean;
  manual: boolean;
  editing: boolean;
  closeHandler: () => void;
  onSubmit: () => void;
  label: string;
  searchMode: string;
  disabled?: boolean;
  loading: boolean;
  form: UseFormReturn<CasedataOwnerOrContact>;
  contact: CasedataOwnerOrContact;
  id: string;
  setSearchMode: React.Dispatch<React.SetStateAction<string>>;
  setSearchResult: React.Dispatch<React.SetStateAction<boolean>>;
  replacePhonenumbers: UseFieldArrayReplace<CasedataOwnerOrContact, 'phoneNumbers'>;
}

export const ContactModal: React.FC<ContactModalProps> = ({
  allowOrganization,
  restrictedEditing = false,
  manual,
  editing,
  closeHandler,
  onSubmit,
  label,
  searchMode,
  disabled,
  loading,
  form,
  contact,
  id,
  setSearchMode,
  setSearchResult,
  replacePhonenumbers,
}) => {
  const { control, register, formState, watch, setValue, trigger } = form;
  const errors = formState.errors;
  const { errand } = useAppContext();

  return (
    <Modal
      show={manual || editing}
      className="w-[56rem]"
      onClose={closeHandler}
      label={manual ? `Lägg till ${label.toLowerCase()}` : `Redigera ${label.toLowerCase()}`}
    >
      <Modal.Content className="p-0">
        {allowOrganization ? (
          <SearchModeSelector
            id={id}
            inName="modal"
            form={form}
            searchMode={searchMode}
            setSearchMode={setSearchMode}
            replacePhonenumbers={replacePhonenumbers}
            setSearchResult={setSearchResult}
          />
        ) : null}
        {searchMode === 'person' ? (
          <>
            <div className="flex gap-lg">
              <FormControl id={`contact-personnumber`} className="w-1/2">
                <FormLabel>Personnummer</FormLabel>
                <Input
                  size="sm"
                  disabled={disabled}
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

              <ContactRelationSelect
                contact={contact}
                register={register}
                errors={errors}
                disabled={disabled}
                className={cx(manual || editing ? 'w-1/2' : 'w-full')}
              />
            </div>
            <div className="flex gap-lg">
              <FormControl id={`firstName`} className="w-1/2">
                <FormLabel>
                  Förnamn<span aria-hidden="true">*</span>
                </FormLabel>
                <Input
                  size="sm"
                  disabled={disabled}
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
                  disabled={disabled}
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
                  disabled={disabled}
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

              <ContactRelationSelect
                contact={contact}
                register={register}
                errors={errors}
                disabled={disabled}
                className={cx(manual || editing ? 'w-1/2' : 'w-full')}
              />
            </div>
            <FormControl id={`organizationName`} className="w-full">
              <FormLabel>Organisationsnamn</FormLabel>
              <Input
                size="sm"
                disabled={disabled}
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
                disabled={disabled}
                aria-disabled={disabled}
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
                disabled={disabled}
                aria-disabled={disabled}
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
                disabled={disabled}
                aria-disabled={disabled}
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
                disabled={disabled}
                aria-disabled={disabled}
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
          {appConfig.features.useExtraInformationStakeholders ? (
            <div className="flex gap-lg">
              <FormControl id={`extrainfo`} className="w-[244px]">
                <FormLabel>Extra Information</FormLabel>
                <Input
                  size="sm"
                  disabled={disabled}
                  aria-disabled={disabled}
                  className={cx(`readonly:bg-gray-lighter readonly:cursor-not-allowed`)}
                  data-cy={`contact-extrainfo`}
                  {...register(`extraInformation`)}
                />
              </FormControl>
            </div>
          ) : null}
        </>
        <CommonNestedEmailArrayV2
          addingStakeholder={true}
          errand={errand}
          disabled={disabled}
          error={!!formState.errors.emails}
          key={`nested-email-array`}
          {...{ control, register, errors, watch, setValue, trigger }}
        />
        <CommonNestedPhoneArrayV2
          disabled={disabled}
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
              onClick={onSubmit}
              data-cy="contact-form-save-button"
            >
              {editing ? 'Ändra uppgifter' : 'Lägg till uppgifter'}
            </Button>
          </div>
        </div>
      </Modal.Content>
    </Modal>
  );
};
