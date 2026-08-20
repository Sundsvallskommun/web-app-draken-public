'use client';
import TextEditor from '@common/components/dynamic-text-editor';
import type { WidgetProps } from '@rjsf/utils';

export function TextareaWidget({ value, onChange, options }: WidgetProps) {
  const customClassName = (options as any)?.className || 'case-description-editor w-full max-w-[40rem] h-[10rem]';
  const markupValue = typeof value === 'string' ? value : '';

  return (
    <TextEditor
      className={customClassName}
      disableToolbar
      value={{ markup: markupValue }}
      onChange={(event) => {
        onChange(event.target.value.markup ?? '');
      }}
    />
  );
}
