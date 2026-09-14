'use client';

import { ariaDescribedByIds, type WidgetProps } from '@rjsf/utils';
import { Input } from '@sk-web-gui/react';
import { useEffect } from 'react';

/**
 * Ett nativt tidsfält lämnar HH:mm, men JSON Schemas `time`-format kräver sekunder. Sekunder läggs
 * därför bara till när schemat faktiskt kräver dem, så att fält utan format behåller exakt det värde
 * användaren valde. Samma kontrakt som time-widgeten i web-app-katla-sm.
 */
function toSchemaValue(value: string, requiresSeconds: boolean): string | undefined {
  if (value === '') return undefined;
  return requiresSeconds && value.split(':').length === 2 ? `${value}:00` : value;
}

export function TimeWidget({
  id,
  value,
  onBlur,
  onChange,
  onFocus,
  disabled,
  readonly,
  options,
  rawErrors,
  required,
  schema,
}: WidgetProps) {
  const customClassName = typeof options.className === 'string' ? options.className : 'w-full max-w-[40rem]';
  const requiresSeconds = schema.format === 'time';

  // A stored value without seconds only satisfies the format once it is retyped, so normalize it
  // on load instead of letting the save fail on an untouched field.
  useEffect(() => {
    if (disabled || readonly || typeof value !== 'string' || value === '') return;
    const normalized = toSchemaValue(value, requiresSeconds);
    if (normalized !== value) onChange(normalized);
  }, [disabled, onChange, readonly, requiresSeconds, value]);

  return (
    <Input
      id={id}
      className={`${customClassName} min-w-0 max-w-full`}
      type="time"
      value={value ?? ''}
      disabled={Boolean(disabled)}
      readOnly={Boolean(readonly)}
      aria-describedby={ariaDescribedByIds(id)}
      aria-invalid={Boolean(rawErrors?.length)}
      required={required}
      onBlur={() => onBlur(id, value)}
      onFocus={() => onFocus(id, value)}
      onChange={(e) => onChange(toSchemaValue(e.currentTarget.value, requiresSeconds))}
    />
  );
}
