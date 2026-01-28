'use client';
import type { WidgetProps } from '@rjsf/utils';
import dynamic from 'next/dynamic';
const TextEditor = dynamic(() => import('@sk-web-gui/text-editor'), { ssr: false });

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
