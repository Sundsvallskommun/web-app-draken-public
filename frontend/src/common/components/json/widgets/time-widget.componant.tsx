'use client';

import { ariaDescribedByIds, type WidgetProps } from '@rjsf/utils';
import { Input } from '@sk-web-gui/react';
import dayjs from 'dayjs';
import { useEffect } from 'react';

const FULL_TIME = /^\d{2}:\d{2}:\d{2}(Z|[+-]\d{2}:\d{2})$/;
const HOUR_AND_MINUTE = /^(\d{2}):(\d{2})/;

/**
 * JSON Schemas `time`-format är RFC 3339 `full-time`: HH:mm:ss *och* en tidszon. Ett nativt tidsfält
 * lämnar bara HH:mm, så att fylla på med sekunder räcker inte — tjänsten avvisar ett värde utan zon.
 * Zonen är webbläsarens egen, eftersom fälten är klockslag och inte tidpunkter. Fält utan `time`-format
 * behåller exakt det användaren valde. Samma kontrakt som time-widgeten i web-app-katla-aot.
 */
function toSchemaValue(value: string, requiresFullTime: boolean): string | undefined {
  if (value === '') return undefined;
  if (!requiresFullTime || FULL_TIME.test(value)) return value;

  const [hour, minute, second] = value.split(':');
  const time = dayjs()
    .hour(Number(hour))
    .minute(Number(minute))
    .second(Number(second ?? 0))
    .millisecond(0);

  return time.isValid() ? time.format('HH:mm:ssZ') : value;
}

function toInputValue(value: unknown): string {
  if (typeof value !== 'string') return '';

  const match = HOUR_AND_MINUTE.exec(value);
  return match ? `${match[1]}:${match[2]}` : '';
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
  const requiresFullTime = schema.format === 'time';

  // A stored value without a zone only satisfies the format once it is retyped, so normalize it on
  // load instead of letting the save fail on an untouched field.
  useEffect(() => {
    if (disabled || readonly || typeof value !== 'string' || value === '') return;
    const normalized = toSchemaValue(value, requiresFullTime);
    if (normalized !== value) onChange(normalized);
  }, [disabled, onChange, readonly, requiresFullTime, value]);

  return (
    <Input
      id={id}
      className={`${customClassName} min-w-0 max-w-full`}
      type="time"
      value={toInputValue(value)}
      disabled={Boolean(disabled)}
      readOnly={Boolean(readonly)}
      aria-describedby={ariaDescribedByIds(id)}
      aria-invalid={Boolean(rawErrors?.length)}
      required={required}
      onBlur={() => onBlur(id, value)}
      onFocus={() => onFocus(id, value)}
      onChange={(e) => onChange(toSchemaValue(e.currentTarget.value, requiresFullTime))}
    />
  );
}
