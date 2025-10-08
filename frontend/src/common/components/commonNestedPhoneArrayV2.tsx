import { phoneNumberFormatter } from '@common/utils/phoneNumberFormatter-utils';
import { Button, Chip, cx, FormControl, FormErrorMessage, FormLabel, Input } from '@sk-web-gui/react';
import { useFieldArray } from 'react-hook-form';

type size = 'sm' | 'md' | 'lg';

const CommonNestedPhoneArrayV2 = ({
  control,
  register,
  errors,
  watch,
  trigger,
  disabled = false,
  required = false,
  error = false,
  size = 'sm',
}) => {
  const { fields, remove, append } = useFieldArray({
    control,
    name: `phoneNumbers`,
  });

  const { newPhoneNumber } = watch();

  return (
    <FormControl id={`phoneNumbers`} className="w-full" size={size as size}>
      <FormLabel>Lägg till telefonnummer {required ? <span aria-hidden="true">*</span> : null}</FormLabel>
      <div className="flex items-center w-full justify-between">
        <div className="w-full mr-16">
          <Input
            disabled={disabled}
            data-cy={`newPhoneNumber`}
            placeholder="Till exempel 0701740605 eller +46701740605."
            className={cx(error ? 'border-error' : null, 'w-full mr-16')}
            {...register(`newPhoneNumber`)}
          />
        </div>

        <Button
          type="button"
          variant="tertiary"
          size={size as size}
          data-cy={`newPhoneNumber-button`}
          color="primary"
          onClick={() => {
            append({ value: phoneNumberFormatter(newPhoneNumber) });
            trigger();
          }}
          disabled={newPhoneNumber === '' || (errors && !!errors.newPhoneNumber)}
          className="rounded-button"
        >
          Lägg till
        </Button>
      </div>
      <FormErrorMessage className="text-error">{errors?.newEmail?.message}</FormErrorMessage>
      {fields.length > 0 ? (
        <div className="flex items-center w-full flex-wrap justify-start gap-md py-sm">
          {fields.map((field: { id: string; value: string }, k) => {
            return (
              <div key={`-${field.id}`}>
                <Chip
                  data-cy={`phone-tag-${k}`}
                  aria-label={`Tillagt telefonnummer ${field.value}. Klicka för att ta bort.`}
                  key={`-${field.id}-tag`}
                  onClick={() => {
                    remove(k);
                  }}
                >
                  {field.value}
                </Chip>
              </div>
            );
          })}
        </div>
      ) : null}
    </FormControl>
  );
};

export default CommonNestedPhoneArrayV2;
