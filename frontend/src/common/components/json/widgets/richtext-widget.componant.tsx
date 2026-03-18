'use client';
import type { WidgetProps } from '@rjsf/utils';
import dynamic from 'next/dynamic';

const TextEditor = dynamic(() => import('@sk-web-gui/text-editor'), { ssr: false });

export function TexteditorWidget(props: WidgetProps) {
  const { value, onChange, options = {}, disabled, readonly } = props;

  const disableToolbar = (options as any)?.disableToolbar !== false;
  const className = (options as any)?.className || 'w-full h-[22rem]';

  return (
    <TextEditor
      className={className}
      disableToolbar={disableToolbar}
      readOnly={disabled || readonly}
      value={{ markup: value }}
      onChange={(event) => {
        onChange(event.target.value.markup ?? '');
      }}
    />
  );
}
