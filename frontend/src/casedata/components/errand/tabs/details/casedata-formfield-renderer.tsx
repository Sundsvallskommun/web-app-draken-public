import { isErrandLocked } from '@casedata/services/casedata-errand-service';
import {
  EXTRAPARAMETER_SEPARATOR,
  OptionBase,
  UppgiftField,
} from '@casedata/services/casedata-extra-parameters-service';
import { resolveDateTimeToken, resolveDateToken } from '@casedata/utils/date-string-handler-utils';
import {
  Checkbox,
  Combobox,
  FormControl,
  FormLabel,
  Input,
  RadioButton,
  Select,
  Textarea,
  cx,
} from '@sk-web-gui/react';
import React, { useCallback, useEffect, useMemo } from 'react';
import { UseFormReturn, get } from 'react-hook-form';

interface Props {
  detail: UppgiftField;
  idx: number;
  form: UseFormReturn<any>;
  errand: any;
}

const getInputProps = (detail: UppgiftField): Partial<React.ComponentProps<typeof Input>> => {
  switch (detail.formField.type) {
    case 'date': {
      const opts = detail.formField.options ?? {};
      return {
        min: resolveDateToken(opts.min),
        max: resolveDateToken(opts.max),
      };
    }
    case 'datetime-local': {
      const opts = (detail.formField as any).options ?? {};
      return {
        min: resolveDateTimeToken(opts.min),
        max: resolveDateTimeToken(opts.max),
      };
    }
    case 'text': {
      const opts = detail.formField.options ?? {};
      const p: Partial<React.ComponentProps<typeof Input>> = {};

      if (opts.placeholder) p.placeholder = opts.placeholder;
      if (opts.minLength !== undefined) p.minLength = opts.minLength;
      if (opts.maxLength !== undefined) p.maxLength = opts.maxLength;

      return p;
    }
    default:
      return {};
  }
};

const dependencyMatches = (candidate: unknown, expected: string | string[]) => {
  const expectedValues = Array.isArray(expected) ? expected : [expected];

  if (Array.isArray(candidate)) {
    return candidate.some((value) => expectedValues.includes(String(value)));
  }

  if (candidate === null || candidate === undefined) {
    return false;
  }

  return expectedValues.includes(String(candidate));
};

const toTrimmedString = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  return `${value}`.trim();
};

const toTrimmedArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map(toTrimmedString).filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);
  }

  const single = toTrimmedString(value);
  return single ? [single] : [];
};

function getConditionalValidationRules(
  field: UppgiftField,
  getValues: () => any
): { validate?: (value: any) => true | string } {
  if (!field.dependsOn) return {};

  const message =
    field.dependsOn.find((dep) => dep.validationMessage)?.validationMessage || 'Detta fält är obligatoriskt';

  return {
    validate: (value: any) => {
      const allValues = getValues();
      const shouldValidate = field.dependsOn?.some((dep) => {
        const depName = dep.field.replace(/\./g, EXTRAPARAMETER_SEPARATOR);
        const depValue = allValues[depName];
        return dependencyMatches(depValue, dep.value);
      });

      if (!shouldValidate) return true;

      return value !== undefined && value !== null && String(value).trim() !== '' ? true : message;
    },
  };
}

