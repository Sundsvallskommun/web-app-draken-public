'use client';
import type { WidgetProps } from '@rjsf/utils';
import { Checkbox, FormControl } from '@sk-web-gui/react';

export function CheckboxWidget({ id, value, onChange }: WidgetProps) {
  return (
    <FormControl className="w-full max-w-[40rem]">
      <Checkbox id={id} checked={!!value} onChange={(e) => onChange(e.currentTarget.checked)} />
    </FormControl>
  );
}
