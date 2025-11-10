'use client';
import type { WidgetProps } from '@rjsf/utils';
import { FormErrorMessage, Select } from '@sk-web-gui/react';

export function SelectWidget(props: WidgetProps) {
  const { id, value, disabled, readonly, onChange, rawErrors, options, uiSchema } = props;
  const enumOptions = (options?.enumOptions as { value: any; label: string }[]) || [];

  const hasError = !!rawErrors?.length;
  const errorId = `${id}-error`;

  const currentValue = value === undefined || value === null ? '' : value;

  return (
    <div>
      <Select
        className="w-full max-w-[48rem]"
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
      {hasError && (
        <div className="my-sm text-error" id={errorId}>
          <FormErrorMessage>{rawErrors[0]}</FormErrorMessage>
        </div>
      )}
    </div>
  );
}
