'use client';
import type { WidgetProps } from '@rjsf/utils';
import dynamic from 'next/dynamic';
const TextEditor = dynamic(() => import('@sk-web-gui/text-editor'), { ssr: false });
export function TextareaWidget({ value, onChange }: WidgetProps) {
  const markupValue = typeof value === 'string' ? value : '';
  return (
    <TextEditor
      className="case-description-editor w-full max-w-[40rem] h-[10rem]"
      disableToolbar
      value={{ markup: markupValue }}
      onChange={(event) => {
        onChange(event.target.value.markup ?? '');
      }}
    />
  );
}
