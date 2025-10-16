'use client';

import type { WidgetProps } from '@rjsf/utils';
import { Input } from '@sk-web-gui/react';

export function TextWidget({ id, value, onChange, disabled, readonly }: WidgetProps) {
  return (
    <Input
      id={id}
      className="w-full max-w-[40rem]"
      value={value ?? ''}
      disabled={!!(disabled || readonly)}
      onChange={(e) => onChange(e.currentTarget.value)}
    />
  );
}
