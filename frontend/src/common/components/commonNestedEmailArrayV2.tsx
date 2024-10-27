import AddIcon from '@mui/icons-material/Add';
import { Button, Chip, cx, FormControl, FormErrorMessage, FormLabel, Input } from '@sk-web-gui/react';
import { useFieldArray } from 'react-hook-form';

const CommonNestedEmailArrayV2 = ({
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
    name: `emails`,
  });

  const newEmail = watch(`newEmail`);

  return (
    <FormControl id={`emails`} className="w-full">
      <FormLabel>E-postadress {required ? <span aria-hidden="true">*</span> : null}</FormLabel>
      <div className="flex items-center w-full justify-between">
        <Input
          disabled={disabled}
          size="sm"
          className={cx(error ? 'border-error' : null, `mr-md w-5/6`)}
          placeholder="@"
          {...register(`newEmail`)}
          data-cy={`email-input`}
        />
        <Button
          type="button"
          data-cy={`add-email-button`}
          variant="primary"
          size="sm"
          leftIcon={<AddIcon fontSize="large" className="mr-sm" />}
          onClick={() => {
            append({ value: newEmail });
            setValue(`newEmail`, '');
          }}
          disabled={newEmail === '' || newEmail === undefined || (errors && !!errors.newEmail)}
          className="rounded-lg ml-sm"
        >
          Lägg till
        </Button>
      </div>
      {errors?.newEmail && (
        <div className="my-sm text-error">
          <FormErrorMessage>{errors?.newEmail?.message}</FormErrorMessage>
        </div>
      )}
      {fields.length > 0 ? (
        <div className="flex items-center w-full flex-wrap justify-start gap-md py-sm">
          {fields.map((field: { id: string; value: string }, k) => {
            return (
              <div key={`-${field.id}`}>
                <span className="sr-only">Tillagd epostadress</span>
                <Chip
                  data-cy={`email-tag-${k}`}
                  aria-label={`Tillagd epostadress ${field.value}. Klicka för att ta bort.`}
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

export default CommonNestedEmailArrayV2;
