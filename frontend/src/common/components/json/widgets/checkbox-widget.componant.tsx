'use client';
import type { WidgetProps } from '@rjsf/utils';
import { Checkbox, FormControl } from '@sk-web-gui/react';

export function CheckboxWidget({ id, value, onChange, options, disabled, readonly }: WidgetProps) {
  const customClassName = (options as any)?.className || 'w-full max-w-[40rem]';

  return (
    <FormControl className={customClassName}>
      <Checkbox
        id={id}
        checked={!!value}
        disabled={!!(disabled || readonly)}
        onChange={(e) => onChange(e.currentTarget.checked)}
      />
    </FormControl>
  );
}
