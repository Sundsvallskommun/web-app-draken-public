'use client';

import type { WidgetProps } from '@rjsf/utils';
import { Input } from '@sk-web-gui/react';

export function TextWidget({ id, value, onChange, disabled, readonly, options }: WidgetProps) {
  const customClassName = (options as any)?.className || 'w-full max-w-[48rem] h-[20rem]';

  return (
    <Input
      id={id}
      className={customClassName}
      value={value ?? ''}
      disabled={!!(disabled || readonly)}
      onChange={(e) => onChange(e.currentTarget.value)}
    />
  );
}
