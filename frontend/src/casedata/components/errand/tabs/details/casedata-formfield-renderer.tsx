import React from 'react';
import { FormControl, FormLabel, Input, Select, Textarea, RadioButton, Checkbox, cx } from '@sk-web-gui/react';
import { Controller, UseFormReturn, get } from 'react-hook-form';
import dayjs from 'dayjs';
import {
  UppgiftField,
  EXTRAPARAMETER_SEPARATOR,
  OptionBase,
} from '@casedata/services/casedata-extra-parameters-service';
import { isErrandLocked } from '@casedata/services/casedata-errand-service';

interface Props {
  detail: UppgiftField;
  idx: number;
  form: UseFormReturn<any>;
  errand: any;
}

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
        return Array.isArray(depValue) ? depValue.includes(dep.value) : depValue === dep.value;
      });

      if (!shouldValidate) return true;

      return value !== undefined && value !== null && String(value).trim() !== '' ? true : message;
    },
  };
}

export const CasedataFormFieldRenderer: React.FC<Props> = ({ detail, idx, form, errand }) => {
  const {
    register,
    control,
    getValues,
    formState: { errors },
    setError,
    clearErrors,
  } = form;

  const dependentSatisfied =
    detail.dependsOn?.every((dep) => {
      const depValue = getValues(dep.field.replace(/\./g, EXTRAPARAMETER_SEPARATOR));
      return Array.isArray(depValue) ? depValue.includes(dep.value) : depValue === dep.value;
    }) ?? true;

  if (!dependentSatisfied) return null;

  const fieldKey = detail.field.replace(/\./g, EXTRAPARAMETER_SEPARATOR);
  const validationRules = getConditionalValidationRules(detail, getValues);
  const error = get(errors, fieldKey)?.message;

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
              errand.caseType === 'APPEAL' ? 'w-3/5' : detail.formField.type === 'date' ? `w-1/2` : 'w-full'
            )}
            data-cy={`${detail.field}-input`}
            max={detail.formField.type === 'date' ? dayjs().format('YYYY-MM-DD').toString() : undefined}
            placeholder={
              detail.formField.type === 'text' && 'options' in detail.formField
                ? detail.formField.options?.placeholder
                : undefined
            }
          />
          {error && <span className="text-error text-md">{error}</span>}
        </>
      )}

      {detail.formField.type === 'select' && (
        <>
          <Select {...register(fieldKey, validationRules)} className="w-content" data-cy={`${detail.field}-select`}>
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
        <Controller
          name={fieldKey}
          control={control}
          defaultValue={[]}
          rules={validationRules}
          render={({ field: { value, onChange } }) => {
            const options = (detail.formField as { options: OptionBase[] }).options;

            return (
              <Checkbox.Group
                direction="row"
                value={Array.isArray(value) ? value : []}
                onChange={(val) => {
                  onChange(val);
                  const result = validationRules?.validate?.(val);
                  if (result !== true) {
                    setError(fieldKey, { type: 'manual', message: result as string });
                  } else {
                    clearErrors(fieldKey);
                  }
                }}
              >
                {options.map((option, index) => (
                  <Checkbox
                    key={`${option.value}-${index}`}
                    value={option.value}
                    data-cy={`${detail.field}-checkbox-${index}`}
                  >
                    {option.label}
                  </Checkbox>
                ))}
              </Checkbox.Group>
            );
          }}
        />
      )}
    </FormControl>
  );
};
