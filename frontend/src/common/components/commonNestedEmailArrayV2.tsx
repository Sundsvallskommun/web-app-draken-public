import { PrettyRole } from '@casedata/interfaces/role';
import { invalidEmailMessage, isValidEmail } from '@common/utils/contact-validation-utils';
import { appConfig } from '@config/appconfig';
import { Button, Chip, cx, FormControl, FormErrorMessage, FormLabel, Input, Select } from '@sk-web-gui/react';
import { useMetadataStore } from '@stores/index';
import { ContactChannelType } from '@supportmanagement/services/support-errand-service';
import { useEffect, useState } from 'react';
import { useFieldArray } from 'react-hook-form';

type size = 'sm' | 'md' | 'lg';

interface CommonNestedEmailArrayV2Props {
  errand: any;
  register: any;
  watch: any;
  setValue: any;
  disabled?: boolean;
  trigger: any;
  control: any;
  required?: boolean;
  error?: boolean;
  addingStakeholder?: boolean;
  size?: string;
  [key: string]: any;
}

const CommonNestedEmailArrayV2 = ({
  errand,
  register,
  watch,
  setValue,
  disabled,
  trigger,
  control,
  required = false,
  error = false,
  addingStakeholder = false,
  size = 'sm',
}: CommonNestedEmailArrayV2Props) => {
  const { emails, existingEmail, newEmail } = watch();
  const supportMetadata = useMetadataStore((s) => s.supportMetadata);
  const { fields, remove, append } = useFieldArray<{ emails: { value: string }[] }>({
    control,
    name: 'emails',
  });

  const [listedEmails, setListedEmails] = useState<{ email: string; role: string[] }[]>([]);
  // The address is checked when Add is clicked, so typing never shows an error or blocks saving the form
  const [showNewEmailError, setShowNewEmailError] = useState(false);

  useEffect(() => {
    const stakeholders: { email: string; role: string[] }[] = [];

    if (appConfig.isCaseData) {
      errand?.stakeholders?.map((stakeholder: any) => {
        if (stakeholder?.emails?.length) {
          stakeholder?.emails?.map((email: any) => {
            stakeholders.push({
              email: email.value ?? '',
              role: [(PrettyRole as Record<string, string>)[stakeholder?.roles[0]] ?? ''],
            });
          });
        }
      });
    } else {
      errand?.stakeholders?.map((stakeholder: any) => {
        if (stakeholder?.contactChannels?.length) {
          stakeholder?.contactChannels?.map((channel: any) => {
            if (channel.type === ContactChannelType.EMAIL || channel.type === ContactChannelType.Email) {
              const role = supportMetadata?.roles?.find((r) => r.name === stakeholder.role)?.displayName;
              stakeholders.push({
                email: channel?.value ?? [],
                role: [role ?? ''],
              });
            }
          });
        }
      });
    }

    setListedEmails(stakeholders);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [errand?.stakeholders]);

  return (
    <FormControl id={'emails'} className="w-full" size={size as size}>
      {!addingStakeholder ? (
        <>
          <FormLabel>Lägg till befintlig e-postadress</FormLabel>
          <div className="flex gap-16 mb-16">
            <Select
              data-cy="existing-email-addresses"
              className="w-full"
              {...register('existingEmail')}
              placeholder="Välj mottagare"
            >
              <Select.Option value="">Välj mottagare</Select.Option>
              {listedEmails.map((email, index) => {
                return (
                  <Select.Option value={email.email} key={index}>
                    {`${email.email} (${email.role})`}
                  </Select.Option>
                );
              })}
            </Select>
            <Button
              type="button"
              data-cy={`add-email-button`}
              variant="tertiary"
              size={size as size}
              onClick={() => {
                append({ value: existingEmail });
                trigger();
              }}
              className="rounded-button"
              disabled={disabled || !existingEmail}
            >
              Lägg till
            </Button>
          </div>
        </>
      ) : null}

      <FormLabel>Lägg till ny e-postadress{required ? <span aria-hidden="true">*</span> : null}</FormLabel>
      <div className="w-full flex gap-16 mb-8">
        <Input
          data-cy={`new-email-input`}
          placeholder="Ange e-postadress"
          {...register('newEmail', { onChange: () => setShowNewEmailError(false) })}
          className={cx(error || showNewEmailError ? 'border-error' : null, `w-full`)}
        />

        <Button
          type="button"
          data-cy={`add-new-email-button`}
          variant="tertiary"
          size={size as size}
          onClick={() => {
            if (!isValidEmail(newEmail)) {
              setShowNewEmailError(true);
              return;
            }
            append({ value: newEmail.trim() });
            setValue('newEmail', '');
            trigger();
          }}
          className="rounded-button"
          disabled={disabled || !newEmail}
        >
          Lägg till
        </Button>
      </div>
      {showNewEmailError && (
        <FormErrorMessage data-cy="new-email-error" className="text-error">
          {invalidEmailMessage}
        </FormErrorMessage>
      )}
      {fields?.length > 0 ? (
        <>
          {!addingStakeholder && <strong>Ditt meddelande har {emails?.length} mottagare</strong>}
          <div className="flex items-center w-full flex-wrap justify-start gap-md">
            {fields?.map((field, index) => {
              return (
                <div key={`chip-${index}`}>
                  <span className="sr-only">Tillagd epostadress</span>
                  <Chip
                    data-cy={`email-tag-${index}`}
                    aria-label={`Tillagd epostadress ${field}. Klicka för att ta bort.`}
                    key={`-${field}-tag`}
                    onClick={() => {
                      remove(index);
                    }}
                  >
                    {field.value}
                  </Chip>
                </div>
              );
            })}
          </div>
        </>
      ) : null}
    </FormControl>
  );
};

export default CommonNestedEmailArrayV2;
