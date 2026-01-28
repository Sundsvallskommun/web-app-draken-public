'use client';
import type { WidgetProps } from '@rjsf/utils';
import { Combobox, FormErrorMessage } from '@sk-web-gui/react';

export function ComboboxWidget(props: WidgetProps) {
  const { id, disabled, rawErrors, readonly, value, onChange, options = {}, schema = {} } = props;

  const multiple =
    (options as any).multiple ?? (schema && typeof schema === 'object' && (schema as any).type === 'array');
  const enumOptions = ((options as any).enumOptions as { value: any; label: string }[]) ?? [];
  const placeholder = (options as any)?.placeholder || 'Sök/välj…';
  const customClassName = (options as any)?.className || 'w-full max-w-[40rem]';
  const currentValue = multiple ? (Array.isArray(value) ? value : value ? [value] : []) : value ?? '';
  const hasError = !!rawErrors?.length;
  const errorId = `${id}-error`;
  const handleChange = (e: any) => {
    const raw = e?.target?.value;
    if (multiple) {
      const arr = Array.isArray(raw) ? raw : [raw];
      onChange(arr.filter((x) => x !== undefined && x !== null && x !== ''));
    } else {
      onChange(raw ?? '');
    }
  };

  return (
    <div>
      <Combobox
        id={id}
        className={customClassName}
        multiple={!!multiple}
        value={currentValue}
        disabled={!!(disabled || readonly)}
        onChange={handleChange}
      >
        <Combobox.Input placeholder={placeholder} className="w-full" />
        <Combobox.List>
          {enumOptions.map((o) => (
            <Combobox.Option key={String(o.value)} value={o.value}>
              {o.label}
            </Combobox.Option>
          ))}
        </Combobox.List>
      </Combobox>
      {hasError && (
        <div className="my-sm text-error" id={errorId}>
          <FormErrorMessage>{rawErrors[0]}</FormErrorMessage>
        </div>
      )}
    </div>
  );
}
