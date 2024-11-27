import { Button, cx, FormControl, FormErrorMessage, FormLabel, Input, Chip } from '@sk-web-gui/react';
import { useFieldArray } from 'react-hook-form';

const PREFILL_VALUE = '+46';
const CommonNestedPhoneArrayV2 = ({
  control,
  register,
  errors,
  watch,
  setValue,
  trigger,
  disabled = false,
  required = false,
  error = false,
}) => {
  const { fields, remove, append } = useFieldArray({
    control,
    name: `phoneNumbers`,
  });

  const { newPhoneNumber } = watch();

  return (
    <FormControl id={`phoneNumbers`} className="w-full">
      <FormLabel>
        Lägg till telefonnummer (t ex +46701740635){required ? <span aria-hidden="true">*</span> : null}
      </FormLabel>
      <div className="flex items-center w-full justify-between">
        <Input
          disabled={disabled}
          size="md"
          data-cy={`newPhoneNumber`}
          className={cx(error ? 'border-error' : null, 'w-full mr-16')}
          placeholder="+4670-..."
          defaultValue={'+46'}
          {...register(`newPhoneNumber`)}
        />
        <Button
          type="button"
          variant="tertiary"
          data-cy={`newPhoneNumber-button`}
          size="md"
          color="primary"
          onClick={() => {
            append({ value: newPhoneNumber });
            setValue(`newPhoneNumber`, PREFILL_VALUE);
            trigger();
          }}
          disabled={newPhoneNumber === '' || newPhoneNumber === PREFILL_VALUE || (errors && !!errors.newPhoneNumber)}
          className="rounded-button"
        >
          Lägg till
        </Button>
      </div>

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
