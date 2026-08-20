'use client';

import type { WidgetProps } from '@rjsf/utils';
import { DatePicker } from '@sk-web-gui/react';

export function DateWidget(props: WidgetProps) {
  const { id, value, disabled, readonly, onChange, options } = props;
  const customClassName = (options as any)?.className || 'w-full max-w-[40rem]';

  return (
    <DatePicker
      className={customClassName}
      id={id}
      type="date"
      value={value ?? ''}
      disabled={disabled}
      readOnly={readonly}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