export const CasedataFormFieldRenderer: React.FC<Props> = ({ detail, idx, form, errand }) => {
  const {
    register,
    getValues,
    formState: { errors },
    setError,
    clearErrors,
    watch,
    setValue,
  } = form;

  const dependencyFieldKeys = useMemo(
    () => detail.dependsOn?.map((dep) => dep.field.replace(/\./g, EXTRAPARAMETER_SEPARATOR)) ?? [],
    [detail.dependsOn]
  );

  const dependencyValues = dependencyFieldKeys.length ? watch(dependencyFieldKeys) : undefined;

  const dependentSatisfied =
    detail.dependsOn?.every((dep, index) => {
      const depKey = dependencyFieldKeys[index];
      const watchedValue =
        Array.isArray(dependencyValues) && dependencyFieldKeys.length > 1
          ? dependencyValues[index]
          : dependencyFieldKeys.length === 1
          ? dependencyValues
          : undefined;
      const depValue = watchedValue === undefined ? getValues(depKey) : watchedValue;

      return dependencyMatches(depValue, dep.value);
    }) ?? true;

  const isVisible = dependentSatisfied;

  const fieldKey = detail.field.replace(/\./g, EXTRAPARAMETER_SEPARATOR);
  const validationRules = getConditionalValidationRules(detail, getValues);
  const error = get(errors, fieldKey)?.message;
  const isComboboxField = detail.formField.type === 'combobox';

  if (detail.formField.type === 'checkbox' && isVisible) {
    register(fieldKey, validationRules);
  }

  const comboboxOptions: OptionBase[] = isComboboxField
    ? (detail.formField as { options?: OptionBase[] }).options ?? []
    : [];
  const comboboxWatchValue = isComboboxField ? watch(fieldKey) : undefined;
  const isComboboxMulti = isComboboxField && (Array.isArray(detail.value) || Array.isArray(comboboxWatchValue));

  const comboboxValue = useMemo<string | string[]>(() => {
    if (!isComboboxField) {
      return '';
    }

    if (isComboboxMulti) {
      if (Array.isArray(comboboxWatchValue)) {
        const watched = toTrimmedArray(comboboxWatchValue);
        if (watched.length) {
          return watched;
        }
      }

      return Array.isArray(detail.value) ? detail.value.map((item) => `${item}`.trim()).filter(Boolean) : [];
    }

    return Array.isArray(detail.value) ? '' : toTrimmedString(detail.value);
  }, [comboboxWatchValue, detail.value, isComboboxField, isComboboxMulti]);

  const handleComboboxChange = useCallback(
    (event: { target?: { value?: unknown } }) => {
      if (!isVisible || !isComboboxField) return;

      const nextValue = event?.target?.value;

      if (isComboboxMulti) {
        const normalized = toTrimmedArray(nextValue);
        setValue(fieldKey, normalized, {
          shouldDirty: true,
          shouldTouch: true,
          shouldValidate: true,
        });
        return;
      }

      const normalized = toTrimmedString(nextValue);
      setValue(fieldKey, normalized, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      });
    },
    [fieldKey, isComboboxField, isComboboxMulti, isVisible, setValue]
  );

  useEffect(() => {
    if (!isVisible) return;
    if (!isComboboxField) return;
    if (comboboxWatchValue !== undefined) return;

    setValue(fieldKey, comboboxValue as any, { shouldDirty: false });
  }, [comboboxValue, comboboxWatchValue, fieldKey, isComboboxField, isVisible, setValue]);

  const isCheckboxField = detail.formField.type === 'checkbox';
  const checkboxOptions: OptionBase[] = isCheckboxField ? (detail.formField as { options: OptionBase[] }).options : [];
  const checkboxWatchValue = isCheckboxField ? watch(fieldKey) : undefined;
  const checkboxValue = useMemo<string[]>(() => {
    if (!isCheckboxField) return [];

    if (Array.isArray(checkboxWatchValue)) {
      const watched = toTrimmedArray(checkboxWatchValue);
      if (watched.length) {
        return watched;
      }
    }

    if (Array.isArray(detail.value)) {
      return detail.value.map((val) => `${val}`.trim()).filter(Boolean);
    }

    return toTrimmedArray(detail.value);
  }, [checkboxWatchValue, detail.value, isCheckboxField]);

  const handleCheckboxChange = useCallback(
    (values: string[]) => {
      if (!isVisible || !isCheckboxField) return;

      const normalized = toTrimmedArray(values);
      setValue(fieldKey, normalized, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      });

      const validationResult = validationRules?.validate?.(normalized);
      if (validationResult !== undefined && validationResult !== true) {
        setError(fieldKey, { type: 'manual', message: validationResult as string });
      } else {
        clearErrors(fieldKey);
      }
    },
    [clearErrors, fieldKey, isCheckboxField, isVisible, setError, setValue, validationRules]
  );

  useEffect(() => {
    if (!isVisible) return;
    if (!isCheckboxField) return;
    if (checkboxWatchValue !== undefined) return;

    setValue(fieldKey, checkboxValue, { shouldDirty: false });
  }, [checkboxValue, checkboxWatchValue, fieldKey, isCheckboxField, isVisible, setValue]);

  if (!isVisible) return null;

  return (
    <FormControl className="w-full" key={`${detail.field}-${idx}`} disabled={isErrandLocked(errand)}>
      {!detail.field.includes('account.') && <FormLabel className="mt-lg">{detail.label}</FormLabel>}

      {(detail.formField.type === 'text' ||
        detail.formField.type === 'date' ||
        detail.formField.type === 'datetime-local') && (
        <>
          <Input
            type={detail.formField.type}
            {...register(fieldKey, validationRules)}
            className={cx(
              errand.caseType === 'APPEAL' ? 'w-3/5' : detail.formField.type === 'date' ? 'w-1/2' : 'w-full'
            )}
            data-cy={`${detail.field}-input`}
            {...getInputProps(detail)}
          />
          {error && <span className="text-error text-md">{error}</span>}
        </>
      )}

      {detail.formField.type === 'select' && (
        <>
          <Select {...register(fieldKey, validationRules)} className="w-full" data-cy={`${detail.field}-select`}>
            <Select.Option value="">Välj</Select.Option>
            {detail.formField.options.map((o, i) => (
              <Select.Option key={`${o}-${i}`} value={o.value}>
                {o.label}
              </Select.Option>
            ))}
          </Select>
          {error && <span className="text-error text-md">{error}</span>}
        </>
      )}

      {detail.formField.type === 'textarea' && (
        <>
          <Textarea
            rows={3}
            className={cx(errand.caseType === 'APPEAL' ? 'w-2/3' : 'w-full')}
            {...register(fieldKey, validationRules)}
            data-cy={`${detail.field}-textarea`}
          />
          {error && <span className="text-error text-md">{error}</span>}
        </>
      )}

      {detail.formField.type === 'radio' && (
        <>
          <RadioButton.Group
            defaultValue={getValues(detail.field)}
            data-cy={`${detail.field}-radio-button-group`}
            inline={!!detail.formField.inline}
          >
            {detail.formField.options.map((option, i) => (
              <RadioButton
                value={option.value}
                {...register(fieldKey, validationRules)}
                key={`${option}-${i}`}
                data-cy={`${detail.field}-radio-button-${i}`}
              >
                {option.label}
              </RadioButton>
            ))}
          </RadioButton.Group>
          {error && <span className="text-error text-md">{error}</span>}
        </>
      )}

      {detail.formField.type === 'checkbox' && (
        <>
          <Checkbox.Group direction="row" value={checkboxValue} onChange={handleCheckboxChange}>
            {checkboxOptions.map((option, index) => (
              <Checkbox
                key={`${option.value}-${index}`}
                value={option.value}
                data-cy={`${detail.field}-checkbox-${index}`}
              >
                {option.label}
              </Checkbox>
            ))}
          </Checkbox.Group>
          {error && <span className="text-error text-md">{error}</span>}
        </>
      )}

      {detail.formField.type === 'combobox' &&
        (() => {
          const registration = register(fieldKey, validationRules);

          return (
            <>
              <Combobox
                className="w-full"
                data-cy={`${detail.field}-combobox`}
                multiple={isComboboxMulti}
                value={comboboxValue as any}
                onChange={handleComboboxChange}
                onSelect={!isComboboxMulti ? handleComboboxChange : undefined}
              >
                <Combobox.Input
                  className="w-full"
                  placeholder="Sök eller välj"
                  name={registration.name}
                  ref={registration.ref}
                />
                <Combobox.List>
                  {comboboxOptions.map((option, index) => (
                    <Combobox.Option
                      key={`${option.value}-${index}`}
                      value={option.value}
                      data-cy={`${detail.field}-combobox-option-${index}`}
                    >
                      {option.label}
                    </Combobox.Option>
                  ))}
                </Combobox.List>
              </Combobox>
              {error && <span className="text-error text-md">{error}</span>}
            </>
          );
        })()}
    </FormControl>
  );
};
