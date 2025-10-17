'use client';

import type { WidgetProps } from '@rjsf/utils';
import { DatePicker, FormErrorMessage } from '@sk-web-gui/react';

export function DateWidget(props: WidgetProps) {
  const { id, value, disabled, readonly, onChange, rawErrors } = props;
  const hasError = !!rawErrors?.length;
  const errorId = `${id}-error`;

  return (
    <div>
      <DatePicker
        className="w-full max-w-[40rem]"
        id={id}
        type="date"
        value={value ?? ''}
        disabled={disabled}
        readOnly={readonly}
        onChange={(e) => onChange(e.target.value)}
      />
      {hasError && (
        <div className="my-sm text-error" id={errorId}>
          <FormErrorMessage>{rawErrors[0]}</FormErrorMessage>
        </div>
      )}
    </div>
  );
}
