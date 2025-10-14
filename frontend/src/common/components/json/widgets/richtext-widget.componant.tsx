'use client';
import type { WidgetProps } from '@rjsf/utils';
import dynamic from 'next/dynamic';
import * as React from 'react';
const TextEditor = dynamic(() => import('@sk-web-gui/text-editor'), { ssr: false });

export function TexteditorWidget({ value, onChange }: WidgetProps) {
  const ref = React.useRef<any>(null);
  const markupValue = typeof value === 'string' ? value : '';
  React.useEffect(() => {
    const root = ref.current?.root;
    if (root && typeof value === 'string' && root.innerHTML !== value) {
      root.innerHTML = value;
    }
  }, [value]);

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
