'use client';

import { ariaDescribedByIds, type WidgetProps } from '@rjsf/utils';
import { Select } from '@sk-web-gui/react';

export function SelectWidget(props: WidgetProps) {
  const { id, value, disabled, readonly, onBlur, onChange, onFocus, options, placeholder, rawErrors, required } = props;
  const enumOptions = (options?.enumOptions as { value: any; label: string }[]) || [];

  const currentValue = value === undefined || value === null ? '' : value;

  return (
    <Select
      className="w-full min-w-0 max-w-[48rem]"
      id={id}
      value={currentValue}
      onChange={(e) => onChange(e.currentTarget.value || undefined)}
      disabled={Boolean(disabled || readonly)}
      aria-describedby={ariaDescribedByIds(id)}
      aria-invalid={Boolean(rawErrors?.length)}
      required={required}
      onBlur={() => onBlur(id, value)}
      onFocus={() => onFocus(id, value)}
    >
      {placeholder && <Select.Option value="">{placeholder}</Select.Option>}
      {enumOptions.map((o) => (
        <Select.Option key={String(o.value)} value={o.value}>
          {o.label}
        </Select.Option>
      ))}
    </Select>
  );
}
