'use client';
import type { WidgetProps } from '@rjsf/utils';
import dynamic from 'next/dynamic';

const TextEditor = dynamic(() => import('@sk-web-gui/text-editor'), { ssr: false });

export function TexteditorWidget(props: WidgetProps) {
  const { value, onChange, options = {} } = props;

  const disableToolbar = (options as any)?.disableToolbar !== false;
  const className = (options as any)?.className || 'w-full max-w-[96rem] min-h-[22.2rem]';
  // className="w-full h-full max-w-[96rem] min-h-[22.2rem]"
  return (
    <TextEditor
      className="w-full max-w-[96rem] h-[22rem] mb-40 "
      disableToolbar={disableToolbar}
      value={{ markup: value }}
      onChange={(event) => {
        onChange(event.target.value.markup ?? '');
      }}
    />
  );
}
