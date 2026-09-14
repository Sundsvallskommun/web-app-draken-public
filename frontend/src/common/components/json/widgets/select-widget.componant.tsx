'use client';
import type { WidgetProps } from '@rjsf/utils';
import { Select } from '@sk-web-gui/react';

export function SelectWidget(props: WidgetProps) {
  const { id, value, disabled, readonly, onChange, options } = props;
  const enumOptions = (options?.enumOptions as { value: any; label: string }[]) || [];

  const currentValue = value === undefined || value === null ? '' : value;
  // The UI schema may set the width; the capped width stays the default.
  const customClassName = typeof options?.className === 'string' ? options.className : 'w-full max-w-[48rem]';

  return (
    <Select
      className={customClassName}
      id={id}
      value={currentValue}
      onChange={(e) => onChange(e.currentTarget.value || undefined)}
      readOnly={!!(disabled || readonly)}
    >
      {enumOptions.map((o) => (
        <Select.Option key={String(o.value)} value={o.value}>
          {o.label}
        </Select.Option>
      ))}
    </Select>
  );
}
