import { PrettyRole } from '@casedata/interfaces/role';
import { AppContextInterface, useAppContext } from '@contexts/app.context';
import { Button, Chip, cx, FormControl, FormErrorMessage, FormLabel, Input, Select } from '@sk-web-gui/react';
import { ContactChannelType } from '@supportmanagement/services/support-errand-service';
import { useEffect, useState } from 'react';
import { useFieldArray } from 'react-hook-form';

type size = 'sm' | 'md' | 'lg';

const CommonNestedEmailArrayV2 = ({
  errand,
  register,
  errors,
  watch,
  setValue,
  disabled,
  trigger,
  control,
  required = false,
  error = false,
  addingStakeholder = false,
  size = 'sm',
}) => {
  const { emails, existingEmail, newEmail } = watch();
  const { supportMetadata }: AppContextInterface = useAppContext();
  const { fields, remove, append } = useFieldArray({
    control,
    name: 'emails',
  });

  const { featureFlags } = useAppContext();

  const [listedEmails, setListedEmails] = useState<{ email: string; role: string[] }[]>([]);

  useEffect(() => {
    const stakeholders: { email: string; role: string[] }[] = [];

    if (featureFlags?.isCaseData) {
      errand?.stakeholders?.map((stakeholder) => {
        if (stakeholder?.emails?.length) {
          stakeholder?.emails?.map((email) => {
            stakeholders.push({
              email: email.value ?? [],
              role: PrettyRole[stakeholder?.roles[0]] ?? [],
            });
          });
        }
      });
    } else {
      errand?.stakeholders?.map((stakeholder) => {
        if (stakeholder?.contactChannels?.length) {
          stakeholder?.contactChannels?.map((channel) => {
            if (channel.type === ContactChannelType.EMAIL || channel.type === ContactChannelType.Email) {
              const role = supportMetadata?.roles?.find((r) => r.name === stakeholder.role)?.displayName;
              stakeholders.push({
                email: channel?.value ?? [],
                role: [role],
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
          {...register('newEmail')}
          className={cx(error ? 'border-error' : null, `w-full`)}
        />

        <Button
          type="button"
          data-cy={`add-new-email-button`}
          variant="tertiary"
          size={size as size}
          onClick={() => {
            append({ value: newEmail });
            setValue('newEmail', '');
            trigger();
          }}
          className="rounded-button"
          disabled={disabled || errors?.newEmail || !newEmail}
        >
          Lägg till
        </Button>
      </div>
      <FormErrorMessage className="text-error">{errors?.newEmail?.message}</FormErrorMessage>
      {fields?.length > 0 ? (
        <>
          {!addingStakeholder && <strong>Ditt meddelande har {emails?.length} mottagare</strong>}
          <div className="flex items-center w-full flex-wrap justify-start gap-md">
            {fields?.map((field: { id: string; value: string }, index: number) => {
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
