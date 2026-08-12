'use client';

import { ariaDescribedByIds, titleId, type WidgetProps } from '@rjsf/utils';
import { Checkbox, FormControl } from '@sk-web-gui/react';

type CheckboxValue = string | number | boolean | null;

interface CheckboxOption {
  label: string;
  value: CheckboxValue;
}

export interface CheckboxGroupWidgetOptions {
  className?: string;
  direction?: 'row' | 'column';
  inline?: boolean;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isCheckboxValue = (value: unknown): value is CheckboxValue =>
  value === null || ['string', 'number', 'boolean'].includes(typeof value);

const getCheckboxOptions = (value: unknown): CheckboxOption[] => {
  if (!Array.isArray(value)) return [];

  return value.flatMap((option) => {
    if (!isRecord(option) || typeof option.label !== 'string' || !isCheckboxValue(option.value)) return [];
    return [{ label: option.label, value: option.value }];
  });
};

const containsValue = (values: readonly unknown[], expected: unknown): boolean =>
  values.some((value) => Object.is(value, expected));

export function CheckboxGroupWidget({
  id,
  label,
  hideLabel,
  value,
  onBlur,
  onChange,
  onFocus,
  options,
  schema,
  disabled,
  readonly,
  rawErrors,
}: WidgetProps) {
  const enumOptions = getCheckboxOptions(options.enumOptions);
  const selectedValues: readonly unknown[] = Array.isArray(value) ? value : [];
  const selectedOptionKeys = enumOptions.flatMap((option, index) =>
    containsValue(selectedValues, option.value) ? [String(index)] : []
  );
  const disabledValues: readonly unknown[] = Array.isArray(options.enumDisabled) ? options.enumDisabled : [];
  const hasReachedMaximum = typeof schema.maxItems === 'number' && selectedValues.length >= schema.maxItems;
  const configuredDirection = options.direction;
  const direction =
    configuredDirection === 'row' || configuredDirection === 'column'
      ? configuredDirection
      : options.inline
      ? 'row'
      : 'column';
  const className = typeof options.className === 'string' ? options.className : 'w-full max-w-[48rem]';

  const handleChange = (optionKeys: Array<string | number | readonly string[] | undefined>) => {
    const selectedKeys = new Set(optionKeys.map(String));
    onChange(enumOptions.filter((_, index) => selectedKeys.has(String(index))).map((option) => option.value));
  };

  return (
    <FormControl className={`${className} min-w-0 max-w-full`} invalid={Boolean(rawErrors?.length)}>
      <div
        id={`${id}-group`}
        role="group"
        aria-label={hideLabel ? label : undefined}
        aria-labelledby={hideLabel ? undefined : titleId(id)}
        aria-describedby={ariaDescribedByIds(id)}
      >
        <Checkbox.Group name={id} value={selectedOptionKeys} direction={direction} onChange={handleChange}>
          {enumOptions.map((option, index) => (
            <Checkbox
              id={`${id}-${index}`}
              key={`${id}-${String(option.value)}-${index}`}
              className="schema-checkbox-option"
              value={String(index)}
              disabled={Boolean(
                disabled ||
                  readonly ||
                  containsValue(disabledValues, option.value) ||
                  (hasReachedMaximum && !containsValue(selectedValues, option.value))
              )}
              onBlur={() => onBlur(id, selectedValues)}
              onFocus={() => onFocus(id, selectedValues)}
            >
              {option.label}
            </Checkbox>
          ))}
        </Checkbox.Group>
      </div>
    </FormControl>
  );
}
