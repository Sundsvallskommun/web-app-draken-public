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
import React, { useMemo, useState } from 'react';
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
    return candidate.some((value) => expectedValues.includes(String(value).trim()));
  }

  if (candidate === null || candidate === undefined) {
    return false;
  }

  return expectedValues.includes(String(candidate).trim());
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
  //TODO: Refactor this component and use a general form for extraparameters instead of hijacking IErrand form.
  //      Refactoring of this component should include better rendering from parent component to elimit rerenderings.
  const [initialComboBoxValue] = useState<string | string[]>(detail.value);

  const {
    register,
    getValues,
    formState: { errors },
    watch,
    setValue,
  } = form;

  const fieldKey = detail.field.replace(/\./g, EXTRAPARAMETER_SEPARATOR);

  const dependencyFieldKeys = useMemo(
    () => detail.dependsOn?.map((dep) => dep.field.replace(/\./g, EXTRAPARAMETER_SEPARATOR)) ?? [],
    [detail.dependsOn]
  );

  const allFormValues = watch();

  const dependentSatisfied =
    detail.dependsOn?.every((dep, index) => {
      const depKey = dependencyFieldKeys[index];
      const depValue = allFormValues?.[depKey] ?? getValues(depKey);

      return dependencyMatches(depValue, dep.value);
    }) ?? true;

  const isVisible = dependentSatisfied;

  const validationRules = getConditionalValidationRules(detail, getValues);
  const error = get(errors, fieldKey)?.message;
  const options: OptionBase[] = (detail.formField as { options?: OptionBase[] }).options ?? [];

  const handleChange = (e) => {
    setValue(fieldKey, e, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  };

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
          <Checkbox.Group direction="row" defaultValue={detail.value as any}>
            {options.map((option, index) => (
              <Checkbox
                key={`${option.value}-${index}`}
                value={option.value}
                data-cy={`${detail.field}-checkbox-${index}`}
                {...register(fieldKey)}
              >
                {option.label}
              </Checkbox>
            ))}
          </Checkbox.Group>
          {error && <span className="text-error text-md">{error}</span>}
        </>
      )}

      {detail.formField.type === 'combobox' && (
        <>
          <Combobox
            className="w-full"
            data-cy={`${detail.field}-combobox`}
            multiple={Array.isArray(detail.value)}
            value={initialComboBoxValue}
            onSelect={(e) => handleChange(e.target.value)}
          >
            <Combobox.Input className="w-full" placeholder="Sök eller välj" />
            <Combobox.List>
              {options.map((option, index) => (
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
      )}
    </FormControl>
  );
};
