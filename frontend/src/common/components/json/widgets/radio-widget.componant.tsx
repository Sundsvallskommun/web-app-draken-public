'use client';
import type { WidgetProps } from '@rjsf/utils';
import { FormControl, RadioButton } from '@sk-web-gui/react';
import { useId } from 'react';

export function RadiobuttonWidget({ id, value, onChange, options, disabled, readonly, label, required }: WidgetProps) {
  const enumOptions = (options?.enumOptions as { value: any; label: string }[]) ?? [];
  const uid = useId();
  const groupName = id ?? `radio-${uid}`;

  return (
    <FormControl className="w-full max-w-[40rem]">
      <div className="flex flex-wrap gap-12" id={groupName} role="radiogroup" aria-labelledby={`${groupName}-label`}>
        {enumOptions.map((o) => (
          <RadioButton
            key={String(o.value)}
            name={groupName}
            value={o.value}
            checked={value === o.value}
            disabled={!!(disabled || readonly)}
            onChange={() => onChange(o.value)}
          >
            {o.label}
          </RadioButton>
        ))}
      </div>
    </FormControl>
  );
}
